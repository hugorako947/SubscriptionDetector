import { describe, expect, it } from 'vitest'
import { SERVICES } from '../data/services'
import { normalizeLabel } from '../parsing/normalize'
import { matchService } from './matcher'

const match = (raw: string) => matchService(normalizeLabel(raw))?.service.id ?? null

describe('matchService', () => {
  it.each([
    ['PRLV SEPA NETFLIX.COM', 'netflix'],
    ['CB NETFLIXCOM 05/09', 'netflix'],
    ['CB*SP0TIFY', 'spotify'], // OCR: 0 for O
    ['CB SPOTIFV', 'spotify'], // OCR: V for Y, fuzzy
    ['PRLV SEPA DEEZER SA', 'deezer'],
    ['PAYPAL *DEEZER', 'deezer'], // service behind PayPal wins over PayPal
    ['PRLV SEPA RED BY SFR', 'red-by-sfr'], // longest variant wins over « SFR »
    ['PRLV SEPA SFR', 'sfr'],
    ['CB AMAZON PRIRNE', 'prime-video'], // OCR: rn for m
    ['APPLE.COM/BILL', 'apple'],
    ['CB DISNEY PLUS', 'disney-plus'],
  ])('%s → %s', (raw, id) => {
    expect(match(raw)).toBe(id)
  })

  it.each(['CB BOULANGERIE DU PORT', 'CB ORANGERIE DU PARC', 'CB MAXI SUPERMARCHE', 'PRLV SEPA CINEFLUX', 'CB FREE PARKING'])(
    '%s matches nothing',
    (raw) => expect(match(raw)).toBeNull(),
  )

  it('respects an adjustable threshold', () => {
    expect(matchService('SPOTIFV', SERVICES, 0.999)).toBeNull()
  })
})

describe('services dictionary', () => {
  it('has about thirty services, unique ids and no verified cancel link yet', () => {
    const ids = SERVICES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(SERVICES.filter((s) => !s.intermediary).length).toBeGreaterThanOrEqual(30)
    for (const service of SERVICES) {
      expect(service.cancelUrl).toBe('')
      expect(service.verified).toBe(false)
    }
  })

  it('stores variants already normalised', () => {
    for (const service of SERVICES) for (const variant of service.variants) expect(normalizeLabel(variant)).toBe(variant)
  })

  it('never contains a price', () => {
    expect(JSON.stringify(SERVICES)).not.toMatch(/\d+[,.]\d{2}|€/)
  })
})
