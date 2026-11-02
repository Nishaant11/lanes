export type Status = 'todo' | 'in_progress' | 'in_review' | 'done'
export type Priority = 'low' | 'normal' | 'high'

export const STATUSES: { id: Status; name: string }[] = [
  { id: 'todo', name: 'To Do' },
  { id: 'in_progress', name: 'In Progress' },
  { id: 'in_review', name: 'In Review' },
  { id: 'done', name: 'Done' },
]

export const PRIORITIES: { id: Priority; name: string }[] = [
  { id: 'high', name: 'High' },
  { id: 'normal', name: 'Normal' },
  { id: 'low', name: 'Low' },
]

export const statusName = (s: Status) => STATUSES.find((x) => x.id === s)?.name ?? s
export const priorityName = (p: Priority) => PRIORITIES.find((x) => x.id === p)?.name ?? p

// row as it lives in the tasks table
export interface TaskRow {
  id: string
  user_id: string
  title: string
  description: string | null
  status: Status
  priority: Priority
  due_date: string | null // yyyy-mm-dd
  position: number
  created_at: string
  updated_at: string
}

// what the UI works with: the row plus its links
export interface Task extends TaskRow {
  assignees: string[]
  labels: string[]
  commentCount: number
}

export interface Member {
  id: string
  name: string
  color: string
}

export interface Label {
  id: string
  name: string
  color: string
}

export interface Comment {
  id: string
  task_id: string
  body: string
  created_at: string
}

export interface Activity {
  id: number
  task_id: string
  kind: string
  meta: Record<string, string | null>
  created_at: string
}

export type TaskPatch = Partial<Pick<TaskRow, 'title' | 'description' | 'status' | 'priority' | 'due_date' | 'position'>>

export interface NewTask {
  title: string
  description?: string
  status: Status
  priority: Priority
  due_date: string | null
  assignees: string[]
  labels: string[]
}
