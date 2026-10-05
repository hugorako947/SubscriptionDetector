import { describe, expect, it } from 'vitest'
import { findAmounts, fixDigitsInNumbers, lastAmount, withoutAmounts } from './amounts'

describe('findAmounts: formats from the specification', () => {
  it.each([
    ['-13,49 €', 1349, 'debit'],
    ['13,49 EUR', 1349, 'unknown'],
    ['− 13,49', 1349, 'debit'],
    ['–13,49 €', 1349, 'debit'],
    ['1 234,56 €', 123456, 'unknown'],
    ['1\u00a0234,56\u00a0€', 123456, 'unknown'],
    ['-1\u202f234,56 €', 123456, 'debit'],
    ['1.234,56 €', 123456, 'unknown'],
    ['13.49 €', 1349, 'unknown'],
    ['+15,00 €', 1500, 'credit'],
    ['9 €', 900, 'unknown'],
    ['-11,99 E', 1199, 'debit'], // € read as E by the OCR
  ] as const)('%s', (text, cents, direction) => {
    const [amount] = findAmounts(text)
    expect(amount?.cents).toBe(cents)
    expect(amount?.direction).toBe(direction)
  })
})

describe('findAmounts: what is not an amount', () => {
  it.each(['NUAGERIE 200 GO', '05/09', '05/09/2026', 'Mardi 2 septembre', 'CARTE X1234', 'Forfait 5G'])('%s', (text) => {
    expect(findAmounts(text)).toEqual([])
  })
})

describe('OCR digit confusions', () => {
  it('fixes O and l inside amounts only', () => {
    expect(fixDigitsInNumbers('-1O,99 €')).toBe('-10,99 €')
    expect(fixDigitsInNumbers('l3,49 €')).toBe('13,49 €')
    expect(fixDigitsInNumbers('ONDEA MUSIQUE')).toBe('ONDEA MUSIQUE')
    expect(lastAmount('PRLV ONDEA -1O,99 €')?.cents).toBe(1099)
  })
})

describe('lastAmount and withoutAmounts', () => {
  it('takes the right-most amount and keeps the label', () => {
    const line = 'CB SUPERMARCHE 12,00 € -38,74 €'
    expect(lastAmount(line)?.cents).toBe(3874)
    expect(withoutAmounts('PRLV SEPA CINEFLUX -11,99 €')).toBe('PRLV SEPA CINEFLUX')
  })
})
