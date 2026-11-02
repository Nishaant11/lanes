import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import * as api from '../lib/api'
import { GAP } from '../lib/board'
import { supabase } from '../lib/supabase'
import type { Label, Member, NewTask, Status, Task, TaskPatch, TaskRow } from '../lib/types'
import { useToast } from './toast'

interface State {
  phase: 'loading' | 'ready' | 'error'
  error: string | null
  userId: string | null
  tasks: Record<string, Task>
  members: Member[]
  labels: Label[]
}

type Action =
  | { type: 'loading' }
  | { type: 'loaded'; userId: string; tasks: Task[]; members: Member[]; labels: Label[] }
  | { type: 'failed'; error: string }
  | { type: 'task'; task: Task }
  | { type: 'row'; row: TaskRow }
  | { type: 'patch'; id: string; patch: Partial<Task> }
  | { type: 'remove'; id: string }
  | { type: 'link'; id: string; field: 'assignees' | 'labels'; value: string; on: boolean }
  | { type: 'comments'; id: string; delta: number }
  | { type: 'member'; member: Member }
  | { type: 'member-gone'; id: string }
  | { type: 'label'; label: Label }
  | { type: 'label-gone'; id: string }

const initial: State = { phase: 'loading', error: null, userId: null, tasks: {}, members: [], labels: [] }

function stripEverywhere(tasks: Record<string, Task>, field: 'assignees' | 'labels', id: string) {
  const next: Record<string, Task> = {}
  for (const t of Object.values(tasks)) {
    next[t.id] = t[field].includes(id) ? { ...t, [field]: t[field].filter((x) => x !== id) } : t
  }
  return next
}

function reducer(state: State, a: Action): State {
  switch (a.type) {
    case 'loading':
      return { ...state, phase: 'loading', error: null }
    case 'loaded':
      return {
        phase: 'ready',
        error: null,
        userId: a.userId,
        tasks: Object.fromEntries(a.tasks.map((t) => [t.id, t])),
        members: a.members,
        labels: a.labels,
      }
    case 'failed':
      return { ...state, phase: 'error', error: a.error }
    case 'task':
      return { ...state, tasks: { ...state.tasks, [a.task.id]: a.task } }
    case 'row': {
      // realtime gives us bare rows; keep the links we already know about
      const prev = state.tasks[a.row.id]
      const task: Task = prev ? { ...prev, ...a.row } : { ...a.row, assignees: [], labels: [], commentCount: 0 }
      return { ...state, tasks: { ...state.tasks, [task.id]: task } }
    }
    case 'patch': {
      const t = state.tasks[a.id]
      if (!t) return state
      return { ...state, tasks: { ...state.tasks, [a.id]: { ...t, ...a.patch } } }
    }
    case 'remove': {
      if (!state.tasks[a.id]) return state
      const { [a.id]: _gone, ...rest } = state.tasks
      return { ...state, tasks: rest }
    }
    case 'link': {
      const t = state.tasks[a.id]
      if (!t) return state
      const list = t[a.field].filter((x) => x !== a.value)
      if (a.on) list.push(a.value)
      return { ...state, tasks: { ...state.tasks, [a.id]: { ...t, [a.field]: list } } }
    }
    case 'comments': {
      const t = state.tasks[a.id]
      if (!t) return state
      return { ...state, tasks: { ...state.tasks, [a.id]: { ...t, commentCount: Math.max(0, t.commentCount + a.delta) } } }
    }
    case 'member':
      return { ...state, members: [...state.members.filter((m) => m.id !== a.member.id), a.member] }
    case 'member-gone':
      return { ...state, members: state.members.filter((m) => m.id !== a.id), tasks: stripEverywhere(state.tasks, 'assignees', a.id) }
    case 'label':
      return { ...state, labels: [...state.labels.filter((l) => l.id !== a.label.id), a.label] }
    case 'label-gone':
      return { ...state, labels: state.labels.filter((l) => l.id !== a.id), tasks: stripEverywhere(state.tasks, 'labels', a.id) }
  }
}

