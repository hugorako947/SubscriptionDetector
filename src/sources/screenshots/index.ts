/** Screenshot adapters: OCR lines → transactions, one adapter per kind of page. */
import type { SourceKind, Transaction } from '../../domain/types'
import type { OcrLine } from '../../ocr/types'
import { parseBankList } from '../../parsing/layout'
import { normalizeLabel } from '../../parsing/normalize'
import { applyBankProfile } from '../../parsing/profiles'
import { parseStoreList } from '../../parsing/store'
import type { SourceAdapter, SourceContext } from '../types'

function bankAdapter(kind: 'screenshot_bank_debits' | 'screenshot_card_history'): SourceAdapter<readonly OcrLine[]> {
  return {
    kind,
    toTransactions(lines, { captureIndex, referenceDay }: SourceContext): Transaction[] {
      return parseBankList(applyBankProfile(lines), referenceDay).map((entry, index) => ({
        id: `${kind}:${captureIndex}:${index}`,
        // Transfers can contain a person's name: their text is never kept (rule 4).
        rawText: entry.kind === 'transfer' ? '' : entry.rawText,
        label: entry.kind === 'transfer' ? '' : entry.label,
        normalizedLabel: entry.kind === 'transfer' ? '' : normalizeLabel(entry.label),
        ...(entry.amount ? { amountCents: entry.amount.cents } : {}),
        currency: 'EUR',
        ...(entry.date ? { date: entry.date.iso, dateIsApproximate: entry.date.approximate } : {}),
        direction: entry.direction,
        // The debits page lists creditors that take SEPA direct debits.
        kind: entry.kind === 'unknown' && kind === 'screenshot_bank_debits' ? 'sepa' : entry.kind,
        source: kind,
        captureIndex,
        ocrConfidence: entry.confidence,
      }))
    },
  }
}

export const bankDebitsAdapter = bankAdapter('screenshot_bank_debits')
export const cardHistoryAdapter = bankAdapter('screenshot_card_history')

export const storeAdapter: SourceAdapter<readonly OcrLine[]> = {
  kind: 'screenshot_store',
  toTransactions(lines, { captureIndex, referenceDay }) {
    return parseStoreList(lines, referenceDay).map((entry, index) => ({
      id: `screenshot_store:${captureIndex}:${index}`,
      rawText: entry.rawText,
      label: entry.name,
      normalizedLabel: normalizeLabel(entry.name),
      ...(entry.price ? { amountCents: entry.price.cents } : {}),
      currency: 'EUR',
      direction: 'debit',
      kind: 'store',
      source: 'screenshot_store',
      captureIndex,
      ocrConfidence: entry.confidence,
      periodHint: entry.period,
      ...(entry.renewalDate ? { renewalDate: entry.renewalDate } : {}),
      ...(entry.trialEndsAt ? { trialEndsAt: entry.trialEndsAt } : {}),
    }))
  },
}

export const SCREENSHOT_ADAPTERS: Record<
  'screenshot_bank_debits' | 'screenshot_card_history' | 'screenshot_store',
  SourceAdapter<readonly OcrLine[]>
> = {
  screenshot_bank_debits: bankDebitsAdapter,
  screenshot_card_history: cardHistoryAdapter,
  screenshot_store: storeAdapter,
}

export function screenshotToTransactions(
  kind: Extract<SourceKind, `screenshot_${string}`>,
  lines: readonly OcrLine[],
  context: SourceContext,
): Transaction[] {
  return SCREENSHOT_ADAPTERS[kind].toTransactions(lines, context)
}
