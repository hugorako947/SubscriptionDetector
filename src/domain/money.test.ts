import { describe, expect, it } from 'vitest'
import { centsToInput, formatEuros, formatSignedEuros, parseEuroInput, yearlyFromMonthly } from './money'

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

describe('parseEuroInput and centsToInput', () => {
  it('reads what people type', () => {
    expect(parseEuroInput('12,99')).toBe(1299)
    expect(parseEuroInput('12.99')).toBe(1299)
    expect(parseEuroInput(' 12 € ')).toBe(1200)
    expect(parseEuroInput('12,9')).toBe(1290)
    expect(parseEuroInput('1 234,50')).toBe(123450)
  })
  it('refuses the rest', () => {
    expect(parseEuroInput('')).toBeNull()
    expect(parseEuroInput('douze')).toBeNull()
    expect(parseEuroInput('12,999')).toBeNull()
    expect(parseEuroInput('-5')).toBeNull()
  })
  it('round-trips', () => {
    expect(centsToInput(1299)).toBe('12,99')
    expect(parseEuroInput(centsToInput(1290))).toBe(1290)
    expect(centsToInput(undefined)).toBe('')
  })
})
