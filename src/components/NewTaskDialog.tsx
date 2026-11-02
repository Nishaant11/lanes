import { useEffect, useRef, useState } from 'react'
import { PRIORITIES, STATUSES, priorityName, statusName, type NewTask, type Priority, type Status } from '../lib/types'
import { useBoard } from '../state/board'
import { Avatar, DueBadge, LabelChip, PriorityIcon, SWATCHES } from './bits'
import { IconCalendar, IconTag, IconUsers, IconX, StatusGlyph } from './icons'
import { PickList, Popover } from './Popover'

export function NewTaskDialog({ status, onClose, onCreated }: { status: Status; onClose: () => void; onCreated: (id: string) => void }) {
  const board = useBoard()
  const [draft, setDraft] = useState<NewTask>({
    title: '',
    description: '',
    status,
    priority: 'normal',
    due_date: null,
    assignees: [],
    labels: [],
  })
  const [saving, setSaving] = useState(false)
  const [openAfter, setOpenAfter] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof NewTask>(k: K, v: NewTask[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const toggle = (k: 'assignees' | 'labels', id: string) =>
    setDraft((d) => ({ ...d, [k]: d[k].includes(id) ? d[k].filter((x) => x !== id) : [...d[k], id] }))

  useEffect(() => {
    titleRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!draft.title.trim() || saving) return
    setSaving(true)
    const task = await board.createTask(draft)
    setSaving(false)
    if (!task) return
    onClose()
    if (openAfter) onCreated(task.id)
  }

  const people = board.members.filter((m) => draft.assignees.includes(m.id))
  const chosenLabels = board.labels.filter((l) => draft.labels.includes(l.id))

  return (
    <div className="modal-wrap">
      <div className="scrim" onClick={onClose} />
      <form className="modal" role="dialog" aria-modal="true" aria-label="New task" onSubmit={submit}>
        <header className="modal__head">
          <span className="modal__kicker">New task</span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconX />
          </button>
        </header>

        <input
          ref={titleRef}
          className="modal__title"
          placeholder="Task title"
          value={draft.title}
          maxLength={200}
          onChange={(e) => set('title', e.target.value)}
        />
        <textarea
          className="modal__desc"
          placeholder="Description (optional)"
          rows={3}
          maxLength={5000}
          value={draft.description}
          onChange={(e) => set('description', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
          }}
        />

        <div className="modal__props">
          <Popover
            trigger={(p) => (
              <button type="button" className="pill" {...p}>
                <StatusGlyph status={draft.status} /> {statusName(draft.status)}
              </button>
            )}
          >
            {(close) => (
              <PickList
                search={false}
                options={STATUSES.map((s) => ({ id: s.id, label: s.name, icon: <StatusGlyph status={s.id} /> }))}
                selected={[draft.status]}
                onPick={(id) => {
                  set('status', id as Status)
                  close()
                }}
              />
            )}
          </Popover>

          <Popover
            trigger={(p) => (
              <button type="button" className="pill" {...p}>
                <PriorityIcon priority={draft.priority} /> {priorityName(draft.priority)}
              </button>
            )}
          >
            {(close) => (
              <PickList
                search={false}
                options={PRIORITIES.map((p) => ({ id: p.id, label: p.name, icon: <PriorityIcon priority={p.id} /> }))}
                selected={[draft.priority]}
                onPick={(id) => {
                  set('priority', id as Priority)
                  close()
                }}
              />
            )}
          </Popover>

          <label className="pill pill--date">
            {draft.due_date ? <DueBadge due={draft.due_date} status={draft.status} compact /> : <><IconCalendar size={14} /> Due date</>}
            <input type="date" value={draft.due_date ?? ''} onChange={(e) => set('due_date', e.target.value || null)} aria-label="Due date" />
          </label>

          <Popover
            trigger={(p) => (
              <button type="button" className="pill" {...p}>
                {people.length ? (
                  <span className="avatar-stack">{people.map((m) => <Avatar key={m.id} member={m} size={18} />)}</span>
                ) : (
                  <IconUsers size={14} />
                )}
                {people.length === 1 ? people[0].name : people.length > 1 ? `${people.length} people` : 'Assignee'}
              </button>
            )}
          >
            {() => (
              <PickList
                multi
                placeholder="Assign or add someone…"
                empty="No team members yet"
                options={board.members.map((m) => ({ id: m.id, label: m.name, icon: <Avatar member={m} size={18} /> }))}
                selected={draft.assignees}
                onPick={(id) => toggle('assignees', id)}
                onCreate={async (name) => {
                  const m = await board.addMember(name, SWATCHES[board.members.length % SWATCHES.length])
                  if (m) toggle('assignees', m.id)
                }}
              />
            )}
          </Popover>

          <Popover
            trigger={(p) => (
              <button type="button" className="pill" {...p}>
                <IconTag size={14} /> {chosenLabels.length ? `${chosenLabels.length} label${chosenLabels.length > 1 ? 's' : ''}` : 'Labels'}
              </button>
            )}
          >
            {() => (
              <PickList
                multi
                placeholder="Find or create a label…"
                empty="No labels yet"
                options={board.labels.map((l) => ({ id: l.id, label: l.name, icon: <i className="dot" style={{ background: l.color }} /> }))}
                selected={draft.labels}
                onPick={(id) => toggle('labels', id)}
                onCreate={async (name) => {
                  const l = await board.addLabel(name, SWATCHES[(board.labels.length + 3) % SWATCHES.length])
                  if (l) toggle('labels', l.id)
                }}
              />
            )}
          </Popover>
        </div>

        {chosenLabels.length > 0 && (
          <div className="modal__chips">
            {chosenLabels.map((l) => (
              <LabelChip key={l.id} label={l} onRemove={() => toggle('labels', l.id)} />
            ))}
          </div>
        )}

        <footer className="modal__foot">
          <label className="toggle">
            <input type="checkbox" checked={openAfter} onChange={(e) => setOpenAfter(e.target.checked)} />
            <span>Open after creating</span>
          </label>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={!draft.title.trim() || saving}>
            {saving ? 'Creating…' : 'Create task'}
          </button>
        </footer>
      </form>
    </div>
  )
}
