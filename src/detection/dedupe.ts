/**
 * Overlapping screenshots show the same lines twice. A line is a duplicate when
 * another screenshot has the same label, amount, date and direction. Two
 * identical lines within one screenshot are kept: they can be real (two coffees).
 */
import type { Transaction } from '../domain/types'

const keyOf = (t: Transaction) => [t.source, t.normalizedLabel, t.amountCents ?? '', t.date ?? '', t.direction].join('|')

export function dedupeTransactions(transactions: readonly Transaction[]): { kept: Transaction[]; duplicates: number } {
  const firstCapture = new Map<string, number>()
  const kept: Transaction[] = []
  let duplicates = 0
  for (const transaction of transactions) {
    const key = keyOf(transaction)
    const seenIn = firstCapture.get(key)
    if (seenIn !== undefined && seenIn !== transaction.captureIndex) {
      duplicates++
      continue
    }
    if (seenIn === undefined) firstCapture.set(key, transaction.captureIndex)
    kept.push(transaction)
  }
  return { kept, duplicates }
}
