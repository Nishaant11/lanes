import { useState, type CSSProperties } from 'react'
import type { Filters } from '../lib/board'
import type { Task } from '../lib/types'
import { useBoard } from '../state/board'
import { Avatar, SWATCHES, Swatches } from './bits'
import { IconBoard, IconMoon, IconPlus, IconRefresh, IconSun, IconTrash, IconX } from './icons'

interface Props {
  tasks: Task[]
  filters: Filters
  setFilters: (f: Filters) => void
  theme: 'light' | 'dark'
  toggleTheme: () => void
  open: boolean
  onClose: () => void
}

export function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="logo">
      <rect x="1" y="1" width="20" height="20" rx="6" fill="currentColor" />
      <rect x="5.5" y="5.5" width="3" height="11" rx="1.5" fill="var(--logo-ink)" />
      <rect x="9.5" y="5.5" width="3" height="7.5" rx="1.5" fill="var(--logo-ink)" opacity=".75" />
      <rect x="13.5" y="5.5" width="3" height="4.5" rx="1.5" fill="var(--logo-ink)" opacity=".5" />
    </svg>
  )
}

export function Sidebar({ tasks, filters, setFilters, theme, toggleTheme, open, onClose }: Props) {
  const board = useBoard()
  const countBy = (field: 'assignees' | 'labels', id: string) => tasks.filter((t) => t[field].includes(id) && t.status !== 'done').length

  const toggleFilter = (field: 'assignees' | 'labels', id: string) => {
    const list = filters[field]
    setFilters({ ...filters, [field]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] })
  }

  return (
    <>
      <div className={`sidebar-scrim${open ? ' is-open' : ''}`} onClick={onClose} />
      <nav className={`sidebar${open ? ' is-open' : ''}`} aria-label="Workspace">
        <div className="sidebar__brand">
          <Logo />
          <span className="wordmark">Lanes</span>
          <button className="icon-btn sidebar__close" onClick={onClose} aria-label="Close menu">
            <IconX />
          </button>
        </div>

        <a className="nav-item is-current" href="#" onClick={(e) => e.preventDefault()}>
          <IconBoard /> My board
        </a>

        <SideSection
          title="Team"
          addLabel="Add teammate"
          onAdd={(name, color) => board.addMember(name, color)}
          placeholder="Name"
          defaultColor={SWATCHES[board.members.length % SWATCHES.length]}
        >
          {board.members.length === 0 && <p className="side-empty">Add people so you can assign work.</p>}
          {board.members.map((m) => (
            <SideRow
              key={m.id}
              active={filters.assignees.includes(m.id)}
              onClick={() => toggleFilter('assignees', m.id)}
              onDelete={() => board.removeMember(m.id)}
              deleteLabel={`Remove ${m.name}`}
              count={countBy('assignees', m.id)}
            >
              <Avatar member={m} size={20} />
              <span className="side-row__name">{m.name}</span>
            </SideRow>
          ))}
        </SideSection>

        <SideSection
          title="Labels"
          addLabel="New label"
          onAdd={(name, color) => board.addLabel(name, color)}
          placeholder="Label name"
          defaultColor={SWATCHES[(board.labels.length + 3) % SWATCHES.length]}
        >
          {board.labels.length === 0 && <p className="side-empty">Labels like Bug or Design help you slice the board.</p>}
          {board.labels.map((l) => (
            <SideRow
              key={l.id}
              active={filters.labels.includes(l.id)}
              onClick={() => toggleFilter('labels', l.id)}
              onDelete={() => board.removeLabel(l.id)}
              deleteLabel={`Delete label ${l.name}`}
              count={countBy('labels', l.id)}
            >
              <i className="label-swatch" style={{ '--chip': l.color } as CSSProperties} />
              <span className="side-row__name">{l.name}</span>
            </SideRow>
          ))}
        </SideSection>

        <div className="sidebar__foot">
          <button className="foot-btn" onClick={toggleTheme}>
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <div className="session">
            <span className="session__dot" />
            <span className="session__text">
              Guest session
              <code title={board.userId ?? ''}>{board.userId?.slice(0, 8)}</code>
            </span>
            <button
              className="icon-btn icon-btn--sm"
              title="Start a fresh guest session (your current board stays with the old session)"
              aria-label="Start a new guest session"
              onClick={() => {
                if (confirm('Start a new guest session? You will get an empty board, and this one will no longer be reachable from this browser.')) {
                  board.newGuest()
                }
              }}
            >
              <IconRefresh size={14} />
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}

function SideSection({
  title,
  addLabel,
  onAdd,
  placeholder,
  defaultColor,
  children,
}: {
  title: string
  addLabel: string
  onAdd: (name: string, color: string) => Promise<unknown>
  placeholder: string
  defaultColor: string
  children: React.ReactNode
}) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(defaultColor)

  const close = () => {
    setAdding(false)
    setName('')
  }

  return (
    <section className="side-section">
      <header>
        <h3>{title}</h3>
        <button
          className="icon-btn icon-btn--sm"
          aria-label={addLabel}
          title={addLabel}
          onClick={() => {
            setColor(defaultColor)
            setAdding((a) => !a)
          }}
        >
          <IconPlus size={14} />
        </button>
      </header>
      {adding && (
        <form
          className="side-add"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!name.trim()) return
            await onAdd(name, color)
            close()
          }}
        >
          <input autoFocus value={name} maxLength={title === 'Labels' ? 32 : 60} placeholder={placeholder} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && close()} />
          <Swatches value={color} onChange={setColor} />
          <div className="side-add__row">
            <button type="button" className="btn btn--ghost btn--sm" onClick={close}>
              Cancel
            </button>
            <button className="btn btn--primary btn--sm" disabled={!name.trim()}>
              Add
            </button>
          </div>
        </form>
      )}
      <ul>{children}</ul>
    </section>
  )
}

function SideRow({
  active,
  onClick,
  onDelete,
  deleteLabel,
  count,
  children,
}: {
  active: boolean
  onClick: () => void
  onDelete: () => void
  deleteLabel: string
  count: number
  children: React.ReactNode
}) {
  return (
    <li className={`side-row${active ? ' is-active' : ''}`}>
      <button className="side-row__main" onClick={onClick} aria-pressed={active} title={active ? 'Remove filter' : 'Filter the board'}>
        {children}
        {count > 0 && <span className="side-row__count">{count}</span>}
      </button>
      <button
        className="side-row__del"
        aria-label={deleteLabel}
        title={deleteLabel}
        onClick={() => {
          if (confirm(`${deleteLabel}? It will be removed from every task.`)) onDelete()
        }}
      >
        <IconTrash size={13} />
      </button>
    </li>
  )
}
