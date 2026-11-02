import { useEffect, useRef, useState } from 'react'
import * as api from '../lib/api'
import { formatDue, timeAgo } from '../lib/dates'
import { PRIORITIES, STATUSES, priorityName, statusName, type Activity, type Comment, type Priority, type Status, type Task } from '../lib/types'
import { useBoard } from '../state/board'
import { useToast } from '../state/toast'
import { Avatar, DueBadge, LabelChip, PriorityIcon, SWATCHES } from './bits'
import { IconCalendar, IconChat, IconClock, IconPlus, IconTag, IconTrash, IconUsers, IconX, StatusGlyph } from './icons'
import { PickList, Popover } from './Popover'

const pickColor = (n: number) => SWATCHES[n % SWATCHES.length]

export function TaskDrawer({ task, onClose }: { task: Task; onClose: () => void }) {
  const board = useBoard()
  const panel = useRef<HTMLElement>(null)
  const [tab, setTab] = useState<'comments' | 'activity'>('comments')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    panel.current?.focus()
  }, [task.id])

  const people = board.members.filter((m) => task.assignees.includes(m.id))
  const taskLabels = board.labels.filter((l) => task.labels.includes(l.id))

  return (
    <div className="drawer-wrap">
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" ref={panel} tabIndex={-1} aria-label="Task details" role="dialog" aria-modal="true">
        <header className="drawer__bar">
          <span className="drawer__crumb">
            <StatusGlyph status={task.status} /> {statusName(task.status)}
          </span>
          <span className="drawer__stamp">Created {timeAgo(task.created_at)}</span>
          <DeleteButton
            onConfirm={() => {
              board.deleteTask(task.id)
              onClose()
            }}
          />
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <IconX />
          </button>
        </header>

        <div className="drawer__body">
          <TitleField key={task.id + task.title} value={task.title} onSave={(title) => board.updateTask(task.id, { title })} />

          <dl className="props">
            <dt>Status</dt>
            <dd>
              <Popover
                trigger={(p) => (
                  <button className="prop-btn" {...p}>
                    <StatusGlyph status={task.status} /> {statusName(task.status)}
                  </button>
                )}
              >
                {(close) => (
                  <PickList
                    search={false}
                    options={STATUSES.map((s) => ({ id: s.id, label: s.name, icon: <StatusGlyph status={s.id} /> }))}
                    selected={[task.status]}
                    onPick={(id) => {
                      close()
                      if (id === task.status) return
                      // drop it at the bottom of its new column
                      const peers = board.tasks.filter((t) => t.status === id)
                      const position = peers.length ? Math.max(...peers.map((t) => t.position)) + 1024 : 1024
                      board.moveTask(task.id, id as Status, position)
                    }}
                  />
                )}
              </Popover>
            </dd>

            <dt>Priority</dt>
            <dd>
              <Popover
                trigger={(p) => (
                  <button className="prop-btn" {...p}>
                    <PriorityIcon priority={task.priority} /> {priorityName(task.priority)}
                  </button>
                )}
              >
                {(close) => (
                  <PickList
                    search={false}
                    options={PRIORITIES.map((p) => ({ id: p.id, label: p.name, icon: <PriorityIcon priority={p.id} /> }))}
                    selected={[task.priority]}
                    onPick={(id) => {
                      close()
                      if (id !== task.priority) board.updateTask(task.id, { priority: id as Priority })
                    }}
                  />
                )}
              </Popover>
            </dd>

            <dt>Due date</dt>
            <dd className="due-field">
              <label className="prop-btn prop-btn--date">
                {task.due_date ? <DueBadge due={task.due_date} status={task.status} /> : <><IconCalendar size={14} /> <span className="muted">No date</span></>}
                <input
                  type="date"
                  value={task.due_date ?? ''}
                  onChange={(e) => board.updateTask(task.id, { due_date: e.target.value || null })}
                  aria-label="Due date"
                />
              </label>
              {task.due_date && (
                <button className="icon-btn icon-btn--sm" onClick={() => board.updateTask(task.id, { due_date: null })} aria-label="Clear due date">
                  <IconX size={12} />
                </button>
              )}
            </dd>

            <dt>Assignees</dt>
            <dd>
              <Popover
                trigger={(p) => (
                  <button className="prop-btn prop-btn--wrap" {...p}>
                    {people.length ? (
                      people.map((m) => (
                        <span key={m.id} className="person">
                          <Avatar member={m} size={18} /> {m.name}
                        </span>
                      ))
                    ) : (
                      <>
                        <IconUsers size={14} /> <span className="muted">Unassigned</span>
                      </>
                    )}
                  </button>
                )}
              >
                {() => (
                  <PickList
                    multi
                    placeholder="Assign or add someone…"
                    empty="No team members yet"
                    options={board.members.map((m) => ({ id: m.id, label: m.name, icon: <Avatar member={m} size={18} /> }))}
                    selected={task.assignees}
                    onPick={(id) => board.toggleLink(task.id, 'assignees', id)}
                    onCreate={async (name) => {
                      const m = await board.addMember(name, pickColor(board.members.length))
                      if (m) board.toggleLink(task.id, 'assignees', m.id)
                    }}
                  />
                )}
              </Popover>
            </dd>

            <dt>Labels</dt>
            <dd>
              <div className="label-field">
                {taskLabels.map((l) => (
                  <LabelChip key={l.id} label={l} onRemove={() => board.toggleLink(task.id, 'labels', l.id)} />
                ))}
                <Popover
                  trigger={(p) => (
                    <button className={`prop-btn${taskLabels.length ? ' prop-btn--icon' : ''}`} {...p} aria-label="Edit labels">
                      {taskLabels.length ? <IconPlus size={13} /> : <><IconTag size={14} /> <span className="muted">Add label</span></>}
                    </button>
                  )}
                >
                  {() => (
                    <PickList
                      multi
                      placeholder="Find or create a label…"
                      empty="No labels yet"
                      options={board.labels.map((l) => ({ id: l.id, label: l.name, icon: <i className="dot" style={{ background: l.color }} /> }))}
                      selected={task.labels}
                      onPick={(id) => board.toggleLink(task.id, 'labels', id)}
                      onCreate={async (name) => {
                        const l = await board.addLabel(name, pickColor(board.labels.length + 3))
                        if (l) board.toggleLink(task.id, 'labels', l.id)
                      }}
                    />
                  )}
                </Popover>
              </div>
            </dd>
          </dl>

          <DescriptionField
            key={task.id}
            value={task.description ?? ''}
            onSave={(description) => board.updateTask(task.id, { description: description || null })}
          />

          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'comments'} className="tab" onClick={() => setTab('comments')}>
              <IconChat size={14} /> Comments {task.commentCount > 0 && <span className="tab__n">{task.commentCount}</span>}
            </button>
            <button role="tab" aria-selected={tab === 'activity'} className="tab" onClick={() => setTab('activity')}>
              <IconClock size={14} /> Activity
            </button>
          </div>

          {tab === 'comments' ? <Comments task={task} /> : <ActivityLog task={task} />}
        </div>
      </aside>
    </div>
  )
}

