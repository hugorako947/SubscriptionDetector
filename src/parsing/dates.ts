/**
 * French dates: « 05/09 », « 05/09/2026 », « 5 sept. », « Lundi 5 septembre »,
 * « Aujourd'hui », « Hier ». Without a year, the year is inferred (H11):
 * past for transactions, future for renewal dates.
 */
import { stripAccents } from './text'

export interface ParsedDate {
  iso: string
  /** Relative day or inferred year. */
  approximate: boolean
}

export interface ReferenceDay {
  year: number
  month: number // 1–12
  day: number
}

export function referenceDayFrom(date: Date): ReferenceDay {
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() }
}

const MONTHS: Array<[RegExp, number]> = [
  [/^janv?(ier)?$/, 1],
  [/^fevr?(ier)?$|^fev$/, 2],
  [/^mars$/, 3],
  [/^avr(il)?$/, 4],
  [/^mai$/, 5],
  [/^juin$/, 6],
  [/^juil(let)?$/, 7],
  [/^aout$/, 8],
  [/^sept?(embre)?$/, 9],
  [/^oct(obre)?$/, 10],
  [/^nov(embre)?$/, 11],
  [/^dec(embre)?$/, 12],
]

const WEEKDAYS = /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/g

export function monthFromWord(word: string): number | null {
  const clean = stripAccents(word.toLowerCase()).replace(/\.$/, '')
  for (const [pattern, month] of MONTHS) if (pattern.test(clean)) return month
  return null
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function iso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function compare(a: ReferenceDay, b: ReferenceDay): number {
  return a.year - b.year || a.month - b.month || a.day - b.day
}

function withInferredYear(month: number, day: number, ref: ReferenceDay, mode: 'past' | 'future'): string | null {
  let year = ref.year
  const candidate = { year, month, day }
  if (mode === 'past' && compare(candidate, ref) > 0) year -= 1
  if (mode === 'future' && compare(candidate, ref) < 0) year += 1
  return iso(year, month, day)
}

function addDays(ref: ReferenceDay, days: number): string {
  const date = new Date(Date.UTC(ref.year, ref.month - 1, ref.day + days))
  return date.toISOString().slice(0, 10)
}

function fullYear(text: string): number {
  const value = Number(text)
  return text.length === 2 ? 2000 + value : value
}

/** First date found in the text, or null. */
export function parseDate(text: string, ref: ReferenceDay, mode: 'past' | 'future' = 'past'): ParsedDate | null {
  const lower = stripAccents(text.toLowerCase()).replace(/[’`]/g, "'")

  if (/\baujourd'?hui\b/.test(lower)) return { iso: addDays(ref, 0), approximate: true }
  if (/\bavant-hier\b/.test(lower)) return { iso: addDays(ref, -2), approximate: true }
  if (/\bhier\b/.test(lower)) return { iso: addDays(ref, -1), approximate: true }

  // 05/09, 05/09/2026, 05/09/26 (slash only: « 13.49 » is an amount).
  const numeric = lower.match(/(?<!\d)(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?(?!\d)/)
  if (numeric) {
    const day = Number(numeric[1])
    const month = Number(numeric[2])
    const result = numeric[3] ? iso(fullYear(numeric[3]), month, day) : withInferredYear(month, day, ref, mode)
    if (result) return { iso: result, approximate: !numeric[3] }
  }

  // 05.09.2026 or 05-09-2026: only with a year.
  const dotted = lower.match(/(?<!\d)(\d{1,2})[.-](\d{1,2})[.-](\d{4})(?!\d)/)
  if (dotted) {
    const result = iso(Number(dotted[3]), Number(dotted[2]), Number(dotted[1]))
    if (result) return { iso: result, approximate: false }
  }

  // 5 sept., 1er octobre, 12 août 2026
  for (const match of lower.matchAll(/(?<!\d)(\d{1,2})(?:er)?\s+([a-z]{3,9})\.?(?:\s+(\d{4}))?/g)) {
    const month = monthFromWord(match[2] ?? '')
    if (!month) continue
    const day = Number(match[1])
    const result = match[3] ? iso(Number(match[3]), month, day) : withInferredYear(month, day, ref, mode)
    if (result) return { iso: result, approximate: !match[3] }
  }
  return null
}

/**
 * A section header is a line holding only a date, possibly with a weekday:
 * « Lundi 5 septembre », « 05/09/2026 », « Aujourd'hui ». It applies to the lines below.
 */
export function isDateHeader(text: string, ref: ReferenceDay): boolean {
  if (!parseDate(text, ref)) return false
  const rest = stripAccents(text.toLowerCase())
    .replace(/[’`]/g, "'")
    .replace(WEEKDAYS, '')
    .replace(/\baujourd'?hui\b|\bavant-hier\b|\bhier\b/g, '')
    .replace(/(?<!\d)\d{1,2}(?:er)?\s+[a-z]{3,9}\.?(?:\s+\d{4})?/g, '')
    .replace(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g, '')
    .replace(/[\s,.·:-]/g, '')
  return rest.length <= 1
}
