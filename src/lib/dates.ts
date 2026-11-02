// due_date is a plain date ("2026-11-04"), so everything here works on local
// calendar days and never goes through UTC - otherwise a task due "today"
// shows as overdue for anyone west of Greenwich in the evening.

const DAY = 86_400_000

export function toISODate(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function parseISODate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function daysBetween(from: string, to: string) {
  return Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / DAY)
}

export function addDays(iso: string, n: number) {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

export type DueState = 'overdue' | 'today' | 'soon' | 'later'

export function dueState(due: string | null, today = toISODate(new Date())): DueState | null {
  if (!due) return null
  const diff = daysBetween(today, due)
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  if (diff <= 2) return 'soon'
  return 'later'
}

const shortFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const longFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export function formatDue(due: string, today = toISODate(new Date())) {
  const diff = daysBetween(today, due)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  const d = parseISODate(due)
  return d.getFullYear() === parseISODate(today).getFullYear() ? shortFmt.format(d) : longFmt.format(d)
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

export function timeAgo(iso: string, now = Date.now()) {
  const secs = Math.round((new Date(iso).getTime() - now) / 1000)
  const abs = Math.abs(secs)
  if (abs < 45) return 'just now'
  if (abs < 3600) return rtf.format(Math.round(secs / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(secs / 3600), 'hour')
  if (abs < 86400 * 7) return rtf.format(Math.round(secs / 86400), 'day')
  return longFmt.format(new Date(iso))
}
