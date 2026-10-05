/**
 * Bank-specific rules, empty for now: the generic parser must work alone.
 * A profile can rewrite OCR lines before parsing (merge columns, drop a
 * banner…). Add one only when a real bank layout defeats the generic rules.
 */
import type { OcrLine } from '../../ocr/types'

export interface BankProfile {
  id: string
  /** Returns true when the lines look like this bank's app. */
  detect(lines: readonly OcrLine[]): boolean
  rewrite(lines: readonly OcrLine[]): OcrLine[]
}

export const BANK_PROFILES: readonly BankProfile[] = []

export function applyBankProfile(lines: readonly OcrLine[], profiles = BANK_PROFILES): readonly OcrLine[] {
  const profile = profiles.find((p) => p.detect(lines))
  return profile ? profile.rewrite(lines) : lines
}
