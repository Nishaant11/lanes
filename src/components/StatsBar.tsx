import { boardStats } from '../lib/board'
import type { Task } from '../lib/types'

function Ring({ value }: { value: number }) {
  const r = 9
  const c = 2 * Math.PI * r
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className="ring" aria-hidden="true">
      <circle cx="12" cy="12" r={r} className="ring__track" />
      <circle
        cx="12"
        cy="12"
        r={r}
        className="ring__fill"
        strokeDasharray={`${c * value} ${c}`}
        transform="rotate(-90 12 12)"
      />
    </svg>
  )
}

export function StatsBar({ tasks, onShowOverdue, onShowSoon }: { tasks: Task[]; onShowOverdue: () => void; onShowSoon: () => void }) {
  const s = boardStats(tasks)
  const pct = Math.round(s.progress * 100)

  return (
    <div className="stats" aria-label="Board summary">
      <div className="stat stat--progress">
        <Ring value={s.progress} />
        <div>
          <b>{pct}%</b>
          <span>
            {s.done} of {s.total} done
          </span>
        </div>
      </div>
      <div className="stat stat--open">
        <b>{s.total - s.done}</b>
        <span>open</span>
      </div>
      <button className={`stat stat--btn${s.overdue ? ' stat--alert' : ''}`} onClick={onShowOverdue} disabled={!s.overdue} title="Show overdue tasks">
        <b>{s.overdue}</b>
        <span>overdue</span>
      </button>
      <button className={`stat stat--btn${s.dueSoon ? ' stat--warn' : ''}`} onClick={onShowSoon} disabled={!s.dueSoon} title="Show tasks due in the next 7 days">
        <b>{s.dueSoon}</b>
        <span>due this week</span>
      </button>
    </div>
  )
}
