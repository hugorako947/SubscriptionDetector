/**
 * French amounts: « -13,49 € », « 13,49 EUR », « − 13,49 », « 1 234,56 € »
 * (normal, no-break or narrow no-break space), « 13.49 € », « +15,00 € ».
 */
import type { Direction } from '../domain/types'

export interface ParsedAmount {
  cents: number
  direction: Direction
  /** Position of the match in the (digit-fixed) text. */
  start: number
  end: number
  text: string
}

const SPACE = '[ \\u00a0\\u202f]'
const AMOUNT = new RegExp(
  `(?<sign>[+\\-−–]${SPACE}?)?` +
    `(?<int>\\d{1,3}(?:(?:${SPACE}|\\.)\\d{3})+|\\d+)` +
    `(?:[,.](?<dec>\\d{2}))?(?![\\d/])` +
    `(?:${SPACE}?(?<cur>€|EUR\\b|E\\b))?`,
  'gu',
)

/**
 * OCR often reads 0 as O and 1 as l or I inside numbers: « 1O,99 », « l3,49 ».
 * Only tokens that already look like an amount (digits plus , or .) are touched.
 */
export function fixDigitsInNumbers(text: string): string {
  return text.replace(/(?<![\p{L}])[+\-−–]?[\dOoIl]+[,.][\dOoIl]{2}(?![\p{L}\d])/gu, (token) =>
    /\d/.test(token) ? token.replace(/[Oo]/g, '0').replace(/[Il]/g, '1') : token,
  )
}

export function findAmounts(input: string): ParsedAmount[] {
  const text = fixDigitsInNumbers(input)
  const found: ParsedAmount[] = []
  for (const match of text.matchAll(AMOUNT)) {
    const { sign, int, dec, cur } = match.groups ?? {}
    if (!int) continue
    // Without decimals or a currency sign, a number is a quantity or a date part (« 200 GO », « 05/09 »).
    if (dec === undefined && cur === undefined) continue
    // « E » for € is only trusted after decimals.
    if (cur === 'E' && dec === undefined) continue
    const whole = Number(int.replace(/[ \u00a0\u202f.]/g, ''))
    const cents = whole * 100 + (dec ? Number(dec) : 0)
    const signChar = sign?.trim()
    const direction: Direction = signChar === '+' ? 'credit' : signChar ? 'debit' : 'unknown'
    const start = match.index ?? 0
    found.push({ cents, direction, start, end: start + match[0].length, text: match[0].trim() })
  }
  return found
}

/** The right-most amount of a line: bank apps align the amount on the right. */
export function lastAmount(text: string): ParsedAmount | null {
  const all = findAmounts(text)
  return all[all.length - 1] ?? null
}

/** Text with the amounts removed (to keep only the label). */
export function withoutAmounts(text: string): string {
  const fixed = fixDigitsInNumbers(text)
  let result = ''
  let cursor = 0
  for (const amount of findAmounts(text)) {
    result += fixed.slice(cursor, amount.start)
    cursor = amount.end
  }
  return (result + fixed.slice(cursor)).replace(/\s+/g, ' ').trim()
}
