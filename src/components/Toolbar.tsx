import { forwardRef, type CSSProperties } from 'react'
import { activeFilterCount, type DueFilter, type Filters } from '../lib/board'
import { PRIORITIES, type Label, type Member, type Priority } from '../lib/types'
import { Avatar, Kbd, PriorityIcon } from './bits'
import { IconFilter, IconPlus, IconSearch, IconX } from './icons'
import { Popover } from './Popover'

interface Props {
  filters: Filters
  setFilters: (f: Filters) => void
  members: Member[]
  labels: Label[]
  onNew: () => void
}

const DUE_OPTIONS: { id: DueFilter; name: string }[] = [
  { id: 'overdue', name: 'Overdue' },
  { id: 'week', name: 'Due in the next 7 days' },
  { id: 'none', name: 'No due date' },
]

function toggled<T>(list: T[], v: T) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

export const Toolbar = forwardRef<HTMLInputElement, Props>(function Toolbar({ filters, setFilters, members, labels, onNew }, searchRef) {
  const count = activeFilterCount(filters)
  const memberById = new Map(members.map((m) => [m.id, m]))
  const labelById = new Map(labels.map((l) => [l.id, l]))

  const chips: { key: string; text: string; clear: () => void; color?: string }[] = [
    ...filters.priorities.map((p) => ({
      key: 'p' + p,
      text: `${PRIORITIES.find((x) => x.id === p)?.name} priority`,
      clear: () => setFilters({ ...filters, priorities: filters.priorities.filter((x) => x !== p) }),
    })),
    ...filters.assignees.map((id) => ({
      key: 'a' + id,
      text: id === 'unassigned' ? 'Unassigned' : memberById.get(id)?.name ?? 'Someone',
      color: memberById.get(id)?.color,
      clear: () => setFilters({ ...filters, assignees: filters.assignees.filter((x) => x !== id) }),
    })),
    ...filters.labels.map((id) => ({
      key: 'l' + id,
      text: labelById.get(id)?.name ?? 'Label',
      color: labelById.get(id)?.color,
      clear: () => setFilters({ ...filters, labels: filters.labels.filter((x) => x !== id) }),
    })),
    ...filters.due.map((d) => ({
      key: 'd' + d,
      text: DUE_OPTIONS.find((x) => x.id === d)!.name,
      clear: () => setFilters({ ...filters, due: filters.due.filter((x) => x !== d) }),
    })),
  ]

  return (
    <div className="toolbar">
      <label className="search">
        <IconSearch />
        <input
          ref={searchRef}
          type="search"
          placeholder="Search tasks"
          value={filters.query}
          onChange={(e) => setFilters({ ...filters, query: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setFilters({ ...filters, query: '' })
              e.currentTarget.blur()
            }
          }}
        />
        {filters.query ? (
          <button className="search__clear" onClick={() => setFilters({ ...filters, query: '' })} aria-label="Clear search">
            <IconX size={12} />
          </button>
        ) : (
          <Kbd>/</Kbd>
        )}
      </label>

      <Popover
        trigger={(p) => (
          <button className={`btn btn--outline${count ? ' is-active' : ''}`} {...p}>
            <IconFilter /> Filter {count > 0 && <span className="badge">{count}</span>}
          </button>
        )}
      >
        {() => (
          <div className="filter-menu">
            <FilterGroup title="Priority">
              {PRIORITIES.map((p) => (
                <Check
                  key={p.id}
                  on={filters.priorities.includes(p.id)}
                  onClick={() => setFilters({ ...filters, priorities: toggled<Priority>(filters.priorities, p.id) })}
                >
                  <PriorityIcon priority={p.id} /> {p.name}
                </Check>
              ))}
            </FilterGroup>

            <FilterGroup title="Assignee">
              <Check on={filters.assignees.includes('unassigned')} onClick={() => setFilters({ ...filters, assignees: toggled(filters.assignees, 'unassigned') })}>
                <span className="avatar avatar--empty" /> Unassigned
              </Check>
              {members.map((m) => (
                <Check key={m.id} on={filters.assignees.includes(m.id)} onClick={() => setFilters({ ...filters, assignees: toggled(filters.assignees, m.id) })}>
                  <Avatar member={m} size={18} /> {m.name}
                </Check>
              ))}
            </FilterGroup>

            <FilterGroup title="Label">
              {labels.length === 0 && <p className="filter-menu__none">No labels yet</p>}
              {labels.map((l) => (
                <Check key={l.id} on={filters.labels.includes(l.id)} onClick={() => setFilters({ ...filters, labels: toggled(filters.labels, l.id) })}>
                  <i className="dot" style={{ background: l.color }} /> {l.name}
                </Check>
              ))}
            </FilterGroup>

            <FilterGroup title="Due">
              {DUE_OPTIONS.map((d) => (
                <Check key={d.id} on={filters.due.includes(d.id)} onClick={() => setFilters({ ...filters, due: toggled(filters.due, d.id) })}>
                  {d.name}
                </Check>
              ))}
            </FilterGroup>

            {count > 0 && (
              <button className="filter-menu__reset" onClick={() => setFilters({ ...filters, priorities: [], assignees: [], labels: [], due: [] })}>
                Clear all filters
              </button>
            )}
          </div>
        )}
      </Popover>

      {chips.length > 0 && (
        <div className="active-filters">
          {chips.map((c) => (
            <span key={c.key} className="filter-chip" style={c.color ? ({ '--chip': c.color } as CSSProperties) : undefined}>
              {c.color && <i className="chip__dot" />}
              {c.text}
              <button onClick={c.clear} aria-label={`Remove filter ${c.text}`}>
                <IconX size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <span className="toolbar__spacer" />

      <button className="btn btn--primary toolbar__new" onClick={onNew} aria-label="New task">
        <IconPlus /> <span className="btn__label">New task</span> <Kbd>C</Kbd>
      </button>
    </div>
  )
})

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="filter-menu__group">
      <legend>{title}</legend>
      {children}
    </fieldset>
  )
}

function Check({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="menuitemcheckbox" aria-checked={on} className="filter-menu__item" onClick={onClick}>
      <span className={`check${on ? ' is-on' : ''}`}>
        {on && (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M2 5.2l2 2 4-4.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {children}
    </button>
  )
}
