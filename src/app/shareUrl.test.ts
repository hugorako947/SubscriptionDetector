import { describe, expect, it } from 'vitest'
import { localAddressIssue, shareableUrl } from './shareUrl'

describe('shareableUrl', () => {
  it('points to the home page of the current site', () => {
    expect(shareableUrl('https://exemple.pages.dev')).toBe('https://exemple.pages.dev/')
    expect(shareableUrl('https://exemple.pages.dev/')).toBe('https://exemple.pages.dev/')
  })
})

describe('localAddressIssue', () => {
  it.each([
    ['localhost', 'http:', 'this-computer-only'],
    ['127.0.0.1', 'http:', 'this-computer-only'],
    ['[::1]', 'http:', 'this-computer-only'],
    ['192.168.1.20', 'http:', 'no-https'],
    ['10.0.0.5', 'http:', 'no-https'],
    ['172.20.3.4', 'http:', 'no-https'],
    ['mon-pc.local', 'http:', 'no-https'],
    ['172.32.0.1', 'http:', null],
    ['exemple.pages.dev', 'https:', null],
    ['abc.trycloudflare.com', 'https:', null],
  ] as const)('%s over %s → %s', (hostname, protocol, expected) => {
    expect(localAddressIssue(hostname, protocol)).toBe(expected)
  })
})
