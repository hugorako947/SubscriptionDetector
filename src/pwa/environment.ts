import { useMemo, useSyncExternalStore } from 'react'
import { detectPlatform, type Platform } from './platform'

function mediaQueryStore(query: string) {
  return {
    subscribe(onChange: () => void) {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    get: () => window.matchMedia(query).matches,
  }
}

export function useMediaQuery(query: string): boolean {
  const store = useMemo(() => mediaQueryStore(query), [query])
  return useSyncExternalStore(store.subscribe, store.get, () => false)
}

/** PC layout: wide screen with a precise pointer. Tablets follow the phone path (H10). */
export const DESKTOP_QUERY = '(min-width: 768px) and (pointer: fine)'

export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY)
}

export function useIsStandalone(): boolean {
  const displayModeStandalone = useMediaQuery('(display-mode: standalone)')
  // iOS Safari exposes a non-standard flag for home-screen apps.
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return displayModeStandalone || iosStandalone
}

export function usePlatform(): Platform {
  return useMemo(
    () => detectPlatform({ userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints }),
    [],
  )
}
