import { useState } from 'react'
import { STATUSES } from '../lib/types'
import { IconAlert, IconPlus, StatusGlyph } from './icons'
import { Logo } from './Sidebar'

export function BoardSkeleton() {
  const heights = [[64, 88, 52], [88, 64], [72], [52, 64]]
  return (
    <div className="board board--skeleton" aria-busy="true" aria-label="Loading your board">
      {STATUSES.map((s, i) => (
        <section key={s.id} className="col">
          <header className="col__head">
            <StatusGlyph status={s.id} />
            <h2 className="col__name">{s.name}</h2>
          </header>
          <div className="col__list">
            {heights[i].map((h, j) => (
              <div key={j} className="card card--skeleton" style={{ height: h, animationDelay: `${(i + j) * 90}ms` }} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export function EmptyBoard({ onNew, onSample }: { onNew: () => void; onSample: () => Promise<void> }) {
  const [loading, setLoading] = useState(false)
  return (
    <div className="empty-board">
      <div className="empty-board__art" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h2>A clean slate</h2>
      <p>
        Add your first task, or load a small sample board to see how labels, assignees and due dates look before you
        set up your own.
      </p>
      <div className="empty-board__actions">
        <button className="btn btn--primary" onClick={onNew}>
          <IconPlus /> Create a task
        </button>
        <button
          className="btn btn--outline"
          disabled={loading}
          onClick={async () => {
            setLoading(true)
            await onSample()
            setLoading(false)
          }}
        >
          {loading ? 'Loading sample…' : 'Load sample board'}
        </button>
      </div>
    </div>
  )
}

export function FullPageMessage({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="full-page">
      <div className="full-page__card">
        <Logo />
        <h1>{title}</h1>
        <div className="full-page__text">{children}</div>
        {action}
      </div>
    </div>
  )
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="load-error" role="alert">
      <IconAlert size={20} />
      <div>
        <b>We couldn’t load your board.</b>
        <p>{message}</p>
      </div>
      <button className="btn btn--outline" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}

export function NotConfigured() {
  return (
    <FullPageMessage title="Supabase isn’t connected yet">
      <p>
        Copy <code>.env.example</code> to <code>.env.local</code>, fill in your project URL and anon key, then restart{' '}
        <code>npm run dev</code>.
      </p>
      <p className="muted">On Vercel/Netlify, add the same two variables in the project settings and redeploy.</p>
    </FullPageMessage>
  )
}
