/**
 * Calendar file (.ics, RFC 5545) with a reminder before each renewal and trial
 * end: a PWA cannot reliably schedule local notifications without a server.
 * TODO(vérifier) the download and opening of the file on iPhone, especially
 * in the installed app.
 */
import { formatEuros } from '../domain/money'
import { isCounted, PERIOD_LABELS, type StoredSubscription } from '../domain/portfolio'
import type { Period } from '../domain/types'

const RRULE: Partial<Record<Period, string>> = {
  weekly: 'FREQ=WEEKLY',
  monthly: 'FREQ=MONTHLY',
  quarterly: 'FREQ=MONTHLY;INTERVAL=3',
  yearly: 'FREQ=YEARLY',
}

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Lines longer than 75 octets are folded (CRLF + space), without cutting a UTF-8 character. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder()
  const parts: string[] = []
  let current = ''
  let octets = 0
  for (const char of line) {
    const size = encoder.encode(char).length
    const limit = parts.length === 0 ? 75 : 74
    if (octets + size > limit) {
      parts.push(current)
      current = ''
      octets = 0
    }
    current += char
    octets += size
  }
  parts.push(current)
  return parts.join('\r\n ')
}

const compactDate = (iso: string) => iso.replace(/-/g, '')
function nextDay(iso: string): string {
  const date = new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)) + 1))
  return date.toISOString().slice(0, 10)
}
function stamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function buildIcs(items: readonly StoredSubscription[], today: string, now = new Date()): { content: string; events: number } {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Detecteur d abonnements//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
  let events = 0
  for (const item of items) {
    if (!isCounted(item) && item.status !== 'pending') continue
    if (item.userStatus === 'cancelled' || item.status === 'rejected') continue
    const amount = item.amountCents !== undefined ? ` (${formatEuros(item.amountCents)})` : ''
    if (item.trialEndsAt && item.trialEndsAt >= today) {
      events++
      lines.push(
        'BEGIN:VEVENT',
        `UID:${item.id}-trial@detecteur-abonnements`,
        `DTSTAMP:${stamp(now)}`,
        `DTSTART;VALUE=DATE:${compactDate(item.trialEndsAt)}`,
        `DTEND;VALUE=DATE:${compactDate(nextDay(item.trialEndsAt))}`,
        `SUMMARY:${escapeText(`Fin de l'essai gratuit : ${item.displayName}`)}`,
        `DESCRIPTION:${escapeText(`L'essai se termine aujourd'hui${amount ? `, ensuite${amount}` : ''}. Résilie avant si tu ne veux pas le garder.`)}`,
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeText(`Fin d'essai dans 2 jours : ${item.displayName}`)}`,
        'TRIGGER:-P2D',
        'END:VALARM',
        'END:VEVENT',
      )
    }
    if (item.nextRenewal && item.nextRenewal >= today) {
      events++
      const rule = RRULE[item.period]
      lines.push(
        'BEGIN:VEVENT',
        `UID:${item.id}-renewal@detecteur-abonnements`,
        `DTSTAMP:${stamp(now)}`,
        `DTSTART;VALUE=DATE:${compactDate(item.nextRenewal)}`,
        `DTEND;VALUE=DATE:${compactDate(nextDay(item.nextRenewal))}`,
        ...(rule ? [`RRULE:${rule}`] : []),
        `SUMMARY:${escapeText(`Renouvellement : ${item.displayName}${amount}`)}`,
        `DESCRIPTION:${escapeText(`Prélèvement attendu ${PERIOD_LABELS[item.period]}. Date estimée à partir de tes captures.`)}`,
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeText(`Demain : ${item.displayName}${amount}`)}`,
        'TRIGGER:-P1D',
        'END:VALARM',
        'END:VEVENT',
      )
    }
  }
  lines.push('END:VCALENDAR')
  return { content: lines.map(foldLine).join('\r\n') + '\r\n', events }
}
