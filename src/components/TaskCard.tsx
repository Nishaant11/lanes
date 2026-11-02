import { memo, type CSSProperties } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Label, Member, Task } from '../lib/types'
import { AvatarStack, DueBadge, LabelChip, PriorityIcon } from './bits'
import { IconChat } from './icons'

interface CardProps {
  task: Task
  members: Map<string, Member>
  labels: Map<string, Label>
}

export function CardBody({ task, members, labels }: CardProps) {
  const taskLabels = task.labels.map((id) => labels.get(id)).filter(Boolean) as Label[]
  const people = task.assignees.map((id) => members.get(id)).filter(Boolean) as Member[]
  const hasMeta = task.priority !== 'normal' || task.due_date || task.commentCount > 0 || people.length > 0

  return (
    <>
      {taskLabels.length > 0 && (
        <div className="card__labels">
          {taskLabels.slice(0, 3).map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
          {taskLabels.length > 3 && <span className="chip chip--more">+{taskLabels.length - 3}</span>}
        </div>
      )}
      <p className="card__title">{task.title}</p>
      {hasMeta && (
        <div className="card__meta">
          {task.priority !== 'normal' && <PriorityIcon priority={task.priority} />}
          {task.due_date && <DueBadge due={task.due_date} status={task.status} />}
          {task.commentCount > 0 && (
            <span className="card__count" title={`${task.commentCount} comment${task.commentCount === 1 ? '' : 's'}`}>
              <IconChat size={13} />
              {task.commentCount}
            </span>
          )}
          <span className="card__spacer" />
          <AvatarStack members={people} size={20} />
        </div>
      )}
    </>
  )
}

function TaskCardInner({ onOpen, ...props }: CardProps & { onOpen: (id: string) => void }) {
  const { task } = props
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', status: task.status },
  })

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`card${isDragging ? ' card--ghost' : ''}${task.status === 'done' ? ' card--done' : ''}`}
      {...attributes}
      {...listeners}
      aria-roledescription="Draggable task"
      aria-label={task.title}
      onClick={() => onOpen(task.id)}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e)
        if (e.key === 'Enter' && !isDragging && !e.defaultPrevented) onOpen(task.id)
      }}
    >
      <CardBody {...props} />
    </article>
  )
}

export const TaskCard = memo(TaskCardInner)
