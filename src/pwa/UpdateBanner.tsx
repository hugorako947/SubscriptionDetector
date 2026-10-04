import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Registers the service worker and offers updates without forcing a reload
 * (registerType 'prompt'): the user decides when, so an analysis in progress
 * is never interrupted.
 */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error: unknown) {
      console.error("Le service worker n'a pas pu être enregistré", error)
    },
  })

  if (!needRefresh) return null

  return (
    <div
      role="status"
      className="safe-x safe-top fixed inset-x-0 top-0 z-20 border-b border-line bg-surface pb-3 shadow-[0_1px_0_var(--line)]"
    >
      <div className="mx-auto flex max-w-xl flex-wrap items-center gap-x-4 gap-y-2">
        <p className="mr-auto font-bold">Une nouvelle version est prête.</p>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="min-h-11 px-2 text-muted underline underline-offset-4"
        >
          Plus tard
        </button>
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="min-h-11 rounded-lg bg-accent px-4 font-bold text-on-accent"
        >
          Mettre à jour
        </button>
      </div>
    </div>
  )
}
