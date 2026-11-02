import { addDays, dueState, toISODate } from './dates'
import type { Priority, Status, Task } from './types'

export const GAP = 1024

// Cards are ordered by a float `position`. Dropping between two cards takes the
// midpoint, so a move is always a single-row update.
export function positionBetween(before?: number, after?: number) {
  if (before === undefined && after === undefined) return GAP
  if (before === undefined) return after! - GAP
  if (after === undefined) return before + GAP
  return (before + after) / 2
}

export function byPosition(a: Task, b: Task) {
  return a.position - b.position || a.created_at.localeCompare(b.created_at)
}

export type Columns = Record<Status, string[]>

export function groupByStatus(tasks: Task[]): Columns {
  const cols: Columns = { todo: [], in_progress: [], in_review: [], done: [] }
  for (const t of [...tasks].sort(byPosition)) cols[t.status].push(t.id)
  return cols
}

export type DueFilter = 'overdue' | 'week' | 'none'

export interface Filters {
  query: string
  priorities: Priority[]
  assignees: string[] // member ids, or 'unassigned'
  labels: string[]
  due: DueFilter[]
}

export const emptyFilters: Filters = { query: '', priorities: [], assignees: [], labels: [], due: [] }

export function activeFilterCount(f: Filters) {
  return f.priorities.length + f.assignees.length + f.labels.length + f.due.length
}

function matchesDue(t: Task, due: DueFilter[], today: string) {
  if (!due.length) return true
  return due.some((d) => {
    if (d === 'none') return !t.due_date
    if (!t.due_date || t.status === 'done') return false
    if (d === 'overdue') return dueState(t.due_date, today) === 'overdue'
    return t.due_date >= today && t.due_date <= addDays(today, 7)
  })
}

export function filterTasks(tasks: Task[], f: Filters, today = toISODate(new Date())) {
  const q = f.query.trim().toLowerCase()
  return tasks.filter((t) => {
    if (q && !t.title.toLowerCase().includes(q)) return false
    if (f.priorities.length && !f.priorities.includes(t.priority)) return false
    if (f.labels.length && !f.labels.some((id) => t.labels.includes(id))) return false
    if (f.assignees.length) {
      const hit = f.assignees.some((id) =>
        id === 'unassigned' ? t.assignees.length === 0 : t.assignees.includes(id),
      )
      if (!hit) return false
    }
    return matchesDue(t, f.due, today)
  })
}

export function boardStats(tasks: Task[], today = toISODate(new Date())) {
  let done = 0
  let overdue = 0
  let dueSoon = 0
  for (const t of tasks) {
    if (t.status === 'done') {
      done++
      continue
    }
    if (!t.due_date) continue
    if (t.due_date < today) overdue++
    else if (t.due_date <= addDays(today, 7)) dueSoon++
  }
  return {
    total: tasks.length,
    done,
    overdue,
    dueSoon,
    progress: tasks.length ? done / tasks.length : 0,
  }
}
