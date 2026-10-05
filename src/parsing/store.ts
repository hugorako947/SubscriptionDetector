/**
 * Subscriptions page of the App Store or Google Play: app name, price and
 * renewal date. TODO(vérifier) the exact wording of both stores in French on
 * real devices (« Renouvellement le… », « Prochain paiement… », section names).
 */
import type { Period } from '../domain/types'
import type { OcrLine } from '../ocr/types'
import { lastAmount, type ParsedAmount } from './amounts'
import { parseDate, type ReferenceDay } from './dates'
import { hasLetters, stripAccents } from './text'

export interface StoreEntry {
  name: string
  rawText: string
  price?: ParsedAmount
  period: Period
  renewalDate?: string
  trialEndsAt?: string
  confidence: number
}

const RENEWAL = /\b(RENOUVEL\w*|PROCHAIN\w*|FACTUR\w*|SE RENOUVELLE|DEBITE)\b/
const TRIAL = /\b(ESSAI GRATUIT|GRATUIT JUSQU|PERIODE D ESSAI|ESSAI)\b/
/** Section titles and page chrome, not app names. */
const TITLES = /^(ABONNEMENTS?|ACTIFS?|ACTIVES?|GERER|MODIFIER|COMPTE|PAIEMENTS? ET ABONNEMENTS)$/
/** Everything below these titles is no longer active. */
const INACTIVE_SECTION = /^(EXPIRES?|EXPIREES?|INACTIFS?|ANNULES?|ANNULEES?)$/

export function periodFromText(upper: string): Period {
  if (/(\/|PAR|CHAQUE)\s*(1\s*)?(MOIS)\b|\bMENSUEL/.test(upper)) return 'monthly'
  if (/(\/|PAR|CHAQUE)\s*(1\s*)?(AN|ANNEE)\b|\bANNUEL/.test(upper)) return 'yearly'
  if (/(\/|PAR|CHAQUE)\s*(1\s*)?SEMAINE\b|\bHEBDOMADAIRE/.test(upper)) return 'weekly'
  if (/(\/|PAR|CHAQUE)\s*(1\s*)?TRIMESTRE\b|\bTRIMESTRIEL/.test(upper)) return 'quarterly'
  return 'unknown'
}

function isDetail(upper: string, text: string): boolean {
  return Boolean(lastAmount(text)) || RENEWAL.test(upper) || TRIAL.test(upper) || periodFromText(upper) !== 'unknown'
}

export function parseStoreList(lines: readonly OcrLine[], ref: ReferenceDay): StoreEntry[] {
  const entries: Array<StoreEntry & { lines: number; confidenceSum: number }> = []
  for (const line of [...lines].sort((a, b) => a.bbox.y0 - b.bbox.y0)) {
    const text = line.text.trim()
    const upper = stripAccents(text.toUpperCase()).replace(/[’']/g, ' ')
    if (!text) continue
    if (INACTIVE_SECTION.test(upper)) break
    if (TITLES.test(upper)) continue
    const current = entries[entries.length - 1]
    if (current && isDetail(upper, text)) {
      const price = lastAmount(text)
      if (price && !current.price) current.price = price
      const period = periodFromText(upper)
      if (period !== 'unknown') current.period = period
      if (TRIAL.test(upper)) {
        const date = parseDate(text, ref, 'future')
        if (date) current.trialEndsAt = date.iso
      } else if (RENEWAL.test(upper)) {
        const date = parseDate(text, ref, 'future')
        if (date) current.renewalDate = date.iso
      }
      current.rawText += ` · ${text}`
      current.lines++
      current.confidenceSum += line.confidence
    } else if (hasLetters(text) && !isDetail(upper, text)) {
      entries.push({ name: text, rawText: text, period: 'unknown', confidence: 0, lines: 1, confidenceSum: line.confidence })
    }
  }
  return entries.map(({ lines: count, confidenceSum, ...entry }) => ({
    ...entry,
    confidence: Math.round(confidenceSum / count),
  }))
}
