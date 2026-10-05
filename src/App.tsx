import { lazy, Suspense, useEffect, useRef } from 'react'
import { useRoute } from './app/router'
import type { RouteId } from './app/routes'
import { useIsDesktop } from './pwa/environment'
import { UpdateBanner } from './pwa/UpdateBanner'
import { Captures } from './ui/screens/Captures'
import { DesktopHome } from './ui/screens/DesktopHome'
import { Install } from './ui/screens/Install'
import { MobileHome } from './ui/screens/MobileHome'
import { NotFound } from './ui/screens/NotFound'

// Loaded on demand, and removed from the production bundle (__DEBUG_SCREEN__ is false there).
const DebugOcr = __DEBUG_SCREEN__ ? lazy(() => import('./debug/DebugOcr')) : null

const TITLES: Record<RouteId, string> = {
  home: "Détecteur d'abonnements",
  install: "Installer l'appli · Détecteur d'abonnements",
  captures: "Guide de capture · Détecteur d'abonnements",
  debug: "Débogage OCR · Détecteur d'abonnements",
  notFound: "Page introuvable · Détecteur d'abonnements",
}

/** After an in-app navigation, moves focus to the new title (screen readers, keyboard). */
function useFocusTitleOnNavigation(route: RouteId) {
  const previous = useRef<RouteId | null>(null)
  useEffect(() => {
    document.title = TITLES[route]
    if (previous.current !== null && previous.current !== route) {
      document.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
    }
    previous.current = route
  }, [route])
}

export default function App() {
  const route = useRoute()
  const isDesktop = useIsDesktop()
  useFocusTitleOnNavigation(route)

  return (
    <>
      <UpdateBanner />
      {route === 'home' && (isDesktop ? <DesktopHome /> : <MobileHome />)}
      {route === 'install' && <Install />}
      {route === 'captures' && <Captures />}
      {route === 'debug' &&
        (DebugOcr ? (
          <Suspense fallback={null}>
            <DebugOcr />
          </Suspense>
        ) : (
          <NotFound />
        ))}
      {route === 'notFound' && <NotFound />}
    </>
  )
}
