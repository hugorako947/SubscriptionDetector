import { describe, expect, it } from 'vitest'
import { createTrial, fromDetection } from '../domain/portfolio'
import type { DetectedSubscription } from '../domain/types'
import { buildIcs, foldLine } from './ics'

const NOW = '2026-10-05T10:00:00.000Z'
const sub = (fields: Partial<DetectedSubscription>): DetectedSubscription => ({
  id: 'sub:service:netflix',
  displayName: 'Netflix',
  category: 'streaming',
  period: 'monthly',
  periodIsEstimated: false,
  confidence: 'high',
  reasons: [],
  sourceTransactionIds: [],
  sourceLines: [],
  status: 'confirmed',
  needsAmount: false,
  kind: 'subscription',
  amountCents: 1000,
  nextRenewal: '2026-10-12',
  ...fields,
})

describe('buildIcs', () => {
  const items = [
    fromDetection(sub({}), NOW),
    createTrial({ displayName: 'Appli, photo; pro', endsAt: '2026-10-20', amountCents: 499 }, NOW),
    { ...fromDetection(sub({ id: 'x', displayName: 'Résilié' }), NOW), userStatus: 'cancelled' as const },
    fromDetection(sub({ id: 'old', displayName: 'Passé', nextRenewal: '2026-09-01' }), NOW),
  ]
  const { content, events } = buildIcs(items, '2026-10-05', new Date(NOW))

  it('is a valid calendar with CRLF line endings', () => {
    expect(content.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(content.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(content.split('\r\n').every((line) => !line.includes('\n'))).toBe(true)
  })

  it('creates one event per future renewal or trial end, with a reminder', () => {
    expect(events).toBe(2)
    expect(content).toContain('DTSTART;VALUE=DATE:20261012')
    expect(content).toContain('RRULE:FREQ=MONTHLY')
    expect(content).toContain('TRIGGER:-P1D')
    expect(content).toContain('DTSTART;VALUE=DATE:20261020')
    expect(content).toContain('TRIGGER:-P2D')
    expect(content).not.toContain('Résilié')
    expect(content).not.toContain('Passé')
  })

  it('escapes commas and semicolons', () => {
    expect(content).toContain("Fin de l'essai gratuit : Appli\\, photo\\; pro")
  })
})

describe('foldLine', () => {
  it('folds at 75 octets without cutting accented characters', () => {
    const folded = foldLine(`DESCRIPTION:${'é'.repeat(60)}`)
    for (const part of folded.split('\r\n')) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75)
    expect(folded.replace(/\r\n /g, '')).toBe(`DESCRIPTION:${'é'.repeat(60)}`)
  })
})
