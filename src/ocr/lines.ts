/**
 * Rebuilds visual lines from word boxes (decision H7). Tesseract's own line
 * split tends to separate a label on the left from its amount on the right;
 * grouping by vertical position keeps them on the same line.
 */
import type { BBox, OcrLine, OcrWord } from './types'

const height = (b: BBox) => b.y1 - b.y0
const centerY = (b: BBox) => (b.y0 + b.y1) / 2


function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

function unionBox(words: OcrWord[]): BBox {
  return {
    x0: Math.min(...words.map((w) => w.bbox.x0)),
    y0: Math.min(...words.map((w) => w.bbox.y0)),
    x1: Math.max(...words.map((w) => w.bbox.x1)),
    y1: Math.max(...words.map((w) => w.bbox.y1)),
  }
}

/** A gap wider than this many line heights starts a new segment (label | amount). */
export const SEGMENT_GAP_IN_LINE_HEIGHTS = 1.5

/**
 * A word joins a line when their vertical ranges overlap by at least this
 * share of the smaller height. Overlap (not centre distance) is used because a
 * lowercase word without ascenders ("courant") has a much shorter box than a
 * capitalised one ("Compte") on the same line.
 */
export const MIN_VERTICAL_OVERLAP = 0.5

interface Row {
  words: OcrWord[]
  y0: number
  y1: number
}

function overlapRatio(a: { y0: number; y1: number }, b: { y0: number; y1: number }): number {
  const overlap = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
  return overlap <= 0 ? 0 : overlap / Math.min(a.y1 - a.y0, b.y1 - b.y0)
}

export function groupIntoLines(input: readonly OcrWord[]): OcrLine[] {
  const words = input
    .filter((w) => w.text.trim() !== '' && height(w.bbox) > 0)
    .sort((a, b) => centerY(a.bbox) - centerY(b.bbox))

  const rows: Row[] = []
  for (const word of words) {
    let best: Row | null = null
    let bestRatio = MIN_VERTICAL_OVERLAP
    for (const row of rows) {
      const ratio = overlapRatio(row, word.bbox)
      if (ratio >= bestRatio) {
        best = row
        bestRatio = ratio
      }
    }
    if (best) {
      best.words.push(word)
      best.y0 = Math.min(best.y0, word.bbox.y0)
      best.y1 = Math.max(best.y1, word.bbox.y1)
    } else {
      rows.push({ words: [word], y0: word.bbox.y0, y1: word.bbox.y1 })
    }
  }

  return rows
    .map((row) => toLine(row))
    .sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0)
}

function toLine(row: Row): OcrLine {
  const words = [...row.words].sort((a, b) => a.bbox.x0 - b.bbox.x0)
  const maxGap = SEGMENT_GAP_IN_LINE_HEIGHTS * median(words.map((w) => height(w.bbox)))
  const segments: string[][] = [[]]
  words.forEach((word, index) => {
    const previous = words[index - 1]
    if (previous && word.bbox.x0 - previous.bbox.x1 > maxGap) segments.push([])
    segments[segments.length - 1]!.push(word.text)
  })
  const totalLength = words.reduce((sum, w) => sum + w.text.length, 0)
  const confidence = words.reduce((sum, w) => sum + w.confidence * w.text.length, 0) / totalLength
  return {
    text: words.map((w) => w.text).join(' '),
    segments: segments.map((segment) => segment.join(' ')),
    words,
    bbox: unionBox(words),
    confidence: Math.round(confidence * 10) / 10,
  }
}

/** Minimal shape of tesseract.js `blocks` output that we rely on. */
export interface TesseractBlockLike {
  paragraphs: Array<{ lines: Array<{ words: Array<{ text: string; confidence: number; bbox: BBox }> }> }>
}

export function wordsFromBlocks(blocks: readonly TesseractBlockLike[] | null | undefined): OcrWord[] {
  if (!blocks) return []
  return blocks.flatMap((block) =>
    block.paragraphs.flatMap((paragraph) =>
      paragraph.lines.flatMap((line) =>
        line.words.map((word) => ({
          text: word.text,
          confidence: word.confidence,
          bbox: { x0: word.bbox.x0, y0: word.bbox.y0, x1: word.bbox.x1, y1: word.bbox.y1 },
        })),
      ),
    ),
  )
}
