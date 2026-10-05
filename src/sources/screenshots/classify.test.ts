import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { OcrLine } from '../../ocr/types'
import { classifyScreenshot } from './classify'

const load = (name: string): OcrLine[] =>
  JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/ocr', `${name}.json`), 'utf8')) as OcrLine[]

describe('classifyScreenshot (real OCR output of the fictional screenshots)', () => {
  it.each([
    ['store-fictif', 'screenshot_store'],
    ['prelevements-fictifs', 'screenshot_bank_debits'],
    ['banque-fictive-clair', 'screenshot_card_history'],
    ['banque-fictive-sombre', 'screenshot_card_history'],
  ] as const)('%s → %s', (name, kind) => {
    expect(classifyScreenshot(load(name))).toBe(kind)
  })
})