function TitleField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [text, setText] = useState(value)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = el.scrollHeight + 'px'
  }, [text])

  const commit = () => {
    const t = text.trim()
    if (!t) setText(value)
    else if (t !== value) onSave(t)
  }

  return (
    <textarea
      ref={ref}
      className="drawer__title"
      value={text}
      rows={1}
      maxLength={200}
      aria-label="Title"
      onChange={(e) => setText(e.target.value.replace(/\n/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          ref.current?.blur()
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          setText(value)
          ref.current?.blur()
        }
      }}
    />
  )
}

function DescriptionField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [text, setText] = useState(value)
  const [editing, setEditing] = useState(false)

  if (!editing) {
    return (
      <button className={`desc${value ? '' : ' desc--empty'}`} onClick={() => setEditing(true)}>
        {value || 'Add a description…'}
      </button>
    )
  }

  const done = () => {
    setEditing(false)
    if (text.trim() !== value) onSave(text.trim())
  }

  return (
    <div className="desc-edit">
      <textarea
        autoFocus
        value={text}
        rows={5}
        maxLength={5000}
        placeholder="Add more detail, links, acceptance criteria…"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) done()
          if (e.key === 'Escape') {
            e.preventDefault()
            setText(value)
            setEditing(false)
          }
        }}
      />
      <div className="desc-edit__row">
        <span className="hint">⌘/Ctrl + Enter to save</span>
        <button className="btn btn--ghost btn--sm" onClick={() => { setText(value); setEditing(false) }}>
          Cancel
        </button>
        <button className="btn btn--primary btn--sm" onClick={done}>
          Save
        </button>
      </div>
    </div>
  )
}

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])

  return (
    <button
      className={`icon-btn delete-btn${armed ? ' is-armed' : ''}`}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      aria-label={armed ? 'Click again to delete' : 'Delete task'}
      title={armed ? 'Click again to delete' : 'Delete task'}
    >
      <IconTrash />
      {armed && <span>Delete?</span>}
    </button>
  )
}

