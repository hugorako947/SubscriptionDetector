/**
 * The QR code always encodes the current site address (never hard-coded),
 * so it works on preview deploys, tunnels and production alike.
 */
export function shareableUrl(origin: string): string {
  return `${origin.replace(/\/+$/, '')}/`
}

export type LocalAddressIssue =
  /** localhost / 127.x / ::1: only this computer can open it. */
  | 'this-computer-only'
  /** Local network over plain http: the phone can open it, but not install the app. */
  | 'no-https'
  | null

const PRIVATE_IPV4 = /^(10\.\d+|172\.(1[6-9]|2\d|3[01])|192\.168)\.\d+\.\d+$/

export function localAddressIssue(hostname: string, protocol: string): LocalAddressIssue {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost') || host === '::1' || host === '0.0.0.0') {
    return 'this-computer-only'
  }
  if (/^127\.\d+\.\d+\.\d+$/.test(host)) return 'this-computer-only'
  if (protocol !== 'https:' && (PRIVATE_IPV4.test(host) || host.endsWith('.local'))) return 'no-https'
  return null
}
