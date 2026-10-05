/**
 * Amounts are stored as integer cents to avoid floating-point rounding
 * (decision H8). Display uses the French locale.
 */
const euroFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

export function formatEuros(cents: number): string {
  if (!Number.isInteger(cents)) throw new RangeError(`Montant non entier en centimes : ${cents}`)
  return euroFormatter.format(cents / 100)
}

/** Signed amount with a typographic minus (U+2212), as on bank statements. */
export function formatSignedEuros(cents: number): string {
  const sign = cents < 0 ? '\u2212' : '+'
  return `${sign}${formatEuros(Math.abs(cents))}`
}

export const YEARLY_FACTOR_FROM_MONTHLY = 12

export function yearlyFromMonthly(monthlyCents: number): number {
  return monthlyCents * YEARLY_FACTOR_FROM_MONTHLY
}

/** What the user types in an amount field: « 12,99 », « 12.99 », « 12 », « 12,9 € ». Null if not an amount. */
export function parseEuroInput(input: string): number | null {
  const clean = input.replace(/[\s\u00a0\u202f€]/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null
  return Math.round(Number(clean) * 100)
}

/** Cents → value for an input field: 1299 → « 12,99 ». */
export function centsToInput(cents: number | undefined): string {
  return cents === undefined ? '' : (cents / 100).toFixed(2).replace('.', ',')
}
