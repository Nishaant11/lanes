import { supabase } from './supabase'
import type { Activity, Comment, Label, Member, NewTask, Task, TaskPatch, TaskRow } from './types'
import { addDays, toISODate } from './dates'

const TASK_SELECT = '*, task_assignees(member_id), task_labels(label_id), comments(count)'

type TaskJoined = TaskRow & {
  task_assignees: { member_id: string }[]
  task_labels: { label_id: string }[]
  comments: { count: number }[]
}

function toTask(row: TaskJoined): Task {
  const { task_assignees, task_labels, comments, ...rest } = row
  return {
    ...rest,
    assignees: task_assignees?.map((a) => a.member_id) ?? [],
    labels: task_labels?.map((l) => l.label_id) ?? [],
    commentCount: comments?.[0]?.count ?? 0,
  }
}

// supabase-js returns { data, error } - flatten that into throw/return so
// callers can just try/catch
function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export async function ensureGuest() {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session.user

  const { data: created, error } = await supabase.auth.signInAnonymously()
  if (error) {
    if (/anonymous/i.test(error.message)) {
      throw new Error('Anonymous sign-ins are disabled for this Supabase project. Turn them on under Authentication → Sign In / Providers.')
    }
    throw new Error(error.message)
  }
  return created.user!
}

export async function startNewGuest() {
  await supabase.auth.signOut()
  return ensureGuest()
}

export async function loadBoard() {
  const [tasks, members, labels] = await Promise.all([
    supabase.from('tasks').select(TASK_SELECT).order('position'),
    supabase.from('members').select('id, name, color').order('created_at'),
    supabase.from('labels').select('id, name, color').order('created_at'),
  ])
  return {
    tasks: unwrap(tasks as { data: TaskJoined[] | null; error: null }).map(toTask),
    members: unwrap(members) as Member[],
    labels: unwrap(labels) as Label[],
  }
}

export async function fetchTask(id: string) {
  const res = await supabase.from('tasks').select(TASK_SELECT).eq('id', id).maybeSingle()
  const row = unwrap(res as { data: TaskJoined | null; error: null })
  return row ? toTask(row) : null
}

export async function createTask(input: NewTask, position: number): Promise<Task> {
  const row = unwrap(
    await supabase
      .from('tasks')
      .insert({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        status: input.status,
        priority: input.priority,
        due_date: input.due_date,
        position,
      })
      .select()
      .single(),
  ) as TaskRow

  // links go in after the task exists; if they fail the task is still there,
  // so report it rather than pretend the whole create failed
  const links = await Promise.all([
    input.assignees.length
      ? supabase.from('task_assignees').insert(input.assignees.map((member_id) => ({ task_id: row.id, member_id })))
      : null,
    input.labels.length
      ? supabase.from('task_labels').insert(input.labels.map((label_id) => ({ task_id: row.id, label_id })))
      : null,
  ])
  const linkError = links.find((r) => r?.error)?.error

  const task: Task = { ...row, assignees: input.assignees, labels: input.labels, commentCount: 0 }
  if (linkError) {
    task.assignees = []
    task.labels = []
    throw Object.assign(new Error(`Task saved, but assignees/labels didn't: ${linkError.message}`), { task })
  }
  return task
}

export async function updateTask(id: string, patch: TaskPatch) {
  return unwrap(await supabase.from('tasks').update(patch).eq('id', id).select().single()) as TaskRow
}

export async function deleteTask(id: string) {
  unwrap(await supabase.from('tasks').delete().eq('id', id))
}

export async function setAssignee(taskId: string, memberId: string, on: boolean) {
  const q = supabase.from('task_assignees')
  unwrap(
    on
      ? await q.insert({ task_id: taskId, member_id: memberId })
      : await q.delete().match({ task_id: taskId, member_id: memberId }),
  )
}

export async function setLabel(taskId: string, labelId: string, on: boolean) {
  const q = supabase.from('task_labels')
  unwrap(
    on
      ? await q.insert({ task_id: taskId, label_id: labelId })
      : await q.delete().match({ task_id: taskId, label_id: labelId }),
  )
}

