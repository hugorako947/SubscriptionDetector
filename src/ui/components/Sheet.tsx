import { useEffect, useId, useRef, type ReactNode } from 'react'

/**
 * Bottom sheet built on the native <dialog>: focus is trapped, Escape closes,
 * the page behind is inert. Rendered only while open.
 */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) ref.current.close() // tap on the backdrop
      }}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-2xl bg-surface p-0 text-ink backdrop:bg-black/50 sm:mx-auto sm:mb-auto sm:max-w-lg sm:rounded-2xl"
    >
      <div className="safe-x safe-bottom pt-2">
        <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line sm:hidden" />
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="pt-1 text-xl leading-tight font-bold">
            {title}
          </h2>
          <button type="button" onClick={() => ref.current?.close()} className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted" aria-label="Fermer">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="mt-3 pb-4">{children}</div>
      </div>
    </dialog>
  )
}
