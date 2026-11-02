import { describe, expect, it } from 'vitest'
import { boardStats, emptyFilters, filterTasks, groupByStatus, positionBetween } from './board'
import { dueState, formatDue } from './dates'
import type { Task } from './types'

const today = '2026-11-10'

function task(over: Partial<Task>): Task {
  return {
    id: Math.random().toString(36).slice(2),
    user_id: 'u',
    title: 'Untitled',
    description: null,
    status: 'todo',
    priority: 'normal',
    due_date: null,
    position: 0,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    assignees: [],
    labels: [],
    commentCount: 0,
    ...over,
  }
}

describe('positionBetween', () => {
  it('handles empty columns and both edges', () => {
    expect(positionBetween()).toBe(1024)
    expect(positionBetween(undefined, 1024)).toBe(0)
    expect(positionBetween(1024)).toBe(2048)
    expect(positionBetween(1024, 2048)).toBe(1536)
  })

  it('keeps order after many inserts into the same gap', () => {
    let lo = 0
    const hi = 1024
    for (let i = 0; i < 40; i++) {
      const mid = positionBetween(lo, hi)
      expect(mid).toBeGreaterThan(lo)
      expect(mid).toBeLessThan(hi)
      lo = mid
    }
  })
})

describe('groupByStatus', () => {
  it('sorts each column by position', () => {
    const a = task({ id: 'a', position: 3000 })
    const b = task({ id: 'b', position: 1000 })
    const c = task({ id: 'c', status: 'done', position: 5 })
    expect(groupByStatus([a, b, c])).toEqual({ todo: ['b', 'a'], in_progress: [], in_review: [], done: ['c'] })
  })
})

describe('filterTasks', () => {
  const tasks = [
    task({ id: '1', title: 'Fix login redirect', priority: 'high', labels: ['bug'], assignees: ['m1'] }),
    task({ id: '2', title: 'Write onboarding copy', due_date: '2026-11-08' }),
    task({ id: '3', title: 'Ship dark mode', due_date: '2026-11-12', labels: ['feat'] }),
    task({ id: '4', title: 'Old thing', due_date: '2026-11-01', status: 'done' }),
  ]
  const ids = (f: Partial<typeof emptyFilters>) =>
    filterTasks(tasks, { ...emptyFilters, ...f }, today).map((t) => t.id)

  it('searches titles case-insensitively', () => {
    expect(ids({ query: 'LOGIN' })).toEqual(['1'])
  })

  it('combines filters with AND across groups, OR within a group', () => {
    expect(ids({ labels: ['bug', 'feat'] })).toEqual(['1', '3'])
    expect(ids({ labels: ['bug', 'feat'], priorities: ['high'] })).toEqual(['1'])
  })

  it('understands unassigned', () => {
    expect(ids({ assignees: ['unassigned'] })).toEqual(['2', '3', '4'])
  })

  it('ignores done tasks for overdue', () => {
    expect(ids({ due: ['overdue'] })).toEqual(['2'])
    expect(ids({ due: ['week'] })).toEqual(['3'])
  })
})

describe('dates', () => {
  it('classifies due dates', () => {
    expect(dueState('2026-11-09', today)).toBe('overdue')
    expect(dueState('2026-11-10', today)).toBe('today')
    expect(dueState('2026-11-12', today)).toBe('soon')
    expect(dueState('2026-11-20', today)).toBe('later')
    expect(dueState(null, today)).toBeNull()
  })

  it('formats nearby days in words', () => {
    expect(formatDue('2026-11-11', today)).toBe('Tomorrow')
    expect(formatDue('2026-11-09', today)).toBe('Yesterday')
  })
})

describe('boardStats', () => {
  it('counts done and overdue', () => {
    const s = boardStats(
      [
        task({ status: 'done' }),
        task({ due_date: '2026-11-01' }),
        task({ due_date: '2026-11-11' }),
        task({}),
      ],
      today,
    )
    expect(s).toMatchObject({ total: 4, done: 1, overdue: 1, dueSoon: 1, progress: 0.25 })
  })
})
