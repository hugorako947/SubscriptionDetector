import { describe, expect, it } from 'vitest'
import { normalizePath, resolveRoute, shouldInterceptClick, type ClickInfo } from './routes'

const plainClick: ClickInfo = {
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  defaultPrevented: false,
}

describe('normalizePath', () => {
  it.each([
    ['/', '/'],
    ['', '/'],
    ['/installer/', '/installer'],
    ['//installer//', '/installer'],
    ['/Installer?x=1#top', '/installer'],
    ['installer', '/installer'],
  ])('%s → %s', (input, expected) => {
    expect(normalizePath(input)).toBe(expected)
  })
})

describe('resolveRoute', () => {
  it('finds known routes', () => {
    expect(resolveRoute('/')).toBe('home')
    expect(resolveRoute('/installer/')).toBe('install')
    expect(resolveRoute('/captures?from=home')).toBe('captures')
  })
  it('returns notFound for unknown paths', () => {
    expect(resolveRoute('/inconnu')).toBe('notFound')
  })
})

describe('shouldInterceptClick', () => {
  const origin = 'https://exemple.test'
  it('intercepts a plain click on an internal link', () => {
    expect(shouldInterceptClick(plainClick, '/installer', origin)).toBe(true)
  })
  it('lets the browser handle modified clicks, new tabs and downloads', () => {
    expect(shouldInterceptClick({ ...plainClick, ctrlKey: true }, '/installer', origin)).toBe(false)
    expect(shouldInterceptClick({ ...plainClick, target: '_blank' }, '/installer', origin)).toBe(false)
    expect(shouldInterceptClick({ ...plainClick, download: true }, '/rappels.ics', origin)).toBe(false)
    expect(shouldInterceptClick({ ...plainClick, button: 1 }, '/installer', origin)).toBe(false)
  })
  it('never intercepts external links', () => {
    expect(shouldInterceptClick(plainClick, 'https://ailleurs.test/page', origin)).toBe(false)
  })
})
