/**
 * Turns OCR lines of a bank list (operations or debits page) into entries:
 * label + amount + date + payment kind. Independent of any bank: it relies on
 * positions only. Bank-specific tweaks can be added in parsing/profiles/.
 *
 * Typical layout handled: a date header, then rows made of a label line, an
 * optional smaller sub-label (« Prélèvement », « Carte ») and an amount on the
 * right, often vertically centred between the label and the sub-label.
 */
import type { Direction, PaymentKind } from '../domain/types'
import type { OcrLine } from '../ocr/types'
import { findAmounts, lastAmount, withoutAmounts, type ParsedAmount } from './amounts'
import { isDateHeader, parseDate, type ReferenceDay } from './dates'
import { detectPaymentKind } from './normalize'
import { hasLetters, stripAccents } from './text'

export interface ListEntry {
  label: string
  /** Text as read: label, sub-label and amount. */
  rawText: string
  amount?: ParsedAmount
  date?: { iso: string; approximate: boolean }
  kind: PaymentKind
  direction: Direction
  confidence: number
}

/** Words of very low confidence and 1–2 characters are OCR artefacts (« RL » on the fictional fixture). */
const ARTEFACT_CONFIDENCE = 40

/**
 * A sub-label is a line made only of a payment-type word (« Prélèvement »,
 * « Carte », « Virement reçu »), possibly with a date. Label lines start with
 * similar words (« PRLV SEPA CINEFLUX »), hence the whole-line match.
 * TODO(vérifier) the wording of real bank apps.
 */
const SUBLABEL =
  /^(PRELEVEMENT( SEPA)?|PRLV( SEPA)?|CARTE( BANCAIRE)?|CB|PAIEMENT( PAR CARTE| CB| CARTE)?|VIREMENT( RECU| EMIS| SEPA| INSTANTANE)?|RETRAIT( DAB)?|DEBIT DIFFERE|ACHAT|AVOIR|MANDAT( ACTIF| SEPA)?)$/
const CREDIT_WORDS = /\b(VIREMENT RECU|VIR RECU|RECU|REMBOURSEMENT|AVOIR|REMISE)\b/
/** Lines of the app's own chrome, not operations. TODO(vérifier) with real bank apps. */
const CHROME = /\b(SOLDE|A VENIR|EN COURS|ENCOURS)\b/
const PAGE_TITLE =
  /^(MES |VOS )?(OPERATIONS|PRELEVEMENTS|CREANCIERS( AUTORISES)?|MANDATS( SEPA)?|HISTORIQUE|DERNIERES OPERATIONS|COMPTES?|ACTIVITE)$/
/** Lines this many times taller than the median are page titles. */
const TITLE_HEIGHT_RATIO = 1.8

type LineType = 'header' | 'amount' | 'sublabel' | 'label' | 'ignore'

interface Classified {
  line: OcrLine
  text: string
  type: LineType
  /** Median word height: the line box is taller when an offset amount joins it. */
  height: number
  /** Sub-label guessed from its smaller size only (no payment word). */
  bySizeOnly?: boolean
}

function wordHeight(line: OcrLine): number {
  const heights = line.words.map((w) => w.bbox.y1 - w.bbox.y0).sort((a, b) => a - b)
  return heights[Math.floor(heights.length / 2)] ?? line.bbox.y1 - line.bbox.y0
}

function cleanText(line: OcrLine): string {
  return line.words
    .filter((w) => !(w.confidence < ARTEFACT_CONFIDENCE && w.text.replace(/\W/g, '').length <= 2))
    .map((w) => w.text)
    .join(' ')
    .trim()
}

function classify(line: OcrLine, ref: ReferenceDay, previousLabel: Classified | null, medianHeight: number): Classified {
  const text = cleanText(line)
  const height = wordHeight(line)
  const upper = stripAccents(text.toUpperCase())
  const base = { line, text, height }
  if (!text) return { ...base, type: 'ignore' }
  if (isDateHeader(text, ref)) return { ...base, type: 'header' }
  if (CHROME.test(upper) || PAGE_TITLE.test(upper) || height > TITLE_HEIGHT_RATIO * medianHeight) {
    return { ...base, type: 'ignore' }
  }
  const amounts = findAmounts(text)
  const rest = withoutAmounts(text)
  if (amounts.length && !hasLetters(rest)) return { ...base, type: 'amount' }
  if (!hasLetters(text)) return { ...base, type: 'ignore' }
  const words = rest.split(' ').length
  const smaller = previousLabel !== null && height < 0.8 * previousLabel.height
  const withoutDate = upper.replace(/[·•|,-]/g, ' ').replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, ' ').replace(/\s+/g, ' ').trim()
  if (!amounts.length && words <= 4 && SUBLABEL.test(withoutDate)) return { ...base, type: 'sublabel' }
  if (!amounts.length && words <= 4 && smaller) return { ...base, type: 'sublabel', bySizeOnly: true }
  return { ...base, type: 'label' }
}

