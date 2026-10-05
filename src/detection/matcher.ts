/**
 * Approximate matching of a normalised label against the dictionary
 * (classification rule 1). Exact token sequences first, then Jaro-Winkler on
 * windows of the label, with an adjustable threshold.
 */
import { SERVICES, type Service } from '../data/services'
import { jaroWinkler, levenshtein } from './fuzzy'

export const DEFAULT_MATCH_THRESHOLD = 0.92
/** Short variants (« SFR », « DAZN ») must match a whole word exactly: fuzzy matching would be reckless. */
const MIN_FUZZY_LENGTH = 5
/** Below this length, a variant glued to other letters (« NETFLIXCOM ») is not trusted. */
const MIN_GLUED_LENGTH = 7

export interface ServiceMatch {
  service: Service
  score: number
  variant: string
}

const tokenize = (text: string) => text.split(/[\s.*/-]+/).filter(Boolean)

function scoreVariant(labelTokens: string[], variant: string): number {
  const variantTokens = tokenize(variant)
  const size = variantTokens.length
  const variantText = variantTokens.join(' ')
  const variantCompact = variantTokens.join('')
  let best = 0
  for (let i = 0; i + size <= labelTokens.length; i++) {
    const window = labelTokens.slice(i, i + size)
    if (window.join(' ') === variantText) return 1
    if (variantCompact.length >= MIN_FUZZY_LENGTH) {
      const candidate = window.join(' ')
      // Jaro-Winkler alone favours shared prefixes too much (« ORANGERIE » vs « ORANGE »):
      // the number of edits is capped as well.
      const maxEdits = Math.max(1, Math.floor(variantText.length / 4))
      if (levenshtein(candidate, variantText) <= maxEdits) best = Math.max(best, jaroWinkler(candidate, variantText))
    }
  }
  if (variantCompact.length >= MIN_GLUED_LENGTH && labelTokens.some((t) => t.startsWith(variantCompact))) {
    best = Math.max(best, 0.97)
  }
  if (variantCompact.length >= MIN_FUZZY_LENGTH && labelTokens.join('') === variantCompact) best = Math.max(best, 0.99)
  return best
}

/** Best non-intermediary match, else best intermediary match, else null. */
export function matchService(
  normalizedLabel: string,
  services: readonly Service[] = SERVICES,
  threshold = DEFAULT_MATCH_THRESHOLD,
): ServiceMatch | null {
  // OCR reads a lowercase « m » as « rn »: try both spellings.
  const spellings = [normalizedLabel, normalizedLabel.replace(/RN/g, 'M')]
  let best: ServiceMatch | null = null
  let bestIntermediary: ServiceMatch | null = null
  for (const service of services) {
    for (const variant of service.variants) {
      const score = Math.max(...spellings.map((s) => scoreVariant(tokenize(s), variant)))
      if (score < threshold) continue
      const candidate = { service, score, variant }
      const isBetter = (current: ServiceMatch | null) =>
        !current || score > current.score || (score === current.score && variant.length > current.variant.length)
      if (service.intermediary) {
        if (isBetter(bestIntermediary)) bestIntermediary = candidate
      } else if (isBetter(best)) {
        best = candidate
      }
    }
  }
  return best ?? bestIntermediary
}

/** The intermediary (Apple, Google Play, PayPal) visible in the label, if any. */
export function matchIntermediary(normalizedLabel: string, services: readonly Service[] = SERVICES): Service | null {
  return matchService(normalizedLabel, services.filter((s) => s.intermediary))?.service ?? null
}
