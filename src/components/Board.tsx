import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { groupByStatus, positionBetween, type Columns } from '../lib/board'
import { STATUSES, type Label, type Member, type Status, type Task } from '../lib/types'
import { CardBody } from './TaskCard'
import { Column } from './Column'

interface Props {
  tasks: Task[] // already filtered
  allTasks: Task[]
  taskById: Record<string, Task>
  members: Member[]
  labels: Label[]
  filtering: boolean
  onMove: (id: string, status: Status, position: number) => void
  onOpen: (id: string) => void
  onNew: (status: Status) => void
  onQuickAdd: (status: Status, title: string) => Promise<unknown>
}

const isStatus = (id: UniqueIdentifier): id is Status => STATUSES.some((s) => s.id === id)

export function Board({ tasks, allTasks, taskById, members, labels, filtering, onMove, onOpen, onNew, onQuickAdd }: Props) {
  const columns = useMemo(() => groupByStatus(tasks), [tasks])
  const totals = useMemo(() => {
    const c = { todo: 0, in_progress: 0, in_review: 0, done: 0 }
    for (const t of allTasks) c[t.status]++
    return c
  }, [allTasks])

  // while a drag is running we work on a local copy of the columns so cards
  // can hop between lists without touching the store until the drop
  const [drag, setDrag] = useState<{ id: string; layout: Columns } | null>(null)
  const layout = drag?.layout ?? columns

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const labelMap = useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  )

  const columnOf = (id: UniqueIdentifier, l: Columns): Status | undefined => {
    if (isStatus(id)) return id
    return STATUSES.find((s) => l[s.id].includes(String(id)))?.id
  }

  function onDragStart({ active }: DragStartEvent) {
    setDrag({ id: String(active.id), layout: columns })
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || !drag) return
    const from = columnOf(active.id, drag.layout)
    const to = columnOf(over.id, drag.layout)
    if (!from || !to || from === to) return

    setDrag((d) => {
      if (!d) return d
      const id = String(active.id)
      const target = d.layout[to].filter((x) => x !== id)
      const overIndex = target.indexOf(String(over.id))

      // dropping over a card: land below it if the pointer is past its middle
      let at = target.length
      if (overIndex >= 0) {
        const below =
          active.rect.current.translated && over.rect
            ? active.rect.current.translated.top > over.rect.top + over.rect.height / 2
            : false
        at = overIndex + (below ? 1 : 0)
      }
      target.splice(at, 0, id)
      return {
        ...d,
        layout: { ...d.layout, [from]: d.layout[from].filter((x) => x !== id), [to]: target },
      }
    })
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const current = drag
    setDrag(null)
    if (!current || !over) return

    const id = String(active.id)
    const status = columnOf(id, current.layout)
    if (!status) return

    let list = current.layout[status]
    const overIndex = list.indexOf(String(over.id))
    const fromIndex = list.indexOf(id)
    if (overIndex >= 0 && overIndex !== fromIndex) list = arrayMove(list, fromIndex, overIndex)

    const i = list.indexOf(id)
    const task = taskById[id]
    const before = taskById[list[i - 1]]?.position
    const after = taskById[list[i + 1]]?.position

    // nothing actually changed
    if (task.status === status && (before === undefined || before < task.position) && (after === undefined || task.position < after)) {
      return
    }
    onMove(id, status, positionBetween(before, after))
  }

  const active = drag ? taskById[drag.id] : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDrag(null)}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up ${taskById[active.id as string]?.title ?? 'task'}.`,
          onDragOver: ({ over }) => (over ? `Over ${STATUSES.find((s) => s.id === columnOf(over.id, layout))?.name ?? 'a column'}.` : ''),
          onDragEnd: ({ over }) => (over ? `Dropped in ${STATUSES.find((s) => s.id === columnOf(over.id, layout))?.name}.` : 'Dropped.'),
          onDragCancel: () => 'Move cancelled.',
        },
      }}
    >
      <div className={`board${drag ? ' is-dragging' : ''}`}>
        {STATUSES.map((s) => (
          <Column
            key={s.id}
            status={s.id}
            name={s.name}
            ids={layout[s.id]}
            taskById={taskById}
            members={memberMap}
            labels={labelMap}
            total={totals[s.id]}
            filtering={filtering}
            onOpen={onOpen}
            onNew={onNew}
            onQuickAdd={onQuickAdd}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.8,.3,1)' }}>
        {active ? (
          <article className="card card--overlay">
            <CardBody task={active} members={memberMap} labels={labelMap} />
          </article>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
