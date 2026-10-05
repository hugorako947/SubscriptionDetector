/**
 * Label normalisation: uppercase, no accents, no payment prefixes, card
 * numbers, references or embedded dates, and fixes for frequent OCR confusions
 * (0/O, 1/l/I). The rn/m confusion is handled at matching time (detection/matcher.ts),
 * because blindly replacing « RN » would damage real words.
 */
import type { PaymentKind } from '../domain/types'
import { stripAccents } from './text'

/** Payment-type markers, checked on the uppercase accentless label. TODO(vérifier) with real statements. */
const KIND_PATTERNS: Array<[RegExp, PaymentKind]> = [
  [/^(VIR|VIREMENT|VIRT)\b/, 'transfer'],
  // A civility title means a person: a transfer, whose name must never be shown.
  [/^(M|MR|MME|MLLE|MONSIEUR|MADAME|MADEMOISELLE)\.? (ET (M|MR|MME)\.? )?[A-Z]{2,}/, 'transfer'],
  [/^(PRLV|PRELEVEMENT|PRELEV|PRLVT|ECH(EANCE)? PRLV)\b/, 'sepa'],
  [/\bSEPA\b(?!.*\bVIR)/, 'sepa'],
  [/^(CB|CARTE|PAIEMENT (PAR )?(CARTE|CB)|ACHAT (CB|CARTE)|FACTURE CARTE|PAIEMENT)\b/, 'card'],
]

export function detectPaymentKind(label: string): PaymentKind {
  const upper = stripAccents(label.toUpperCase()).trim()
  for (const [pattern, kind] of KIND_PATTERNS) if (pattern.test(upper)) return kind
  return 'unknown'
}

/** Removed repeatedly from the start of the label. */
const PREFIXES = [
  /^PAIEMENT PAR CARTE\b/,
  /^PAIEMENT (CB|CARTE)\b/,
  /^ACHAT (CB|CARTE)\b/,
  /^FACTURE CARTE\b/,
  /^CARTE\b/,
  /^CB\b\*?/,
  /^PRLV SEPA\b/,
  /^PRLVT?\b/,
  /^PRELEVEMENT (SEPA|EUROPEEN)\b/,
  /^PRELEVEMENT\b/,
  /^PRELEV\b/,
  /^SEPA\b/,
  /^VIR(EMENT)?( (SEPA|INST(ANTANE)?|PERMANENT|RECU|EMIS))+\b/,
  /^VIR(EMENT)?\b/,
  /^PAIEMENT\b/,
  /^DU \d{6}\b/,
]

/** Removed anywhere in the label. */
const NOISE = [
  /\b(?:X{2,}|\*{2,})?\d{4}(?:X{4,}|\*{4,})\d{4}\b/g, // 4974XXXXXXXX1234
  /\bX\d{4}\b/g, // X1234
  /\*\d{4}\b/g, // *1234
  /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, // 05/09, 05/09/2026
  /\b\d{6,8}\b/g, // 050926, 20260905
  /\b(REF|RUM|ICS|MANDAT|ID|NUM|N°)\s*[:.]?\s*\S+/g, // references
  /\b(?=(?:[A-Z]*\d){4})(?=[A-Z0-9]*[A-Z])[A-Z0-9]{9,}\b/g, // long codes: letters and at least 4 digits (not « MICROSOFT365 »)
]

/** 0→O and 1→I inside words that are mostly letters (« NETFL1X », « SP0TIFY »). */
function fixLettersInWord(word: string): string {
  const letters = (word.match(/\p{L}/gu) ?? []).length
  const digits = (word.match(/\d/g) ?? []).length
  if (digits === 0 || letters <= digits) return word
  return word.replace(/0/g, 'O').replace(/1/g, 'I')
}

export function normalizeLabel(label: string): string {
  // Lowercase « l » inside an uppercase word is usually a misread « I » (« NETFLlX »).
  const fixedL = label.replace(/\b(?=\p{Lu}*l)[\p{Lu}l]{3,}\b/gu, (word) =>
    /\p{Lu}/u.test(word) ? word.replace(/l/g, 'I') : word,
  )
  let text = stripAccents(fixedL.toUpperCase())
    .replace(/[|]/g, 'I')
    .replace(/[’'`]/g, ' ')
    .replace(/[^A-Z0-9+.&*/\s-]/g, ' ')

  for (const pattern of NOISE) text = text.replace(pattern, ' ')
  text = text.replace(/[*/]/g, ' ').replace(/\s-\s|\s-$|^-\s/g, ' ').replace(/\s+/g, ' ').trim()
  // A payment word left alone at the end once the card number is gone (« … CARTE 4974XXXX1234 »).
  text = text.replace(/(\s(CARTE|CB|SEPA))+$/, '')

  let changed = true
  while (changed) {
    changed = false
    for (const prefix of PREFIXES) {
      const next = text.replace(prefix, '').trim()
      if (next !== text && next.length > 0) {
        text = next
        changed = true
      }
    }
  }

  return text
    .split(' ')
    .map(fixLettersInWord)
    .join(' ')
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
}
