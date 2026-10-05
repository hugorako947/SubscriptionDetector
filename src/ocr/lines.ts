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

interface Row {
  words: OcrWord[]
  center: number
  height: number
}

export function groupIntoLines(input: readonly OcrWord[]): OcrLine[] {
  const words = input
    .filter((w) => w.text.trim() !== '' && height(w.bbox) > 0)
    .sort((a, b) => centerY(a.bbox) - centerY(b.bbox))

  const rows: Row[] = []
  for (const word of words) {
    const wordCenter = centerY(word.bbox)
    const wordHeight = height(word.bbox)
    let best: Row | null = null
    let bestDistance = Infinity
    for (const row of rows) {
      const distance = Math.abs(row.center - wordCenter)
      const tolerance = 0.5 * Math.min(row.height, wordHeight)
      if (distance <= tolerance && distance < bestDistance) {
        best = row
        bestDistance = distance
      }
    }
    if (best) {
      best.words.push(word)
      best.center = best.words.reduce((sum, w) => sum + centerY(w.bbox), 0) / best.words.length
      best.height = median(best.words.map((w) => height(w.bbox)))
    } else {
      rows.push({ words: [word], center: wordCenter, height: wordHeight })
    }
  }

  return rows
    .map((row) => toLine(row))
    .sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0)
}

function toLine(row: Row): OcrLine {
  const words = [...row.words].sort((a, b) => a.bbox.x0 - b.bbox.x0)
  const maxGap = SEGMENT_GAP_IN_LINE_HEIGHTS * row.height
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
