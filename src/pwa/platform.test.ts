import { describe, expect, it } from 'vitest'
import { chooseInstallGuide, detectPlatform, type Platform } from './platform'

// Representative, invented user agents (structure matches real browsers).
const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1',
  iphoneWebView:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  iphoneInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 400.0.0',
  ipadAsMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  androidSamsung:
    'Mozilla/5.0 (Linux; Android 14; SM-A156B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36',
  androidWebView:
    'Mozilla/5.0 (Linux; Android 14; K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 14; Mobile; rv:143.0) Gecko/143.0 Firefox/143.0',
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  windowsEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
}

describe('detectPlatform', () => {
  it.each([
    ['iphoneSafari', 0, { os: 'ios', browser: 'safari' }],
    ['iphoneChrome', 5, { os: 'ios', browser: 'chrome' }],
    ['iphoneWebView', 5, { os: 'ios', browser: 'in-app' }],
    ['iphoneInstagram', 5, { os: 'ios', browser: 'in-app' }],
    ['ipadAsMac', 5, { os: 'ios', browser: 'safari' }],
    ['ipadAsMac', 0, { os: 'other', browser: 'safari' }],
    ['androidChrome', 5, { os: 'android', browser: 'chrome' }],
    ['androidSamsung', 5, { os: 'android', browser: 'samsung' }],
    ['androidWebView', 5, { os: 'android', browser: 'in-app' }],
    ['androidFirefox', 5, { os: 'android', browser: 'firefox' }],
    ['windowsChrome', 0, { os: 'other', browser: 'chrome' }],
    ['windowsEdge', 0, { os: 'other', browser: 'edge' }],
  ] as const)('%s (touch points %d)', (key, maxTouchPoints, expected) => {
    expect(detectPlatform({ userAgent: UA[key], maxTouchPoints })).toEqual(expected)
  })
})

describe('chooseInstallGuide', () => {
  const ios: Platform = { os: 'ios', browser: 'safari' }
  const android: Platform = { os: 'android', browser: 'chrome' }

  it('shows nothing to install when already installed', () => {
    expect(chooseInstallGuide({ platform: android, standalone: true, canPrompt: true })).toBe('installed')
    expect(chooseInstallGuide({ platform: ios, standalone: true, canPrompt: false })).toBe('installed')
  })
  it('uses the install button when the browser offers it', () => {
    expect(chooseInstallGuide({ platform: android, standalone: false, canPrompt: true })).toBe('prompt')
  })
  it('falls back to manual steps on Android without the event', () => {
    expect(chooseInstallGuide({ platform: android, standalone: false, canPrompt: false })).toBe('android-manual')
  })
  it('shows the Safari guide on iPhone, and asks to switch to Safari otherwise', () => {
    expect(chooseInstallGuide({ platform: ios, standalone: false, canPrompt: false })).toBe('ios-safari')
    expect(
      chooseInstallGuide({ platform: { os: 'ios', browser: 'chrome' }, standalone: false, canPrompt: false }),
    ).toBe('ios-other-browser')
  })
  it('asks to leave in-app browsers first', () => {
    expect(
      chooseInstallGuide({ platform: { os: 'android', browser: 'in-app' }, standalone: false, canPrompt: true }),
    ).toBe('in-app')
  })
})
