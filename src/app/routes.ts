/**
 * Pure routing helpers (no React, no DOM) so they can be unit-tested.
 * Hidden routes (/test, /debug) will be added in later phases.
 */
export const ROUTES = {
  home: '/',
  install: '/installer',
  captures: '/captures',
} as const

export type RouteId = keyof typeof ROUTES | 'notFound'

/** Removes query/hash, collapses repeated and trailing slashes, lowercases. */
export function normalizePath(path: string): string {
  const withoutSuffix = path.split(/[?#]/, 1)[0] ?? ''
  const collapsed = ('/' + withoutSuffix).replace(/\/{2,}/g, '/').toLowerCase()
  return collapsed.length > 1 ? collapsed.replace(/\/$/, '') : '/'
}

export function resolveRoute(path: string): RouteId {
  const normalized = normalizePath(path)
  for (const [id, routePath] of Object.entries(ROUTES)) {
    if (routePath === normalized) return id as keyof typeof ROUTES
  }
  return 'notFound'
}

export interface ClickInfo {
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  defaultPrevented: boolean
  target?: string | null
  download?: boolean
}

/** Whether a click on an internal link should be handled by the client router. */
export function shouldInterceptClick(click: ClickInfo, href: string, currentOrigin: string): boolean {
  if (click.defaultPrevented || click.button !== 0) return false
  if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return false
  if (click.download) return false
  if (click.target && click.target !== '_self') return false
  try {
    return new URL(href, currentOrigin).origin === currentOrigin
  } catch {
    return false
  }
}
