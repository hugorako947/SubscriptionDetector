import { describe, expect, it } from 'vitest'
import { detectPeriodicity, isStableAmount, monthlyEquivalent, nextRenewalFrom } from './periodicity'

describe('detectPeriodicity', () => {
  it.each([
    [['2026-07-05', '2026-08-05', '2026-09-04'], 'monthly'],
    [['2026-09-01', '2026-09-08', '2026-09-15'], 'weekly'],
    [['2026-01-10', '2026-04-11'], 'quarterly'],
    [['2025-09-03', '2026-09-03'], 'yearly'],
  ] as const)('%j → %s', (dates, period) => {
    expect(detectPeriodicity(dates.map((date) => ({ date, amountCents: 999 })))?.period).toBe(period)
  })

  it('needs two dates, regular gaps and a stable amount', () => {
    expect(detectPeriodicity([{ date: '2026-09-05', amountCents: 999 }])).toBeNull()
    expect(detectPeriodicity([{ date: '2026-09-01' }, { date: '2026-09-15' }])).toBeNull()
    expect(
      detectPeriodicity([
        { date: '2026-07-05', amountCents: 999 },
        { date: '2026-08-05', amountCents: 4500 },
      ]),
    ).toBeNull()
  })

  it('treats a price within 10 % or 1 € as stable', () => {
    expect(isStableAmount([999, 1049])).toBe(true)
    expect(isStableAmount([999, 1299])).toBe(false)
  })
})

describe('monthlyEquivalent and nextRenewalFrom', () => {
  it('converts every period', () => {
    expect(monthlyEquivalent(1200, 'yearly')).toBe(100)
    expect(monthlyEquivalent(300, 'quarterly')).toBe(100)
    expect(monthlyEquivalent(300, 'weekly')).toBe(1300)
    expect(monthlyEquivalent(999, 'monthly')).toBe(999)
    expect(monthlyEquivalent(999, 'unknown')).toBeUndefined()
  })
  it('adds calendar months, clamped to the end of the month', () => {
    expect(nextRenewalFrom('2026-09-05', 'monthly')).toBe('2026-10-05')
    expect(nextRenewalFrom('2026-01-31', 'monthly')).toBe('2026-02-28')
    expect(nextRenewalFrom('2026-09-05', 'yearly')).toBe('2027-09-05')
    expect(nextRenewalFrom('2026-09-05', 'weekly')).toBe('2026-09-12')
    expect(nextRenewalFrom('2026-09-05', 'unknown')).toBeUndefined()
  })
})
