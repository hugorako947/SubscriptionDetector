import { describe, expect, it } from 'vitest'
import type { Transaction } from '../domain/types'
import { normalizeLabel } from '../parsing/normalize'
import { dedupeTransactions } from './dedupe'
import { detectSubscriptions, merchantKey, totals } from './engine'

let counter = 0
function tx(label: string, fields: Partial<Transaction> = {}): Transaction {
  counter++
  return {
    id: `t${counter}`,
    rawText: label,
    label,
    normalizedLabel: normalizeLabel(label),
    currency: 'EUR',
    direction: 'debit',
    kind: 'unknown',
    source: 'screenshot_card_history',
    captureIndex: 0,
    ...fields,
  }
}

describe('dedupeTransactions', () => {
  it('drops a line seen again on an overlapping screenshot, keeps real repeats within one', () => {
    const a = tx('CB CAFE', { amountCents: 250, date: '2026-09-05', captureIndex: 0 })
    const b = tx('CB CAFE', { amountCents: 250, date: '2026-09-05', captureIndex: 0 })
    const c = tx('CB CAFE', { amountCents: 250, date: '2026-09-05', captureIndex: 1 })
    const result = dedupeTransactions([a, b, c])
    expect(result.kept.map((t) => t.id)).toEqual([a.id, b.id])
    expect(result.duplicates).toBe(1)
  })
})

describe('detectSubscriptions', () => {
  it('rule 1: dictionary match → high confidence with the usual period', () => {
    const { subscriptions } = detectSubscriptions([tx('PRLV SEPA NETFLIX.COM', { amountCents: 1000, date: '2026-09-05', kind: 'sepa' })])
    expect(subscriptions).toHaveLength(1)
    expect(subscriptions[0]).toMatchObject({
      serviceId: 'netflix',
      displayName: 'Netflix',
      confidence: 'high',
      period: 'monthly',
      periodIsEstimated: true,
      monthlyEquivalentCents: 1000,
      nextRenewal: '2026-10-05',
      category: 'streaming',
      status: 'pending',
    })
  })

  it('rule 2: unknown SEPA creditor → medium; taxes and loans → other debits', () => {
    const result = detectSubscriptions([
      tx('PRLV SEPA CINEFLUX', { amountCents: 1199, kind: 'sepa' }),
      tx('PRLV SEPA DGFIP IMPOT', { amountCents: 12000, kind: 'sepa' }),
      tx('PRLV SEPA ECHEANCE PRET AUTO', { amountCents: 25000, kind: 'sepa' }),
    ])
    expect(result.subscriptions.map((s) => [s.displayName, s.confidence])).toEqual([['Cineflux', 'medium']])
    expect(result.otherDebits.map((s) => s.reasons[0])).toEqual([
      'Impôts ou taxes : prélèvement, mais pas un abonnement.',
      'Crédit ou prêt : prélèvement, mais pas un abonnement.',
    ])
    expect(totals([...result.subscriptions, ...result.otherDebits]).withoutAmount).toBe(1)
  })

  it('rule 3: regular card payments → periodicity detected', () => {
    const lines = ['2026-07-03', '2026-08-03', '2026-09-03'].map((date) => tx('CB NUAGERIE 200 GO', { amountCents: 299, date, kind: 'card' }))
    const [sub] = detectSubscriptions(lines).subscriptions
    expect(sub).toMatchObject({ confidence: 'medium', period: 'monthly', periodIsEstimated: false, monthlyEquivalentCents: 299 })
    const twice = detectSubscriptions(lines.slice(0, 2)).subscriptions[0]
    expect(twice?.confidence).toBe('low')
  })

  it('rule 4: one-off purchases, credits and transfers are ignored, and no transfer text is kept', () => {
    const result = detectSubscriptions([
      tx('CB BOULANGERIE', { amountCents: 420, date: '2026-09-03', kind: 'card' }),
      tx('REMBOURSEMENT', { amountCents: 1500, direction: 'credit' }),
      tx('', { normalizedLabel: '', rawText: '', amountCents: 5000, kind: 'transfer' }),
    ])
    expect(result.subscriptions).toEqual([])
    expect(result.stats).toMatchObject({ credits: 1, transfers: 1, ignored: 1 })
    expect(JSON.stringify(result)).not.toContain('DUPONT')
  })

  it('reconciles an Apple line with the store subscription of the same amount (no double count)', () => {
    const result = detectSubscriptions([
      tx('Cinéflux', { source: 'screenshot_store', kind: 'store', amountCents: 499, periodHint: 'monthly', renewalDate: '2026-10-12' }),
      tx('CB APPLE.COM/BILL', { amountCents: 499, date: '2026-09-12', kind: 'card', captureIndex: 1 }),
      tx('CB APPLE.COM/BILL', { amountCents: 999, date: '2026-09-20', kind: 'card', captureIndex: 1 }),
    ])
    expect(result.subscriptions.map((s) => [s.displayName, s.amountCents, s.sourceTransactionIds.length])).toEqual([
      ['Cinéflux', 499, 2],
      ['Abonnement Apple', 999, 1],
    ])
    expect(result.subscriptions[0]).toMatchObject({ confidence: 'high', period: 'monthly', periodIsEstimated: false, nextRenewal: '2026-10-12' })
  })

  it('merges the same unknown creditor seen on the debits page and on the statement', () => {
    const result = detectSubscriptions([
      tx('CINEFLUX SAS', { source: 'screenshot_bank_debits', kind: 'sepa' }),
      tx('PRLV SEPA CINEFLUX', { amountCents: 1199, date: '2026-09-02', kind: 'sepa', captureIndex: 1 }),
      tx('CLUB FORME PLUS', { source: 'screenshot_bank_debits', kind: 'sepa' }),
      tx('PRLV CLUB FORME+', { amountCents: 2499, kind: 'sepa', captureIndex: 1 }),
    ])
    expect(result.subscriptions.map((s) => [s.displayName, s.amountCents, s.needsAmount])).toEqual([
      ['Club Forme+', 2499, false],
      ['Cineflux', 1199, false],
    ])
  })

  it('asks for the amount when the debits page shows names only', () => {
    const [sub] = detectSubscriptions([tx('ONDEA MUSIQUE', { source: 'screenshot_bank_debits', kind: 'sepa' })]).subscriptions
    expect(sub).toMatchObject({ needsAmount: true, confidence: 'medium' })
    expect(sub?.reasons).toContain('Montant absent de la capture : à compléter.')
  })
})

describe('merchantKey and totals', () => {
  it('ignores legal suffixes and + / PLUS', () => {
    expect(merchantKey('CINEFLUX SAS')).toBe(merchantKey('CINEFLUX'))
    expect(merchantKey('CLUB FORME+')).toBe(merchantKey('CLUB FORME PLUS'))
  })
  it('sums monthly equivalents, never rejected items or other debits', () => {
    const { subscriptions } = detectSubscriptions([
      tx('PRLV NETFLIX', { amountCents: 1000, kind: 'sepa' }),
      tx('PRLV SPOTIFY', { amountCents: 1100, kind: 'sepa' }),
    ])
    subscriptions.find((s) => s.serviceId === 'spotify')!.status = 'rejected'
    expect(totals(subscriptions)).toEqual({ monthlyCents: 1000, yearlyCents: 12000, withoutAmount: 0 })
  })
})
