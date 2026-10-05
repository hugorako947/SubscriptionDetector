import { describe, expect, it } from 'vitest'
import type { DetectedSubscription } from './types'
import {
  applyEdit,
  createManual,
  createTrial,
  daysUntil,
  fromDetection,
  mergeDetections,
  portfolioTotals,
  upcomingDeadlines,
} from './portfolio'

const NOW = '2026-10-05T10:00:00.000Z'
const detected = (id: string, fields: Partial<DetectedSubscription> = {}): DetectedSubscription => ({
  id,
  displayName: id,
  category: 'autre',
  period: 'monthly',
  periodIsEstimated: true,
  confidence: 'high',
  reasons: [],
  sourceTransactionIds: [],
  sourceLines: [],
  status: 'pending',
  needsAmount: false,
  kind: 'subscription',
  amountCents: 1000,
  monthlyEquivalentCents: 1000,
  ...fields,
})

describe('mergeDetections', () => {
  it('adds new items, refreshes pending ones, never touches the user’s decisions', () => {
    const pending = fromDetection(detected('a', { sourceLines: ['ligne 1'] }), NOW)
    const confirmed = { ...fromDetection(detected('b'), NOW), status: 'confirmed' as const, amountCents: 1500 }
    const result = mergeDetections([pending, confirmed], [detected('a', { amountCents: 1100, sourceLines: ['ligne 2'] }), detected('b', { amountCents: 999 }), detected('c')], NOW)
    expect(result.added.map((s) => s.id)).toEqual(['c'])
    expect(result.refreshed).toHaveLength(1)
    expect(result.refreshed[0]).toMatchObject({ id: 'a', amountCents: 1100, sourceLines: ['ligne 1', 'ligne 2'] })
  })
})

describe('applyEdit', () => {
  it('recomputes the monthly equivalent and the missing-amount flag', () => {
    const item = fromDetection(detected('a', { amountCents: undefined, monthlyEquivalentCents: undefined, needsAmount: true, period: 'unknown' }), NOW)
    const edited = applyEdit(item, { amountCents: 2400, period: 'yearly' }, NOW)
    expect(edited).toMatchObject({ amountCents: 2400, period: 'yearly', periodIsEstimated: false, monthlyEquivalentCents: 200, needsAmount: false })
    const cleared = applyEdit(edited, { amountCents: null }, NOW)
    expect(cleared.monthlyEquivalentCents).toBeUndefined()
    expect(cleared.needsAmount).toBe(true)
  })
  it('keeps the old name when the new one is empty', () => {
    expect(applyEdit(fromDetection(detected('Netflix'), NOW), { displayName: '  ' }, NOW).displayName).toBe('Netflix')
  })
})

describe('manual additions and trials', () => {
  it('creates confirmed items with unique ids', () => {
    const a = createManual({ displayName: ' Mutuelle ', category: 'assurance', amountCents: 3000, period: 'monthly' }, NOW)
    const b = createManual({ displayName: 'Box', category: 'telephonie' }, NOW)
    expect(a).toMatchObject({ displayName: 'Mutuelle', status: 'confirmed', origin: 'manual', monthlyEquivalentCents: 3000, needsAmount: false })
    expect(b.needsAmount).toBe(true)
    expect(a.id).not.toBe(b.id)
  })
  it('creates a trial with its end date and the price that follows', () => {
    const trial = createTrial({ displayName: 'Appli photo', endsAt: '2026-10-12', amountCents: 499, period: 'monthly' }, NOW)
    expect(trial).toMatchObject({ category: 'essai', origin: 'trial', trialEndsAt: '2026-10-12', monthlyEquivalentCents: 499 })
  })
})

describe('portfolioTotals', () => {
  it('counts kept and to-cancel items, never rejected, cancelled or other debits, and shows possible savings', () => {
    const items = [
      fromDetection(detected('a', { monthlyEquivalentCents: 1000 }), NOW),
      { ...fromDetection(detected('b', { monthlyEquivalentCents: 500 }), NOW), userStatus: 'to_cancel' as const },
      { ...fromDetection(detected('c'), NOW), status: 'rejected' as const },
      { ...fromDetection(detected('d'), NOW), userStatus: 'cancelled' as const },
      fromDetection(detected('e', { kind: 'other_debit' }), NOW),
      fromDetection(detected('f', { monthlyEquivalentCents: undefined, amountCents: undefined }), NOW),
    ]
    expect(portfolioTotals(items)).toEqual({ count: 3, monthlyCents: 1500, yearlyCents: 18000, incomplete: 1, savingsYearlyCents: 6000 })
  })
})

describe('upcomingDeadlines', () => {
  it('lists renewals and trial ends of the next 30 days, soonest first', () => {
    const items = [
      fromDetection(detected('far', { nextRenewal: '2026-12-01' }), NOW),
      fromDetection(detected('soon', { nextRenewal: '2026-10-08' }), NOW),
      createTrial({ displayName: 'Essai', endsAt: '2026-10-06' }, NOW),
      { ...fromDetection(detected('gone', { nextRenewal: '2026-10-07' }), NOW), userStatus: 'cancelled' as const },
      fromDetection(detected('past', { nextRenewal: '2026-10-01' }), NOW),
    ]
    expect(upcomingDeadlines(items, '2026-10-05').map((d) => [d.item.displayName, d.type, d.inDays])).toEqual([
      ['Essai', 'trial_end', 1],
      ['soon', 'renewal', 3],
    ])
  })
  it('counts calendar days', () => {
    expect(daysUntil('2026-11-01', '2026-10-31')).toBe(1)
    expect(daysUntil('2027-01-01', '2026-12-31')).toBe(1)
  })
})
