import { existsSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { OCR_FILES } from './ocr-assets.ts'

describe('OCR assets', () => {
  it('finds every engine file in node_modules', () => {
    for (const { from } of OCR_FILES) expect(existsSync(from), from).toBe(true)
  })

  it('ships only the LSTM-only core variants', () => {
    const cores = OCR_FILES.filter((f) => f.to.startsWith('tesseract-core'))
    expect(cores.map((f) => f.to).sort()).toEqual([
      'tesseract-core-lstm.wasm.js',
      'tesseract-core-relaxedsimd-lstm.wasm.js',
      'tesseract-core-simd-lstm.wasm.js',
    ])
  })

  it('keeps every file under the precache size limit set in vite.config.ts (5 MiB)', () => {
    for (const { from } of OCR_FILES) expect(statSync(from).size).toBeLessThan(5 * 1024 * 1024)
  })
})
