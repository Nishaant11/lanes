import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { IconAlert, IconCheck, IconX } from '../components/icons'

type Tone = 'error' | 'success' | 'info'
interface Toast {
  id: number
  text: string
  tone: Tone
}

const ToastCtx = createContext<(text: string, tone?: Tone) => void>(() => {})

export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), [])

  const push = useCallback(
    (text: string, tone: Tone = 'info') => {
      const id = nextId.current++
      setToasts((ts) => [...ts.slice(-3), { id, text, tone }])
      setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3500)
    },
    [dismiss],
  )

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone}`}>
            {t.tone === 'error' ? <IconAlert /> : t.tone === 'success' ? <IconCheck /> : null}
            <span>{t.text}</span>
            <button className="toast__close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <IconX size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
