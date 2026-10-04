/**
 * Amounts are stored as integer cents to avoid floating-point rounding
 * (decision H8). Display uses the French locale.
 */
const euroFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

export function formatEuros(cents: number): string {
  if (!Number.isInteger(cents)) throw new RangeError(`Montant non entier en centimes : ${cents}`)
  return euroFormatter.format(cents / 100)
}

export const YEARLY_FACTOR_FROM_MONTHLY = 12

export function yearlyFromMonthly(monthlyCents: number): number {
  return monthlyCents * YEARLY_FACTOR_FROM_MONTHLY
}
