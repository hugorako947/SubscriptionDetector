import { useSyncExternalStore } from 'react'
import { resolveRoute, type RouteId } from './routes'

const NAVIGATE_EVENT = 'app:navigate'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange)
  window.addEventListener(NAVIGATE_EVENT, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(NAVIGATE_EVENT, onChange)
  }
}

const getPath = () => window.location.pathname

export function useRoute(): RouteId {
  const path = useSyncExternalStore(subscribe, getPath, () => '/')
  return resolveRoute(path)
}

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  if (options.replace) window.history.replaceState(null, '', to)
  else window.history.pushState(null, '', to)
  window.scrollTo(0, 0)
  window.dispatchEvent(new Event(NAVIGATE_EVENT))
}
