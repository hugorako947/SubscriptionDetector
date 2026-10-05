/**
 * Copies the OCR engine files from node_modules into public/ocr/ so they are
 * served by our own site and precached (no CDN, decision H5):
 * - the tesseract.js worker,
 * - the three LSTM-only core variants: tesseract.js 7 picks one at runtime
 *   depending on the browser (relaxed SIMD, SIMD, or neither). Its docs still
 *   mention 4 files; the code of version 7.0.0 is the reference here,
 * - French language data (4.0.0_best_int, the LSTM model).
 * public/ocr/ is generated and not versioned (.gitignore).
 */
import { copyFileSync, mkdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import type { Plugin } from 'vite'

const require = createRequire(import.meta.url)
const tesseractDir = dirname(require.resolve('tesseract.js/package.json'))
const coreDir = dirname(require.resolve('tesseract.js-core/package.json', { paths: [tesseractDir] }))
const fraDir = dirname(require.resolve('@tesseract.js-data/fra/package.json'))

export const OCR_PUBLIC_DIR = 'public/ocr'

export const OCR_FILES: ReadonlyArray<{ from: string; to: string }> = [
  { from: join(tesseractDir, 'dist', 'worker.min.js'), to: 'worker.min.js' },
  { from: join(coreDir, 'tesseract-core-lstm.wasm.js'), to: 'tesseract-core-lstm.wasm.js' },
  { from: join(coreDir, 'tesseract-core-simd-lstm.wasm.js'), to: 'tesseract-core-simd-lstm.wasm.js' },
  { from: join(coreDir, 'tesseract-core-relaxedsimd-lstm.wasm.js'), to: 'tesseract-core-relaxedsimd-lstm.wasm.js' },
  { from: join(fraDir, '4.0.0_best_int', 'fra.traineddata.gz'), to: 'fra.traineddata.gz' },
]

export function copyOcrAssets(rootDir: string): void {
  const target = join(rootDir, OCR_PUBLIC_DIR)
  mkdirSync(target, { recursive: true })
  for (const { from, to } of OCR_FILES) {
    const destination = join(target, to)
    let upToDate = false
    try {
      upToDate = statSync(destination).size === statSync(from).size
    } catch {
      upToDate = false
    }
    if (!upToDate) copyFileSync(from, destination)
  }
}

/** Runs before Vite reads public/, for dev, build and preview alike. */
export function ocrAssets(): Plugin {
  return {
    name: 'ocr-assets',
    configResolved(config) {
      copyOcrAssets(config.root)
    },
  }
}