function useBoardStore() {
  const [state, dispatch] = useReducer(reducer, initial)
  const toast = useToast()
  const stateRef = useRef(state)
  stateRef.current = state

  // ids with a write in flight. Realtime echoes for these are ignored so a
  // slow echo of move #1 can't snap a card back after move #2.
  const pending = useRef(new Map<string, number>())
  const hold = (id: string) => pending.current.set(id, (pending.current.get(id) ?? 0) + 1)
  const release = (id: string) => {
    const n = (pending.current.get(id) ?? 1) - 1
    if (n <= 0) pending.current.delete(id)
    else pending.current.set(id, n)
  }

  const fail = useCallback(
    (what: string, err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(what, err)
      toast(`${what}: ${msg}`, 'error')
    },
    [toast],
  )

  const load = useCallback(async () => {
    dispatch({ type: 'loading' })
    try {
      const user = await api.ensureGuest()
      const data = await api.loadBoard()
      dispatch({ type: 'loaded', userId: user.id, ...data })
    } catch (err) {
      dispatch({ type: 'failed', error: err instanceof Error ? err.message : 'Something went wrong' })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!state.userId) return
    const channel = supabase
      .channel(`tasks:${state.userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${state.userId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id?: string }).id
            if (id) dispatch({ type: 'remove', id })
            return
          }
          const row = payload.new as TaskRow
          if (pending.current.has(row.id)) return
          if (payload.eventType === 'INSERT' && !stateRef.current.tasks[row.id]) {
            // created in another tab - fetch it with its links
            api.fetchTask(row.id).then((t) => t && dispatch({ type: 'task', task: t })).catch(() => {})
            return
          }
          dispatch({ type: 'row', row })
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [state.userId])

  const updateTask = useCallback(
    async (id: string, patch: TaskPatch) => {
      const before = stateRef.current.tasks[id]
      if (!before) return
      dispatch({ type: 'patch', id, patch })
      hold(id)
      try {
        const row = await api.updateTask(id, patch)
        dispatch({ type: 'row', row })
      } catch (err) {
        dispatch({ type: 'task', task: before })
        fail("Couldn't save that change", err)
      } finally {
        release(id)
      }
    },
    [fail],
  )

  const moveTask = useCallback(
    (id: string, status: Status, position: number) => updateTask(id, { status, position }),
    [updateTask],
  )

  const createTask = useCallback(
    async (input: NewTask, where: 'top' | 'bottom' = 'top') => {
      const column = Object.values(stateRef.current.tasks).filter((t) => t.status === input.status)
      const positions = column.map((t) => t.position)
      const position = !positions.length
        ? GAP
        : where === 'top'
          ? Math.min(...positions) - GAP
          : Math.max(...positions) + GAP

      try {
        const task = await api.createTask(input, position)
        dispatch({ type: 'task', task })
        return task
      } catch (err) {
        const partial = (err as { task?: Task }).task
        if (partial) dispatch({ type: 'task', task: partial })
        fail("Couldn't create the task", err)
        return partial ?? null
      }
    },
    [fail],
  )

  const deleteTask = useCallback(
    async (id: string) => {
      const before = stateRef.current.tasks[id]
      dispatch({ type: 'remove', id })
      try {
        await api.deleteTask(id)
      } catch (err) {
        if (before) dispatch({ type: 'task', task: before })
        fail("Couldn't delete the task", err)
      }
    },
    [fail],
  )

  const toggleLink = useCallback(
    async (id: string, field: 'assignees' | 'labels', value: string) => {
      const task = stateRef.current.tasks[id]
      if (!task) return
      const on = !task[field].includes(value)
      dispatch({ type: 'link', id, field, value, on })
      try {
        if (field === 'assignees') await api.setAssignee(id, value, on)
        else await api.setLabel(id, value, on)
      } catch (err) {
        dispatch({ type: 'link', id, field, value, on: !on })
        fail(field === 'assignees' ? "Couldn't update assignees" : "Couldn't update labels", err)
      }
    },
    [fail],
  )

  const addMember = useCallback(
    async (name: string, color: string) => {
      try {
        const m = await api.createMember(name, color)
        dispatch({ type: 'member', member: m })
        return m
      } catch (err) {
        fail("Couldn't add that person", err)
        return null
      }
    },
    [fail],
  )

  const removeMember = useCallback(
    async (id: string) => {
      try {
        await api.deleteMember(id)
        dispatch({ type: 'member-gone', id })
      } catch (err) {
        fail("Couldn't remove that person", err)
      }
    },
    [fail],
  )

  const addLabel = useCallback(
    async (name: string, color: string) => {
      try {
        const l = await api.createLabel(name, color)
        dispatch({ type: 'label', label: l })
        return l
      } catch (err) {
        fail("Couldn't create the label", err)
        return null
      }
    },
    [fail],
  )

  const removeLabel = useCallback(
    async (id: string) => {
      try {
        await api.deleteLabel(id)
        dispatch({ type: 'label-gone', id })
      } catch (err) {
        fail("Couldn't delete the label", err)
      }
    },
    [fail],
  )

  const bumpComments = useCallback((id: string, delta: number) => dispatch({ type: 'comments', id, delta }), [])

  const loadSample = useCallback(async () => {
    try {
      await api.seedSampleBoard()
      const data = await api.loadBoard()
      dispatch({ type: 'loaded', userId: stateRef.current.userId!, ...data })
    } catch (err) {
      fail("Couldn't load the sample board", err)
    }
  }, [fail])

  const newGuest = useCallback(async () => {
    dispatch({ type: 'loading' })
    try {
      await api.startNewGuest()
    } catch (err) {
      fail("Couldn't start a new session", err)
    }
    await load()
  }, [fail, load])

  const tasks = useMemo(() => Object.values(state.tasks), [state.tasks])

  return {
    ...state,
    tasks,
    taskById: state.tasks,
    reload: load,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    toggleLink,
    addMember,
    removeMember,
    addLabel,
    removeLabel,
    bumpComments,
    loadSample,
    newGuest,
  }
}

export type BoardStore = ReturnType<typeof useBoardStore>

const BoardCtx = createContext<BoardStore | null>(null)

export function BoardProvider({ children }: { children: ReactNode }) {
  const store = useBoardStore()
  return <BoardCtx.Provider value={store}>{children}</BoardCtx.Provider>
}

export function useBoard() {
  const ctx = useContext(BoardCtx)
  if (!ctx) throw new Error('useBoard must be used inside <BoardProvider>')
  return ctx
}
