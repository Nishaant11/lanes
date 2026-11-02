import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { activeFilterCount, emptyFilters, filterTasks, type Filters } from './lib/board'
import { isConfigured } from './lib/supabase'
import type { Status } from './lib/types'
import { BoardProvider, useBoard } from './state/board'
import { ToastProvider } from './state/toast'
import { Board } from './components/Board'
import { NewTaskDialog } from './components/NewTaskDialog'
import { Sidebar } from './components/Sidebar'
import { StatsBar } from './components/StatsBar'
import { BoardSkeleton, EmptyBoard, LoadError, NotConfigured } from './components/States'
import { TaskDrawer } from './components/TaskDrawer'
import { Toolbar } from './components/Toolbar'
import { IconMenu } from './components/icons'

type Theme = 'light' | 'dark'

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('lanes:theme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch {
      // storage blocked (private mode etc.) - fall through to the OS setting
    }
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('lanes:theme', theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))] as const
}

// the open task lives in the hash so a refresh (or a shared link in the same
// browser) brings the panel back
function useOpenTask() {
  const read = () => new URLSearchParams(location.hash.slice(1)).get('task')
  const [id, setId] = useState<string | null>(read)

  useEffect(() => {
    const onHash = () => setId(read())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const open = useCallback((next: string | null) => {
    setId(next)
    const url = next ? `#task=${next}` : location.pathname + location.search
    history.replaceState(null, '', url)
  }, [])

  return [id, open] as const
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

function Workspace() {
  const board = useBoard()
  const [theme, toggleTheme] = useTheme()
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [openId, setOpenId] = useOpenTask()
  const [creating, setCreating] = useState<Status | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const online = useOnline()

  const visible = useMemo(() => filterTasks(board.tasks, filters), [board.tasks, filters])
  const filtering = filters.query.trim() !== '' || activeFilterCount(filters) > 0
  const openTask = openId ? board.taskById[openId] : undefined

  // a stale #task= hash (deleted task, other session) shouldn't stick around
  useEffect(() => {
    if (board.phase === 'ready' && openId && !openTask) setOpenId(null)
  }, [board.phase, openId, openTask, setOpenId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return
      if (creating || board.phase !== 'ready') return
      if (e.key === 'c' || e.key === 'n') {
        e.preventDefault()
        setCreating('todo')
      } else if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [creating, board.phase])

  const closeDrawer = useCallback(() => setOpenId(null), [setOpenId])

  const quickAdd = useCallback(
    (status: Status, title: string) =>
      board.createTask({ title, status, priority: 'normal', due_date: null, assignees: [], labels: [] }, 'bottom'),
    [board.createTask],
  )

  let content: React.ReactNode
  if (board.phase === 'loading') content = <BoardSkeleton />
  else if (board.phase === 'error') content = <LoadError message={board.error ?? ''} onRetry={board.reload} />
  else if (board.tasks.length === 0) content = <EmptyBoard onNew={() => setCreating('todo')} onSample={board.loadSample} />
  else
    content = (
      <Board
        tasks={visible}
        allTasks={board.tasks}
        taskById={board.taskById}
        members={board.members}
        labels={board.labels}
        filtering={filtering}
        onMove={board.moveTask}
        onOpen={setOpenId}
        onNew={setCreating}
        onQuickAdd={quickAdd}
      />
    )

  return (
    <div className="app">
      <Sidebar
        tasks={board.tasks}
        filters={filters}
        setFilters={setFilters}
        theme={theme}
        toggleTheme={toggleTheme}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <main className="main">
        {!online && <div className="offline">You’re offline. Changes won’t save until you reconnect.</div>}

        <header className="topbar">
          <button className="icon-btn topbar__menu" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <IconMenu />
          </button>
          <div className="topbar__title">
            <h1>My board</h1>
            <p>Drag cards between lanes to update their status.</p>
          </div>
          {board.phase === 'ready' && board.tasks.length > 0 && (
            <StatsBar
              tasks={board.tasks}
              onShowOverdue={() => setFilters({ ...emptyFilters, due: ['overdue'] })}
              onShowSoon={() => setFilters({ ...emptyFilters, due: ['week'] })}
            />
          )}
        </header>

        {board.phase === 'ready' && board.tasks.length > 0 && (
          <Toolbar ref={searchRef} filters={filters} setFilters={setFilters} members={board.members} labels={board.labels} onNew={() => setCreating('todo')} />
        )}

        <div className="board-scroll">{content}</div>
      </main>

      {openTask && <TaskDrawer key={openTask.id} task={openTask} onClose={closeDrawer} />}
      {creating && <NewTaskDialog status={creating} onClose={() => setCreating(null)} onCreated={setOpenId} />}
    </div>
  )
}

export default function App() {
  if (!isConfigured) return <NotConfigured />
  return (
    <ToastProvider>
      <BoardProvider>
        <Workspace />
      </BoardProvider>
    </ToastProvider>
  )
}
