import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { IconCheck, IconPlus } from './icons'

interface TriggerProps {
  'aria-expanded': boolean
  'aria-controls': string
  onClick: () => void
}

export function Popover({
  trigger,
  children,
  align = 'start',
  className = '',
}: {
  trigger: (p: TriggerProps, open: boolean) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'start' | 'end'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  return (
    <div className={`pop ${className}`} ref={wrap}>
      {trigger({ 'aria-expanded': open, 'aria-controls': id, onClick: () => setOpen((o) => !o) }, open)}
      {open && (
        <div id={id} className={`pop__panel pop__panel--${align}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export interface PickOption {
  id: string
  label: string
  icon?: ReactNode
}

export function PickList({
  options,
  selected,
  onPick,
  multi = false,
  search = true,
  placeholder = 'Search…',
  empty = 'Nothing here yet',
  onCreate,
}: {
  options: PickOption[]
  selected: string[]
  onPick: (id: string) => void
  multi?: boolean
  search?: boolean
  placeholder?: string
  empty?: string
  onCreate?: (text: string) => void
}) {
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(0)
  const list = q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options
  const canCreate = !!onCreate && q.trim() !== '' && !options.some((o) => o.label.toLowerCase() === q.trim().toLowerCase())
  const total = list.length + (canCreate ? 1 : 0)

  const choose = (i: number) => {
    if (i < list.length) onPick(list[i].id)
    else if (canCreate) {
      onCreate!(q.trim())
      setQ('')
    }
  }

  return (
    <div
      className="picklist"
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setCursor((c) => (c + 1) % Math.max(total, 1))
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setCursor((c) => (c - 1 + total) % Math.max(total, 1))
        } else if (e.key === 'Enter' && total) {
          e.preventDefault()
          choose(Math.min(cursor, total - 1))
        }
      }}
    >
      {search && (
        <input
          autoFocus
          className="picklist__search"
          value={q}
          placeholder={placeholder}
          onChange={(e) => {
            setQ(e.target.value)
            setCursor(0)
          }}
        />
      )}
      <ul role="listbox" aria-multiselectable={multi}>
        {list.map((o, i) => {
          const on = selected.includes(o.id)
          return (
            <li key={o.id}>
              <button
                type="button"
                role="option"
                aria-selected={on}
                className={`picklist__item${i === cursor ? ' is-cursor' : ''}`}
                onMouseEnter={() => setCursor(i)}
                onClick={() => onPick(o.id)}
              >
                {multi && <span className={`check${on ? ' is-on' : ''}`}>{on && <IconCheck size={11} />}</span>}
                {o.icon}
                <span className="picklist__label">{o.label}</span>
                {!multi && on && <IconCheck size={14} className="picklist__tick" />}
              </button>
            </li>
          )
        })}
        {canCreate && (
          <li>
            <button
              type="button"
              className={`picklist__item picklist__create${cursor === list.length ? ' is-cursor' : ''}`}
              onMouseEnter={() => setCursor(list.length)}
              onClick={() => choose(list.length)}
            >
              <IconPlus size={14} />
              <span>
                Create <b>{q.trim()}</b>
              </span>
            </button>
          </li>
        )}
        {!total && <li className="picklist__empty">{q ? 'No matches' : empty}</li>}
      </ul>
    </div>
  )
}
