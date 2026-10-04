/**
 * Platform detection from the user agent. Only used to pick the right
 * installation guide; the PC/phone layout uses media queries instead (H10).
 * The user agent is never stored or sent anywhere.
 */
export type OperatingSystem = 'ios' | 'android' | 'other'
export type Browser = 'safari' | 'chrome' | 'samsung' | 'firefox' | 'edge' | 'in-app' | 'other'

export interface Platform {
  os: OperatingSystem
  browser: Browser
}

export interface PlatformInput {
  userAgent: string
  /** navigator.maxTouchPoints: iPadOS presents itself as a Mac with a touch screen. */
  maxTouchPoints: number
}

// TODO(vérifier): in-app browser signatures change over time; test with the
// apps people actually use to open links (messaging, social networks).
const IN_APP_PATTERN = /FBAN|FBAV|Instagram|LinkedInApp|Snapchat|TikTok|musical_ly|BytedanceWebview|Line\/|GSA\//i

export function detectPlatform({ userAgent: ua, maxTouchPoints }: PlatformInput): Platform {
  const isIos = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1)
  const isAndroid = !isIos && /Android/i.test(ua)
  const os: OperatingSystem = isIos ? 'ios' : isAndroid ? 'android' : 'other'

  if (IN_APP_PATTERN.test(ua)) return { os, browser: 'in-app' }

  if (os === 'ios') {
    if (/CriOS/i.test(ua)) return { os, browser: 'chrome' }
    if (/FxiOS/i.test(ua)) return { os, browser: 'firefox' }
    if (/EdgiOS/i.test(ua)) return { os, browser: 'edge' }
    // Safari includes both "Version/x" and "Safari/x"; embedded web views usually do not.
    if (/Version\/[\d.]+.*Safari\//i.test(ua)) return { os, browser: 'safari' }
    return { os, browser: 'in-app' }
  }

  if (os === 'android') {
    if (/; wv\)/i.test(ua)) return { os, browser: 'in-app' }
    if (/SamsungBrowser/i.test(ua)) return { os, browser: 'samsung' }
    if (/Firefox\//i.test(ua)) return { os, browser: 'firefox' }
    if (/EdgA\//i.test(ua)) return { os, browser: 'edge' }
    if (/Chrome\//i.test(ua)) return { os, browser: 'chrome' }
    return { os, browser: 'other' }
  }

  if (/Edg\//i.test(ua)) return { os, browser: 'edge' }
  if (/Firefox\//i.test(ua)) return { os, browser: 'firefox' }
  if (/Chrome\//i.test(ua)) return { os, browser: 'chrome' }
  if (/Safari\//i.test(ua)) return { os, browser: 'safari' }
  return { os, browser: 'other' }
}

export type InstallGuide =
  | 'installed'
  | 'prompt'
  | 'ios-safari'
  | 'ios-other-browser'
  | 'in-app'
  | 'android-manual'
  | 'unsupported'

export interface InstallContext {
  platform: Platform
  /** Already running as an installed app (display-mode standalone). */
  standalone: boolean
  /** A beforeinstallprompt event has been captured and not used yet. */
  canPrompt: boolean
}

export function chooseInstallGuide({ platform, standalone, canPrompt }: InstallContext): InstallGuide {
  if (standalone) return 'installed'
  if (platform.browser === 'in-app') return 'in-app'
  if (canPrompt) return 'prompt'
  if (platform.os === 'ios') return platform.browser === 'safari' ? 'ios-safari' : 'ios-other-browser'
  if (platform.os === 'android') return 'android-manual'
  return 'unsupported'
}
