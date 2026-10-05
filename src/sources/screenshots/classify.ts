/**
 * Guesses which page a screenshot shows, so the user never has to say it:
 * store subscriptions, bank debits page (creditors, often without amounts) or
 * card / account history. TODO(vérifier) on real screenshots of several banks.
 */
import type { OcrLine } from '../../ocr/types'
import { findAmounts } from '../../parsing/amounts'
import { stripAccents } from '../../parsing/text'

export type ScreenshotKind = 'screenshot_store' | 'screenshot_bank_debits' | 'screenshot_card_history'

const STORE = /\b(RENOUVEL\w*|ESSAI GRATUIT|\/ ?MOIS|\/ ?AN\b|PAR MOIS|PROCHAIN PAIEMENT|EXPIRE\w*)\b|^ABONNEMENTS$/
const DEBITS = /\b(MANDATS?|CREANCIERS?|PRELEVEMENTS? AUTORISES?)\b|^(MES )?PRELEVEMENTS$/

export function classifyScreenshot(lines: readonly OcrLine[]): ScreenshotKind {
  const texts = lines.map((l) => stripAccents(l.text.toUpperCase()).trim()).filter(Boolean)
  const storeScore = texts.filter((t) => STORE.test(t)).length
  const debitsScore = texts.filter((t) => DEBITS.test(t)).length
  const withAmount = texts.filter((t) => findAmounts(t).length > 0).length
  const signedAmounts = texts.filter((t) => findAmounts(t).some((a) => a.direction !== 'unknown')).length
  if (storeScore >= 2 && signedAmounts <= 1) return 'screenshot_store'
  if (debitsScore >= 1 && withAmount <= texts.length * 0.2) return 'screenshot_bank_debits'
  return 'screenshot_card_history'
}
