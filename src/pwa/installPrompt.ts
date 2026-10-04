import { useSyncExternalStore } from 'react'

/** Not in lib.dom: Chromium-only event. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface InstallState {
  /** The captured event, usable once. */
  event: BeforeInstallPromptEvent | null
  installed: boolean
}

let state: InstallState = { event: null, installed: false }
const listeners = new Set<() => void>()

function setState(next: InstallState) {
  state = next
  listeners.forEach((listener) => listener())
}

/**
 * Must run before React renders: the browser may fire beforeinstallprompt
 * very early, before any component is mounted.
 */
export function initInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Stops the browser's own mini-banner; we show our own button instead.
    event.preventDefault()
    setState({ ...state, event: event as BeforeInstallPromptEvent })
  })
  window.addEventListener('appinstalled', () => setState({ event: null, installed: true }))
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const { event } = state
  if (!event) return 'unavailable'
  setState({ ...state, event: null })
  await event.prompt()
  const { outcome } = await event.userChoice
  if (outcome === 'accepted') setState({ event: null, installed: true })
  return outcome
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useInstallPrompt(): { canPrompt: boolean; justInstalled: boolean } {
  const snapshot = useSyncExternalStore(subscribe, () => state)
  return { canPrompt: snapshot.event !== null, justInstalled: snapshot.installed }
}
