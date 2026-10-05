/** Rectangle in pixels of the preprocessed image (origin top-left). */
export interface BBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface OcrWord {
  text: string
  /** Tesseract confidence, 0–100. */
  confidence: number
  bbox: BBox
}

/** A visual line rebuilt from word positions (decision H7). */
export interface OcrLine {
  /** Words joined by single spaces, left to right. */
  text: string
  /**
   * Groups of words separated by a wide horizontal gap, e.g.
   * ["PRLV SEPA CINÉFLUX", "−11,99 €"]: label and amount stay apart.
   */
  segments: string[]
  words: OcrWord[]
  bbox: BBox
  /** Mean word confidence weighted by text length, 0–100. */
  confidence: number
}

export type PageSegmentationMode = '3' | '4' | '6' | '11'

export interface PreprocessOptions {
  /** 'auto' doubles small images only (decision H6). */
  scale: 'auto' | 1 | 2
  /** 'auto' inverts dark-mode screenshots (light text on dark background). */
  invert: 'auto' | 'on' | 'off'
  /** Spreads grey levels so pale grey text gets darker. */
  stretchContrast: boolean
  /** Black and white with Otsu's threshold. Off by default: the LSTM model works on grey levels. */
  binarize: boolean
}

export const DEFAULT_PREPROCESS: PreprocessOptions = {
  scale: 'auto',
  invert: 'auto',
  stretchContrast: true,
  binarize: false,
}

export interface PreprocessReport {
  scale: number
  inverted: boolean
  threshold: number | null
  width: number
  height: number
}

export interface OcrPageResult {
  lines: OcrLine[]
  rawText: string
  preprocess: PreprocessReport
  timingsMs: { preprocess: number; recognize: number }
}
