import { describe, expect, it } from 'vitest'
import { isDateHeader, parseDate, type ReferenceDay } from './dates'

const ref: ReferenceDay = { year: 2026, month: 10, day: 5 }

describe('parseDate', () => {
  it.each([
    ['05/09', '2026-09-05', true],
    ['05/09/2026', '2026-09-05', false],
    ['05/09/25', '2025-09-05', false],
    ['5 sept.', '2026-09-05', true],
    ['5 sept', '2026-09-05', true],
    ['1er octobre', '2026-10-01', true],
    ['12 août 2025', '2025-08-12', false],
    ['12 aout', '2026-08-12', true],
    ['Lundi 5 septembre', '2026-09-05', true],
    ["Aujourd'hui", '2026-10-05', true],
    ['Aujourd’hui', '2026-10-05', true],
    ['Hier', '2026-10-04', true],
    ['05.09.2026', '2026-09-05', false],
  ] as const)('%s → %s', (text, iso, approximate) => {
    expect(parseDate(text, ref)).toEqual({ iso, approximate })
  })

  it('puts a past date without year in the previous year when needed (H11)', () => {
    expect(parseDate('28/12', { year: 2027, month: 1, day: 3 })?.iso).toBe('2026-12-28')
  })

  it('puts a renewal date in the future', () => {
    expect(parseDate('Renouvellement le 2 janvier', { year: 2026, month: 12, day: 20 }, 'future')?.iso).toBe('2027-01-02')
  })

  it('rejects impossible dates and amounts', () => {
    expect(parseDate('31/02', ref)).toBeNull()
    expect(parseDate('13.49 €', ref)).toBeNull()
    expect(parseDate('NUAGERIE 200 GO', ref)).toBeNull()
  })
})

describe('isDateHeader', () => {
  it.each(['Lundi 5 septembre', 'Mardi 2 septembre 2026', "Aujourd'hui", 'Hier', '05/09/2026', 'Jeudi 4 sept.'])(
    '%s is a header',
    (text) => expect(isDateHeader(text, ref)).toBe(true),
  )
  it.each(['CB NETFLIX 05/09', 'Prélèvement du 5 septembre', 'PRLV SEPA CINEFLUX'])('%s is not a header', (text) =>
    expect(isDateHeader(text, ref)).toBe(false),
  )
})

describe('abbreviated weekdays (« Lun. 18 mai »)', () => {
  it.each(['Lun. 18 mai', 'Sam. 16 mai >', 'Mar. 5 mai', 'Jeu. 30 avr.'])('%s is a date line', (text) => {
    expect(isDateHeader(text, ref)).toBe(true)
  })
  it('does not take « 5 mars » for a weekday', () => {
    expect(parseDate('5 mars', ref)?.iso).toBe('2026-03-05')
    expect(isDateHeader('5 mars', ref)).toBe(true)
  })
})
