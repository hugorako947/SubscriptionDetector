import { describe, expect, it } from 'vitest'
import { jaroWinkler, levenshtein } from './fuzzy'

describe('levenshtein', () => {
  it('counts edits', () => {
    expect(levenshtein('NETFLIX', 'NETFLIX')).toBe(0)
    expect(levenshtein('SPOTIFY', 'SPOTIFV')).toBe(1)
    expect(levenshtein('', 'ABC')).toBe(3)
    expect(levenshtein('KITTEN', 'SITTING')).toBe(3)
  })
})

describe('jaroWinkler', () => {
  it('matches the reference value and rewards close spellings', () => {
    expect(jaroWinkler('MARTHA', 'MARHTA')).toBeCloseTo(0.961, 3)
    expect(jaroWinkler('SPOTIFY', 'SPOTIFV')).toBeGreaterThan(0.92)
    expect(jaroWinkler('DEEZER', 'ONDEA')).toBeLessThan(0.7)
    expect(jaroWinkler('ABC', 'ABC')).toBe(1)
    expect(jaroWinkler('', 'ABC')).toBe(0)
  })
})
