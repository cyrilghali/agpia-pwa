import { useEffect, useRef, useCallback } from 'react'

// ---- Throttle utility ----

/** Returns a throttled version of `fn` that fires at most once every `ms` milliseconds. */
export function useThrottledCallback(
  fn: () => void,
  ms: number,
  deps: React.DependencyList
): () => void {
  const lastCall = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(() => {
    const now = Date.now()
    const remaining = ms - (now - lastCall.current)

    if (remaining <= 0) {
      lastCall.current = now
      fn()
    } else if (!timer.current) {
      timer.current = setTimeout(() => {
        lastCall.current = Date.now()
        timer.current = null
        fn()
      }, remaining)
    }
  }, deps)
}

// ---- Focus trap hook ----

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

/**
 * Traps keyboard focus inside a container while `open` is true.
 * Also locks body scroll and returns focus to the previously focused element on close.
 */
export function useFocusTrap(open: boolean, containerRef: React.RefObject<HTMLElement | null>) {
  const previousFocus = useRef<HTMLElement | null>(null)

  // Lock body scroll
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Focus first element on open, restore on close
  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement | null
      // Delay to allow open animation to start
      const timer = setTimeout(() => {
        const container = containerRef.current
        if (!container) return
        const first = container.querySelector<HTMLElement>(FOCUSABLE)
        first?.focus()
      }, 100)
      return () => clearTimeout(timer)
    } else {
      previousFocus.current?.focus()
      previousFocus.current = null
    }
  }, [open, containerRef])

  // Trap Tab / Shift+Tab
  useEffect(() => {
    if (!open) return
    const container = containerRef.current
    if (!container) return

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusable.length === 0) { e.preventDefault(); return }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, containerRef])
}
