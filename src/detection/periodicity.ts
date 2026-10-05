/**
 * Rule 3: same merchant, similar amount, at regular intervals. Needs at least
 * two dated occurrences; every gap must fit the same period.
 */
import type { Period } from '../domain/types'

/** Accepted gaps in days for each period (tolerance around 7, 30, 91 and 365). */
export const PERIOD_GAPS: Array<[Exclude<Period, 'unknown'>, number, number]> = [
  ['weekly', 5, 9],
  ['monthly', 26, 35],
  ['quarterly', 84, 98],
  ['yearly', 350, 380],
]

/** Amounts are "stable" within 10 % or 1 €. */
export function isStableAmount(cents: number[]): boolean {
  if (cents.length < 2) return true
  const min = Math.min(...cents)
  const max = Math.max(...cents)
  return max - min <= Math.max(100, min * 0.1)
}

const dayNumber = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86_400_000

export interface PeriodicityResult {
  period: Exclude<Period, 'unknown'>
  occurrences: number
}

export function detectPeriodicity(occurrences: Array<{ date?: string; amountCents?: number }>): PeriodicityResult | null {
  const dated = occurrences.filter((o): o is { date: string; amountCents?: number } => Boolean(o.date))
  const days = [...new Set(dated.map((o) => dayNumber(o.date)))].sort((a, b) => a - b)
  if (days.length < 2) return null
  const amounts = dated.map((o) => o.amountCents).filter((c): c is number => c !== undefined)
  if (!isStableAmount(amounts)) return null
  let period: PeriodicityResult['period'] | null = null
  for (let i = 1; i < days.length; i++) {
    const gap = days[i]! - days[i - 1]!
    const match = PERIOD_GAPS.find(([, min, max]) => gap >= min && gap <= max)?.[0]
    if (!match || (period && match !== period)) return null
    period = match
  }
  return period ? { period, occurrences: days.length } : null
}

export function monthlyEquivalent(cents: number, period: Period): number | undefined {
  switch (period) {
    case 'weekly':
      return Math.round((cents * 52) / 12)
    case 'monthly':
      return cents
    case 'quarterly':
      return Math.round(cents / 3)
    case 'yearly':
      return Math.round(cents / 12)
    default:
      return undefined
  }
}

const PERIOD_DAYS: Record<Exclude<Period, 'unknown'>, number> = { weekly: 7, monthly: 30, quarterly: 91, yearly: 365 }

/** Estimated next renewal: last payment + one period (months added by calendar when possible). */
export function nextRenewalFrom(lastDate: string, period: Period): string | undefined {
  if (period === 'unknown') return undefined
  const [y, m, d] = [Number(lastDate.slice(0, 4)), Number(lastDate.slice(5, 7)), Number(lastDate.slice(8, 10))]
  const months = period === 'monthly' ? 1 : period === 'quarterly' ? 3 : period === 'yearly' ? 12 : 0
  const date = months
    ? new Date(Date.UTC(y, m - 1 + months, Math.min(d, new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate())))
    : new Date(Date.UTC(y, m - 1, d + PERIOD_DAYS[period]))
  return date.toISOString().slice(0, 10)
}
