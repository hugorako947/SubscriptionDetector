import { describe, expect, it } from 'vitest'
import { groupIntoLines, wordsFromBlocks } from './lines'
import type { OcrWord } from './types'

const w = (text: string, x0: number, y0: number, x1: number, y1: number, confidence = 90): OcrWord => ({
  text,
  confidence,
  bbox: { x0, y0, x1, y1 },
})

// Fictional bank list: label on the left, amount right-aligned, slightly
// different baselines (amount in bold is a little taller).
const statement: OcrWord[] = [
  w('−11,99', 880, 98, 990, 132),
  w('€', 1000, 100, 1020, 130),
  w('PRLV', 40, 100, 120, 130),
  w('SEPA', 132, 100, 210, 130),
  w('CINÉFLUX', 222, 101, 380, 131),
  w('02/09', 40, 40, 120, 66, 80),
  w('CB', 40, 170, 80, 200),
  w('BOULANGERIE', 92, 170, 300, 200),
  w('−4,20', 900, 171, 990, 199),
  w('€', 1000, 171, 1020, 199),
]

describe('groupIntoLines', () => {
  const lines = groupIntoLines(statement)

  it('rebuilds one line per visual row, top to bottom', () => {
    expect(lines.map((l) => l.text)).toEqual(['02/09', 'PRLV SEPA CINÉFLUX −11,99 €', 'CB BOULANGERIE −4,20 €'])
  })

  it('keeps label and amount in separate segments', () => {
    expect(lines[1]!.segments).toEqual(['PRLV SEPA CINÉFLUX', '−11,99 €'])
    expect(lines[2]!.segments).toEqual(['CB BOULANGERIE', '−4,20 €'])
  })

  it('computes the bounding box and a length-weighted confidence', () => {
    expect(lines[1]!.bbox).toEqual({ x0: 40, y0: 98, x1: 1020, y1: 132 })
    expect(lines[0]!.confidence).toBe(80)
  })

  it('does not merge two close but distinct rows', () => {
    const tight = groupIntoLines([w('Ligne', 0, 0, 100, 20), w('suivante', 0, 24, 100, 44)])
    expect(tight).toHaveLength(2)
  })

  it('ignores empty words', () => {
    expect(groupIntoLines([w(' ', 0, 0, 10, 10), w('Texte', 0, 0, 50, 10)])).toHaveLength(1)
  })
})

describe('wordsFromBlocks', () => {
  it('flattens the tesseract.js block tree', () => {
    const blocks = [
      {
        paragraphs: [
          { lines: [{ words: [{ text: 'A', confidence: 95, bbox: { x0: 0, y0: 0, x1: 5, y1: 5 } }] }] },
          { lines: [{ words: [{ text: 'B', confidence: 85, bbox: { x0: 0, y0: 9, x1: 5, y1: 14 } }] }] },
        ],
      },
    ]
    expect(wordsFromBlocks(blocks).map((x) => x.text)).toEqual(['A', 'B'])
    expect(wordsFromBlocks(null)).toEqual([])
  })
})
