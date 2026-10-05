import { lazy, Suspense, useEffect, useRef } from 'react'
import { useRoute } from './app/router'
import type { RouteId } from './app/routes'
import { useIsDesktop } from './pwa/environment'
import { UpdateBanner } from './pwa/UpdateBanner'
import { listSubscriptions } from './storage/db'
import { useLive } from './storage/useLive'
import { CaptureGuide } from './ui/screens/CaptureGuide'
import { Dashboard } from './ui/screens/Dashboard'
import { DesktopHome } from './ui/screens/DesktopHome'
import { Install } from './ui/screens/Install'
import { MemoryList } from './ui/screens/MemoryList'
import { MobileHome } from './ui/screens/MobileHome'
import { NotFound } from './ui/screens/NotFound'

// Loaded on demand, and removed from the production bundle (__DEBUG_SCREEN__ is false there).
const DebugOcr = __DEBUG_SCREEN__ ? lazy(() => import('./debug/DebugOcr')) : null

const TITLES: Record<RouteId, string> = {
  home: "Détecteur d'abonnements",
  install: "Installer l'appli · Détecteur d'abonnements",
  captures: "Captures d'écran · Détecteur d'abonnements",
  subscriptions: "Mes abonnements · Détecteur d'abonnements",
  memory: "Liste mémoire · Détecteur d'abonnements",
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

/** Home: the dashboard as soon as the user has a list, the welcome page otherwise. */
function Home() {
  const items = useLive(listSubscriptions)
  const isDesktop = useIsDesktop()
  if (items === undefined) return <div className="min-h-dvh" />
  if (items.length > 0) return <Dashboard />
  return isDesktop ? <DesktopHome /> : <MobileHome />
}

export default function App() {
  const route = useRoute()
  useFocusTitleOnNavigation(route)

  return (
    <>
      <UpdateBanner />
      {route === 'home' && <Home />}
      {route === 'install' && <Install />}
      {route === 'captures' && <CaptureGuide />}
      {route === 'subscriptions' && <Dashboard />}
      {route === 'memory' && <MemoryList />}
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