export async function createMember(name: string, color: string) {
  return unwrap(await supabase.from('members').insert({ name: name.trim(), color }).select('id, name, color').single()) as Member
}

export async function deleteMember(id: string) {
  unwrap(await supabase.from('members').delete().eq('id', id))
}

export async function createLabel(name: string, color: string) {
  const res = await supabase.from('labels').insert({ name: name.trim(), color }).select('id, name, color').single()
  if (res.error?.code === '23505') throw new Error(`You already have a "${name.trim()}" label`)
  return unwrap(res) as Label
}

export async function deleteLabel(id: string) {
  unwrap(await supabase.from('labels').delete().eq('id', id))
}

export async function listComments(taskId: string) {
  return unwrap(
    await supabase.from('comments').select('id, task_id, body, created_at').eq('task_id', taskId).order('created_at'),
  ) as Comment[]
}

export async function addComment(taskId: string, body: string) {
  return unwrap(
    await supabase.from('comments').insert({ task_id: taskId, body: body.trim() }).select('id, task_id, body, created_at').single(),
  ) as Comment
}

export async function deleteComment(id: string) {
  unwrap(await supabase.from('comments').delete().eq('id', id))
}

export async function listActivity(taskId: string) {
  return unwrap(
    await supabase
      .from('task_activity')
      .select('id, task_id, kind, meta, created_at')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(100),
  ) as Activity[]
}

// "Load sample board" on the empty state. Gives a reviewer something to drag
// around without typing ten tasks first.
export async function seedSampleBoard() {
  const members = unwrap(
    await supabase
      .from('members')
      .insert([
        { name: 'Maya Chen', color: '#d4643b' },
        { name: 'Jonas Weber', color: '#3a7ca5' },
        { name: 'Ana Ruiz', color: '#6b8f4e' },
      ])
      .select('id, name, color'),
  ) as Member[]

  const labels = unwrap(
    await supabase
      .from('labels')
      .insert([
        { name: 'Bug', color: '#d4483b' },
        { name: 'Feature', color: '#3d6fd9' },
        { name: 'Design', color: '#a05cc9' },
        { name: 'Infra', color: '#4a8a6f' },
      ])
      .select('id, name, color'),
  ) as Label[]

  const today = toISODate(new Date())
  const [maya, jonas, ana] = members.map((m) => m.id)
  const [bug, feature, design, infra] = labels.map((l) => l.id)

  const samples: (Omit<NewTask, 'description'> & { description?: string })[] = [
    { title: 'Audit color contrast on task cards', status: 'todo', priority: 'normal', due_date: addDays(today, 5), assignees: [ana], labels: [design] },
    { title: 'Rate-limit the public invite endpoint', status: 'todo', priority: 'high', due_date: addDays(today, 2), assignees: [jonas], labels: [infra] },
    { title: 'Keyboard shortcuts cheat sheet', status: 'todo', priority: 'low', due_date: null, assignees: [], labels: [feature] },
    { title: 'Drag preview flickers on Safari', status: 'in_progress', priority: 'high', due_date: addDays(today, -1), assignees: [maya], labels: [bug],
      description: 'Only happens when the column is scrolled. Repro: scroll To Do to the bottom, then drag the last card.' },
    { title: 'Empty state illustrations', status: 'in_progress', priority: 'normal', due_date: addDays(today, 3), assignees: [ana, maya], labels: [design] },
    { title: 'Weekly digest email', status: 'in_review', priority: 'normal', due_date: today, assignees: [jonas], labels: [feature] },
    { title: 'Move file uploads to signed URLs', status: 'done', priority: 'normal', due_date: addDays(today, -4), assignees: [jonas], labels: [infra] },
    { title: 'Fix timezone bug in due dates', status: 'done', priority: 'high', due_date: addDays(today, -2), assignees: [maya], labels: [bug] },
  ]

  let pos = 0
  for (const s of samples) {
    pos += 1024
    await createTask({ description: '', ...s }, pos)
  }
}