interface Block {
  label: Classified[]
  sublabels: Classified[]
  amount?: { parsed: ParsedAmount; line: Classified }
  date?: { iso: string; approximate: boolean }
}

const top = (b: Block) => b.label[0]!.line.bbox.y0
const bottom = (b: Block) => Math.max(...[...b.label, ...b.sublabels].map((c) => c.line.bbox.y1))
const labelHeight = (b: Block) => b.label[0]!.height

export function parseBankList(lines: readonly OcrLine[], ref: ReferenceDay): ListEntry[] {
  const sorted = [...lines].sort((a, b) => a.bbox.y0 - b.bbox.y0)
  const heights = sorted.map(wordHeight).sort((a, b) => a - b)
  const medianHeight = heights[Math.floor(heights.length / 2)] ?? 0
  const blocks: Block[] = []
  const looseAmounts: Classified[] = []
  let currentDate: Block['date']
  let previousLabel: Classified | null = null

  for (const line of sorted) {
    let item = classify(line, ref, previousLabel, medianHeight)
    const block = blocks[blocks.length - 1]
    if (item.type === 'sublabel' && !(block && item.line.bbox.y0 - bottom(block) < labelHeight(block))) {
      // Too far from any row: it is a row of its own (« VIREMENT RECU », a short label in a smaller font).
      item = { ...item, type: 'label' }
    }
    switch (item.type) {
      case 'header': {
        const date = parseDate(item.text, ref) ?? undefined
        // Some apps (Caisse d'Épargne, for one) print the date under each label, not above
        // a group: a date line right below a row belongs to that row.
        if (block && date && item.line.bbox.y0 - bottom(block) < labelHeight(block)) {
          block.date = date
          block.sublabels.push(item)
        } else {
          currentDate = date
          previousLabel = null
        }
        break
      }
      case 'amount':
        looseAmounts.push(item)
        break
      case 'sublabel':
        block!.sublabels.push(item)
        {
          const inlineDate = parseDate(item.text, ref)
          if (inlineDate) block!.date = inlineDate
        }
        break
      case 'label': {
        const gap = block ? item.line.bbox.y0 - bottom(block) : Infinity
        // A label continued on the next line: close, no amount on the first line, nothing in between.
        if (block && !block.amount && block.sublabels.length === 0 && gap < 0.8 * labelHeight(block)) {
          block.label.push(item)
          const amount = lastAmount(item.text)
          if (amount) block.amount = { parsed: amount, line: item }
        } else {
          const amount = lastAmount(item.text)
          blocks.push({
            label: [item],
            sublabels: [],
            date: parseDate(withoutAmounts(item.text), ref) ?? currentDate,
            ...(amount ? { amount: { parsed: amount, line: item } } : {}),
          })
        }
        previousLabel = item
        break
      }
      case 'ignore':
        break
    }
  }

  // Each amount alone on its line goes to the closest row that has none.
  for (const item of looseAmounts) {
    const center = (item.line.bbox.y0 + item.line.bbox.y1) / 2
    let best: Block | null = null
    let bestDistance = Infinity
    for (const block of blocks) {
      if (block.amount) continue
      const distance = center >= top(block) && center <= bottom(block) ? 0 : Math.min(Math.abs(center - top(block)), Math.abs(center - bottom(block)))
      if (distance < bestDistance) {
        best = block
        bestDistance = distance
      }
    }
    const parsed = lastAmount(item.text)
    if (best && parsed && bestDistance <= labelHeight(best)) best.amount = { parsed, line: item }
  }

  return blocks.map((block) => {
    const labelText = block.label.map((c) => withoutAmounts(c.text)).join(' ')
    const subText = block.sublabels.map((c) => c.text).join(' ')
    const upperAll = stripAccents(`${labelText} ${subText}`.toUpperCase())
    const kindFromLabel = detectPaymentKind(labelText)
    const kind = kindFromLabel !== 'unknown' ? kindFromLabel : detectPaymentKind(subText)
    const amount = block.amount?.parsed
    const direction: Direction =
      amount?.direction && amount.direction !== 'unknown'
        ? amount.direction
        : CREDIT_WORDS.test(upperAll)
          ? 'credit'
          : 'unknown'
    const members = [...block.label, ...block.sublabels, ...(block.amount ? [block.amount.line] : [])]
    const confidence = members.reduce((sum, c) => sum + c.line.confidence, 0) / members.length
    return {
      label: labelText,
      rawText: [labelText, subText, amount?.text].filter(Boolean).join(' · '),
      ...(amount ? { amount } : {}),
      ...(block.date ? { date: block.date } : {}),
      kind,
      direction,
      confidence: Math.round(confidence),
    }
  })
}
