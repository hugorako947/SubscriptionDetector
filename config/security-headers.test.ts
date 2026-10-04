import { describe, expect, it } from 'vitest'
import { buildCsp, buildHeadersFile, cspDirectives, securityHeaders } from './security-headers.ts'

describe('Content-Security-Policy', () => {
  const csp = buildCsp()

  it('only allows network requests to our own site', () => {
    expect(cspDirectives['connect-src']).toEqual(["'self'"])
    expect(csp).toContain("connect-src 'self';")
  })

  it('forbids everything by default and never allows eval or inline scripts', () => {
    expect(csp.startsWith("default-src 'none'")).toBe(true)
    expect(csp).not.toContain("'unsafe-eval'")
    expect(csp).not.toContain("'unsafe-inline'")
  })

  it('never references a third-party host', () => {
    expect(csp).not.toMatch(/https?:\/\//)
  })
})

describe('_headers file', () => {
  it('applies every header to every path', () => {
    const file = buildHeadersFile()
    expect(file.split('\n')[0]).toBe('/*')
    for (const name of Object.keys(securityHeaders)) {
      expect(file).toContain(`  ${name}: `)
    }
  })
})
