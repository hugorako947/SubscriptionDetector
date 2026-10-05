import { daysUntil } from '../domain/portfolio'

const dayFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })

/** « 2026-10-12 » → « 12 oct. » */
export function formatDay(iso: string): string {
  return dayFormatter.format(new Date(`${iso}T00:00:00Z`))
}

/** « aujourd'hui », « demain », « dans 3 jours », « le 12 oct. » */
export function relativeDay(iso: string, today: string): string {
  const days = daysUntil(iso, today)
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'demain'
  if (days > 1 && days <= 14) return `dans ${days} jours`
  return `le ${formatDay(iso)}`
}
