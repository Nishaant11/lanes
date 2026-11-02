import type { CSSProperties } from 'react'
import { dueState, formatDue } from '../lib/dates'
import type { Label, Member, Priority, Status } from '../lib/types'
import { priorityName } from '../lib/types'
import { IconCalendar } from './icons'

export function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function Avatar({ member, size = 22 }: { member: Member; size?: number }) {
  return (
    <span
      className="avatar"
      style={{ '--av': member.color, width: size, height: size, fontSize: size * 0.42 } as CSSProperties}
      title={member.name}
    >
      {initials(member.name)}
    </span>
  )
}

export function AvatarStack({ members, max = 3, size = 22 }: { members: Member[]; max?: number; size?: number }) {
  if (!members.length) return null
  const shown = members.slice(0, max)
  const extra = members.length - shown.length
  return (
    <span className="avatar-stack" aria-label={members.map((m) => m.name).join(', ')}>
      {shown.map((m) => (
        <Avatar key={m.id} member={m} size={size} />
      ))}
      {extra > 0 && (
        <span className="avatar avatar--more" style={{ width: size, height: size }}>
          +{extra}
        </span>
      )}
    </span>
  )
}

// three bars, Linear-style. Low = 1, Normal = 2, High = 3.
export function PriorityIcon({ priority, size = 14 }: { priority: Priority; size?: number }) {
  const level = { low: 1, normal: 2, high: 3 }[priority]
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" className={`prio prio--${priority}`} role="img" aria-label={`${priorityName(priority)} priority`}>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={1.5 + i * 4} y={9 - i * 3} width="3" height={3.5 + i * 3} rx="1" opacity={i < level ? 1 : 0.22} fill="currentColor" />
      ))}
    </svg>
  )
}

export function DueBadge({ due, status, compact }: { due: string; status: Status; compact?: boolean }) {
  const state = status === 'done' ? 'done' : dueState(due)
  const label = formatDue(due)
  const hint = state === 'overdue' ? 'Overdue' : state === 'today' ? 'Due today' : state === 'soon' ? 'Due soon' : 'Due'
  return (
    <span className={`due due--${state}${compact ? ' due--compact' : ''}`} title={`${hint} · ${label}`}>
      <IconCalendar size={12} />
      {label}
    </span>
  )
}

export function LabelChip({ label, onRemove }: { label: Label; onRemove?: () => void }) {
  return (
    <span className="chip" style={{ '--chip': label.color } as CSSProperties}>
      <i className="chip__dot" />
      {label.name}
      {onRemove && (
        <button type="button" className="chip__x" onClick={onRemove} aria-label={`Remove ${label.name}`}>
          ×
        </button>
      )}
    </span>
  )
}

export function Kbd({ children }: { children: string }) {
  return <kbd className="kbd">{children}</kbd>
}

export const SWATCHES = ['#d4643b', '#d4483b', '#c9922e', '#6b8f4e', '#4a8a6f', '#3a7ca5', '#3d6fd9', '#6f5bd3', '#a05cc9', '#c2557f', '#7a756c']

export function Swatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="swatches" role="radiogroup" aria-label="Color">
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={c === value}
          className={`swatch${c === value ? ' is-on' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  )
}
