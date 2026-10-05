import { describe, expect, it } from 'vitest'
import { isNeverSubscription, subscriptionKeyword } from './keywords'

describe('subscriptionKeyword', () => {
  it.each([
    ['BPCE ASSURANCES', 'assurance'],
    ['MUTUELLE EXEMPLE', 'assurance'],
    ['COTISATIONS BANCAIRES', 'banque'],
    ['FRAIS DE TENUE DE COMPTE', 'banque'],
    ['ABONNEMENT PARKING', 'autre'],
  ] as const)('%s → %s', (label, category) => {
    expect(subscriptionKeyword(label)?.category).toBe(category)
  })
  it.each(['CB BOULANGERIE', 'REMBOURSEMENT', 'CAISSE D EPARGNE ILE DE FRANCE'])('%s has no keyword', (label) => {
    expect(subscriptionKeyword(label)).toBeNull()
  })
})

describe('isNeverSubscription', () => {
  it('excludes deferred card totals and balances, even when monthly', () => {
    expect(isNeverSubscription('DEBIT DIFFERE N° 1234')).toBe(true)
    expect(isNeverSubscription('ENCOURS CARTE A DEBIT DIFFERE')).toBe(true)
    expect(isNeverSubscription('NETFLIX.COM')).toBe(false)
    expect(isNeverSubscription('PRELEVEMENT')).toBe(true)
  })
})