function Comments({ task }: { task: Task }) {
  const { bumpComments } = useBoard()
  const toast = useToast()
  const [items, setItems] = useState<Comment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const load = () => {
    setError(null)
    api.listComments(task.id).then(setItems, (e) => setError(e.message))
  }
  useEffect(load, [task.id])

  const send = async () => {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    try {
      const c = await api.addComment(task.id, body)
      setItems((xs) => [...(xs ?? []), c])
      bumpComments(task.id, 1)
      setText('')
    } catch (e) {
      toast(`Comment not posted: ${(e as Error).message}`, 'error')
    } finally {
      setSending(false)
    }
  }

  const remove = async (c: Comment) => {
    setItems((xs) => xs?.filter((x) => x.id !== c.id) ?? null)
    bumpComments(task.id, -1)
    try {
      await api.deleteComment(c.id)
    } catch (e) {
      setItems((xs) => [...(xs ?? []), c].sort((a, b) => a.created_at.localeCompare(b.created_at)))
      bumpComments(task.id, 1)
      toast(`Couldn't delete comment: ${(e as Error).message}`, 'error')
    }
  }

  return (
    <div className="comments">
      {error ? (
        <InlineError text={error} onRetry={load} />
      ) : items === null ? (
        <div className="feed-skeleton">
          <span />
          <span />
        </div>
      ) : items.length === 0 ? (
        <p className="feed-empty">No comments yet. Start the conversation.</p>
      ) : (
        <ol className="comment-list">
          {items.map((c) => (
            <li key={c.id} className="comment">
              <span className="comment__avatar">You</span>
              <div className="comment__main">
                <div className="comment__head">
                  <b>You</b>
                  <time dateTime={c.created_at} title={new Date(c.created_at).toLocaleString()}>
                    {timeAgo(c.created_at)}
                  </time>
                  <button className="comment__del" onClick={() => remove(c)} aria-label="Delete comment">
                    <IconTrash size={13} />
                  </button>
                </div>
                <p className="comment__body">{c.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="composer">
        <textarea
          value={text}
          rows={2}
          maxLength={2000}
          placeholder="Leave a comment…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              send()
            }
          }}
        />
        <div className="composer__row">
          <span className="hint">⌘/Ctrl + Enter</span>
          <button className="btn btn--primary btn--sm" disabled={!text.trim() || sending} onClick={send}>
            {sending ? 'Posting…' : 'Comment'}
          </button>
        </div>
      </div>
    </div>
  )
}

function describe(a: Activity) {
  const m = a.meta
  switch (a.kind) {
    case 'created':
      return <>created this task in <b>{statusName(m.status as Status)}</b></>
    case 'status':
      return (
        <>
          moved it from <b>{statusName(m.from as Status)}</b> <span className="arrow">→</span> <b>{statusName(m.to as Status)}</b>
        </>
      )
    case 'title':
      return <>renamed it to <b>“{m.to}”</b></>
    case 'priority':
      return <>changed priority from <b>{priorityName(m.from as Priority)}</b> to <b>{priorityName(m.to as Priority)}</b></>
    case 'due_date':
      return m.to ? <>set the due date to <b>{formatDue(m.to)}</b></> : <>removed the due date</>
    case 'description':
      return <>updated the description</>
    case 'assignee_added':
      return <>assigned <b>{m.name}</b></>
    case 'assignee_removed':
      return <>unassigned <b>{m.name}</b></>
    case 'label_added':
      return <>added the <b>{m.name}</b> label</>
    case 'label_removed':
      return <>removed the <b>{m.name}</b> label</>
    default:
      return <>{a.kind.replace(/_/g, ' ')}</>
  }
}

function ActivityLog({ task }: { task: Task }) {
  const [items, setItems] = useState<Activity[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const linkKey = task.assignees.join() + '|' + task.labels.join()

  useEffect(() => {
    let live = true
    setError(null)
    // assignee/label toggles are optimistic, so give the insert (and the
    // trigger behind it) a moment to land before reading the log back
    const t = setTimeout(() => {
      api.listActivity(task.id).then(
        (rows) => live && setItems(rows),
        (e) => live && setError(e.message),
      )
    }, 400)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [task.id, task.updated_at, linkKey, attempt])

  if (error) return <InlineError text={error} onRetry={() => setAttempt((n) => n + 1)} />
  if (!items)
    return (
      <div className="feed-skeleton">
        <span />
        <span />
        <span />
      </div>
    )
  if (!items.length) return <p className="feed-empty">No activity yet.</p>

  return (
    <ol className="timeline">
      {items.map((a) => (
        <li key={a.id} className={`timeline__item timeline__item--${a.kind.split('_')[0]}`}>
          <span className="timeline__dot" />
          <p>
            <b>You</b> {describe(a)}
            <time dateTime={a.created_at} title={new Date(a.created_at).toLocaleString()}>
              {' · '}
              {timeAgo(a.created_at)}
            </time>
          </p>
        </li>
      ))}
    </ol>
  )
}

function InlineError({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div className="inline-error">
      <span>{text}</span>
      <button className="btn btn--ghost btn--sm" onClick={onRetry}>
        Retry
      </button>
    </div>
  )
}
