import type { ReactNode, SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 16, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M8 3.5v9M3.5 8h9" />
  </Svg>
)

export const IconX = (p: P) => (
  <Svg {...p}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </Svg>
)

export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="7" cy="7" r="4.25" />
    <path d="M10.2 10.2L13 13" />
  </Svg>
)

export const IconFilter = (p: P) => (
  <Svg {...p}>
    <path d="M2.75 4h10.5M4.75 8h6.5M6.75 12h2.5" />
  </Svg>
)

export const IconCalendar = (p: P) => (
  <Svg {...p}>
    <rect x="2.5" y="3.25" width="11" height="10.25" rx="2" />
    <path d="M2.5 6.5h11M5.5 2v2.5M10.5 2v2.5" />
  </Svg>
)

export const IconChat = (p: P) => (
  <Svg {...p}>
    <path d="M3 4.5A1.75 1.75 0 0 1 4.75 2.75h6.5A1.75 1.75 0 0 1 13 4.5v4.25a1.75 1.75 0 0 1-1.75 1.75H7.5L4.5 13v-2.5h0A1.5 1.5 0 0 1 3 9z" />
  </Svg>
)

export const IconTrash = (p: P) => (
  <Svg {...p}>
    <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 8.25c.05.7.6 1.25 1.3 1.25h3.4c.7 0 1.25-.55 1.3-1.25l.5-8.25" />
  </Svg>
)

export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 8.5l3 3 6-7" />
  </Svg>
)

export const IconChevron = (p: P) => (
  <Svg {...p}>
    <path d="M4.5 6.25L8 9.75l3.5-3.5" />
  </Svg>
)

export const IconSun = (p: P) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="2.75" />
    <path d="M8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.6 3.6l1 1M11.4 11.4l1 1M3.6 12.4l1-1M11.4 4.6l1-1" />
  </Svg>
)

export const IconMoon = (p: P) => (
  <Svg {...p}>
    <path d="M13 9.6A5.25 5.25 0 1 1 6.4 3a4.25 4.25 0 0 0 6.6 6.6z" />
  </Svg>
)

export const IconUsers = (p: P) => (
  <Svg {...p}>
    <circle cx="6" cy="5.75" r="2.25" />
    <path d="M2.25 13c.4-2.1 1.9-3.25 3.75-3.25S9.35 10.9 9.75 13" />
    <path d="M10.5 3.6a2.25 2.25 0 0 1 0 4.3M11.6 9.9c1.2.4 2 1.4 2.15 3.1" />
  </Svg>
)

export const IconTag = (p: P) => (
  <Svg {...p}>
    <path d="M2.75 3.75v3.6c0 .4.16.78.44 1.06l4.4 4.4a1.5 1.5 0 0 0 2.12 0l3-3a1.5 1.5 0 0 0 0-2.12l-4.4-4.4a1.5 1.5 0 0 0-1.06-.44h-3.6a.9.9 0 0 0-.9.9z" />
    <circle cx="5.6" cy="5.6" r=".9" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconMenu = (p: P) => (
  <Svg {...p}>
    <path d="M2.75 4.5h10.5M2.75 8h10.5M2.75 11.5h10.5" />
  </Svg>
)

export const IconAlert = (p: P) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="5.75" />
    <path d="M8 5v3.5" />
    <circle cx="8" cy="10.9" r=".75" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="5.75" />
    <path d="M8 5v3.25l2 1.25" />
  </Svg>
)

export const IconRefresh = (p: P) => (
  <Svg {...p}>
    <path d="M13 8a5 5 0 1 1-1.46-3.54M13 2.75v2.5h-2.5" />
  </Svg>
)

export const IconBoard = (p: P) => (
  <Svg {...p}>
    <rect x="2.25" y="2.75" width="3.5" height="10.5" rx="1" />
    <rect x="7.25" y="2.75" width="3.5" height="7" rx="1" />
    <rect x="12.25" y="2.75" width="1.5" height="4.5" rx=".75" />
  </Svg>
)

export const IconDots = (p: P) => (
  <Svg {...p}>
    <circle cx="3.75" cy="8" r=".9" fill="currentColor" stroke="none" />
    <circle cx="8" cy="8" r=".9" fill="currentColor" stroke="none" />
    <circle cx="12.25" cy="8" r=".9" fill="currentColor" stroke="none" />
  </Svg>
)

// status glyphs - a ring that fills up as work progresses
export function StatusGlyph({ status, size = 14 }: { status: string; size?: number }) {
  const r = 5
  const c = 2 * Math.PI * r
  const fill = { todo: 0, in_progress: 0.5, in_review: 0.75, done: 1 }[status] ?? 0
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" className={`status-glyph status-glyph--${status}`} aria-hidden="true">
      <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray={status === 'todo' ? '2.2 1.8' : undefined} />
      {status === 'done' ? (
        <>
          <circle cx="7" cy="7" r="6" fill="currentColor" />
          <path d="M4.4 7.2l1.8 1.8 3.4-3.8" fill="none" stroke="var(--surface)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : fill > 0 ? (
        <circle
          cx="7"
          cy="7"
          r={r / 2}
          fill="none"
          stroke="currentColor"
          strokeWidth={r}
          strokeDasharray={`${(c / 2) * fill} ${c}`}
          transform="rotate(-90 7 7)"
        />
      ) : null}
    </svg>
  )
}
