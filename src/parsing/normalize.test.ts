import { describe, expect, it } from 'vitest'
import { detectPaymentKind, normalizeLabel } from './normalize'

describe('normalizeLabel', () => {
  it.each([
    ['PRLV SEPA CINÉFLUX', 'CINEFLUX'],
    ['Prélèvement SEPA Ondéa Musique', 'ONDEA MUSIQUE'],
    ['PAIEMENT PAR CARTE X1234 NUAGERIE 200 GO 05/09', 'NUAGERIE 200 GO'],
    ['CB NETFLIX.COM 050926 CARTE 4974XXXXXXXX1234', 'NETFLIX.COM'],
    ['PRLV SEPA CLUB FORME+ RUM: ABC123456789', 'CLUB FORME+'],
    ['CB*SP0TIFY', 'SPOTIFY'],
    ['CB NETFLlX', 'NETFLIX'],
    ['APPLE.COM/BILL', 'APPLE.COM BILL'],
    ['PAYPAL *DEEZER', 'PAYPAL DEEZER'],
    ['VIR SEPA INST REMBOURSEMENT', 'REMBOURSEMENT'],
  ])('%s → %s', (raw, expected) => {
    expect(normalizeLabel(raw)).toBe(expected)
  })

  it('keeps numbers that belong to the name', () => {
    expect(normalizeLabel('CB NUAGERIE 200 GO')).toBe('NUAGERIE 200 GO')
  })
})

describe('detectPaymentKind', () => {
  it.each([
    ['PRLV SEPA CINEFLUX', 'sepa'],
    ['Prélèvement SEPA', 'sepa'],
    ['CB BOULANGERIE', 'card'],
    ['PAIEMENT PAR CARTE X1234', 'card'],
    ['VIR SEPA INST M DUPONT', 'transfer'],
    ['Virement reçu', 'transfer'],
    ['NETFLIX.COM', 'unknown'],
  ] as const)('%s → %s', (label, kind) => {
    expect(detectPaymentKind(label)).toBe(kind)
  })
})

describe('people are transfers (never displayed)', () => {
  it.each(['M DURAND PAUL', 'MME MARTIN CLAIRE', 'M. DUPONT', 'M ET MME DURAND', 'MONSIEUR PAUL DURAND'])('%s → transfer', (label) => {
    expect(detectPaymentKind(label)).toBe('transfer')
  })
  it.each(['M6 PLUS', 'MUTUELLE EXEMPLE', 'MAXI ZOO'])('%s is not a person', (label) => {
    expect(detectPaymentKind(label)).not.toBe('transfer')
  })
})
