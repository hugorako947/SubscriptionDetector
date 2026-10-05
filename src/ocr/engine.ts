/**
 * tesseract.js wrapper. A single worker, created once and reused for every
 * screenshot, read one at a time (decision H4). All engine files come from our
 * own site (public/ocr/, precached): no CDN.
 */
import { OEM, createWorker, type PSM, type Page, type Worker } from 'tesseract.js'
import type { PageSegmentationMode } from './types'

export type OcrProgress = (status: string, progress: number) => void

let workerPromise: Promise<Worker> | null = null
let progressListener: OcrProgress | null = null

/** Absolute URLs: relative ones would be resolved from the worker script's location. */
function ocrBaseUrl(): string {
  return new URL('/ocr/', window.location.origin).href
}

export function prepareOcr(): Promise<Worker> {
  if (!workerPromise) {
    const base = ocrBaseUrl()
    workerPromise = createWorker('fra', OEM.LSTM_ONLY, {
      workerPath: `${base}worker.min.js`,
      // A directory: tesseract.js 7 appends the variant it picks (relaxed SIMD, SIMD, plain).
      corePath: base,
      langPath: base,
      gzip: true,
      // Same-origin worker URL instead of blob:, so the CSP keeps worker-src 'self'.
      workerBlobURL: false,
      // The service worker already keeps the language file offline; tesseract.js's own
      // IndexedDB copy would only duplicate it next to the user's data.
      cacheMethod: 'none',
      logger: (message) => progressListener?.(message.status, message.progress),
    }).catch((error: unknown) => {
      workerPromise = null
      throw error
    })
  }
  return workerPromise
}

export async function recognize(
  image: HTMLCanvasElement,
  psm: PageSegmentationMode,
  onProgress?: OcrProgress,
): Promise<Page> {
  const worker = await prepareOcr()
  progressListener = onProgress ?? null
  try {
    await worker.setParameters({ tessedit_pageseg_mode: psm as PSM, preserve_interword_spaces: '1' })
    const { data } = await worker.recognize(image, {}, { text: true, blocks: true })
    return data
  } finally {
    progressListener = null
  }
}

/** Frees the engine's memory (several tens of MB) when leaving the screen. */
export async function terminateOcr(): Promise<void> {
  const pending = workerPromise
  workerPromise = null
  if (pending) await (await pending.catch(() => null))?.terminate()
}
