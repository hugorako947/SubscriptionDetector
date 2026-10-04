import { yearlyFromMonthly } from '../../domain/money'
/**
 * Fictional data for the result preview (home pages). Invented service names
 * and amounts: they describe no real offer or price.
 */
export interface PreviewLine {
  date: string
  label: string
  /** Signed amount in cents: negative = debit. */
  cents: number
  isSubscription: boolean
}

export const PREVIEW_LINES: readonly PreviewLine[] = [
  { date: '02/09', label: 'PRLV SEPA CINÉFLUX', cents: -1199, isSubscription: true },
  { date: '03/09', label: 'CB BOULANGERIE', cents: -420, isSubscription: false },
  { date: '05/09', label: 'PRLV SEPA ONDÉA', cents: -1099, isSubscription: true },
  { date: '06/09', label: 'CB SUPERMARCHÉ', cents: -3874, isSubscription: false },
  { date: '08/09', label: 'NUAGERIE 200 GO', cents: -299, isSubscription: true },
  { date: '10/09', label: 'PRLV CLUB FORME+', cents: -2499, isSubscription: true },
  { date: '11/09', label: 'REMBOURSEMENT', cents: 1500, isSubscription: false },
]

export function previewSummary(lines: readonly PreviewLine[] = PREVIEW_LINES) {
  const subscriptions = lines.filter((line) => line.isSubscription)
  const monthlyCents = subscriptions.reduce((sum, line) => sum + Math.abs(line.cents), 0)
  return { count: subscriptions.length, monthlyCents, yearlyCents: yearlyFromMonthly(monthlyCents) }
}
