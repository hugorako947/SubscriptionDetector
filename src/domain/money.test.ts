import { describe, expect, it } from 'vitest'
import { formatEuros, formatSignedEuros, yearlyFromMonthly } from './money'

/** Intl uses narrow/no-break spaces; normalise them to compare readably. */
const plain = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ')

describe('formatEuros', () => {
  it('formats cents in French', () => {
    expect(plain(formatEuros(1349))).toBe('13,49 €')
    expect(plain(formatEuros(123456))).toBe('1 234,56 €')
    expect(plain(formatEuros(0))).toBe('0,00 €')
  })
  it('refuses non-integer cents', () => {
    expect(() => formatEuros(13.49)).toThrow(RangeError)
  })
})

describe('yearlyFromMonthly', () => {
  it('multiplies by twelve', () => {
    expect(yearlyFromMonthly(4196)).toBe(50352)
  })
})

describe('formatSignedEuros', () => {
  it('uses a typographic minus for debits and a plus for credits', () => {
    expect(plain(formatSignedEuros(-1199))).toBe('\u221211,99 €')
    expect(plain(formatSignedEuros(1500))).toBe('+15,00 €')
  })
})
