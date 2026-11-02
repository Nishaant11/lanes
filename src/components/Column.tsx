import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Label, Member, Status, Task } from '../lib/types'
import { IconPlus, StatusGlyph } from './icons'
import { TaskCard } from './TaskCard'

const EMPTY_COPY: Record<Status, string> = {
  todo: 'Nothing queued up.',
  in_progress: 'Nobody’s on anything yet.',
  in_review: 'Nothing waiting on review.',
  done: 'Finished work lands here.',
}

interface Props {
  status: Status
  name: string
  ids: string[]
  taskById: Record<string, Task>
  members: Map<string, Member>
  labels: Map<string, Label>
  total: number // unfiltered count, so the header doesn't lie while filtering
  filtering: boolean
  onOpen: (id: string) => void
  onNew: (status: Status) => void
  onQuickAdd: (status: Status, title: string) => Promise<unknown>
}

export function Column({ status, name, ids, taskById, members, labels, total, filtering, onOpen, onNew, onQuickAdd }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { type: 'column' } })

  return (
    <section className={`col col--${status}${isOver ? ' is-over' : ''}`} aria-label={name}>
      <header className="col__head">
        <StatusGlyph status={status} />
        <h2 className="col__name">{name}</h2>
        <span className="col__count">{filtering && ids.length !== total ? `${ids.length}/${total}` : total}</span>
        <button className="icon-btn col__add" onClick={() => onNew(status)} aria-label={`New task in ${name}`} title="New task">
          <IconPlus />
        </button>
      </header>

      <SortableContext id={status} items={ids} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="col__list">
          {ids.map((id) => {
            const t = taskById[id]
            return t ? <TaskCard key={id} task={t} members={members} labels={labels} onOpen={onOpen} /> : null
          })}
          {ids.length === 0 && (
            <div className="col__empty">{filtering && total > 0 ? 'No matches in this column.' : EMPTY_COPY[status]}</div>
          )}
        </div>
      </SortableContext>

      <QuickAdd onSubmit={(title) => onQuickAdd(status, title)} />
    </section>
  )
}

function QuickAdd({ onSubmit }: { onSubmit: (title: string) => Promise<unknown> }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) {
    return (
      <button className="quick-add__btn" onClick={() => setOpen(true)}>
        <IconPlus size={14} /> Add task
      </button>
    )
  }

  const submit = async () => {
    const title = text.trim()
    if (!title || busy) return
    setBusy(true)
    await onSubmit(title)
    setBusy(false)
    setText('')
  }

  return (
    <div className="quick-add">
      <textarea
        autoFocus
        rows={2}
        value={text}
        maxLength={200}
        placeholder="What needs doing? (Enter to save)"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => !text.trim() && setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
          if (e.key === 'Escape') {
            setText('')
            setOpen(false)
          }
        }}
      />
      <div className="quick-add__row">
        <button className="btn btn--primary btn--sm" onClick={submit} disabled={!text.trim() || busy}>
          {busy ? 'Adding…' : 'Add'}
        </button>
        <button className="btn btn--ghost btn--sm" onMouseDown={(e) => e.preventDefault()} onClick={() => { setText(''); setOpen(false) }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
