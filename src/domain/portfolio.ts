/**
 * The user's own list: detections he validated, corrections, manual additions
 * and free trials. Pure functions (no storage) so the rules can be tested.
 */
import { monthlyEquivalent } from '../detection/periodicity'
import type { Category, DetectedSubscription, Period } from './types'

/** Status chosen by the user (phase 4 decision): the app cannot know the real one. */
export type UserStatus = 'keep' | 'to_cancel' | 'cancelled'
export type Origin = 'detected' | 'manual' | 'trial'

export interface StoredSubscription extends DetectedSubscription {
  origin: Origin
  userStatus: UserStatus
  createdAt: string
  updatedAt: string
}

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  keep: 'Je garde',
  to_cancel: 'À résilier',
  cancelled: 'Résilié',
}

export const PERIOD_LABELS: Record<Period, string> = {
  weekly: 'par semaine',
  monthly: 'par mois',
  quarterly: 'par trimestre',
  yearly: 'par an',
  unknown: 'fréquence à préciser',
}

export function fromDetection(detected: DetectedSubscription, now: string): StoredSubscription {
  return { ...detected, origin: 'detected', userStatus: 'keep', createdAt: now, updatedAt: now }
}

/**
 * New analysis results meet the saved list. Engine ids are stable (service or
 * merchant key), so a known item is recognised. Items the user already
 * confirmed or rejected are never touched; pending ones are refreshed.
 */
export function mergeDetections(
  existing: readonly StoredSubscription[],
  detected: readonly DetectedSubscription[],
  now: string,
): { added: StoredSubscription[]; refreshed: StoredSubscription[] } {
  const byId = new Map(existing.map((s) => [s.id, s]))
  const added: StoredSubscription[] = []
  const refreshed: StoredSubscription[] = []
  for (const item of detected) {
    const known = byId.get(item.id)
    if (!known) added.push(fromDetection(item, now))
    else if (known.status === 'pending') {
      refreshed.push({
        ...known,
        ...item,
        sourceLines: [...new Set([...known.sourceLines, ...item.sourceLines])],
        sourceTransactionIds: [...new Set([...known.sourceTransactionIds, ...item.sourceTransactionIds])],
        origin: known.origin,
        userStatus: known.userStatus,
        createdAt: known.createdAt,
        updatedAt: now,
      })
    }
  }
  return { added, refreshed }
}

export interface SubscriptionEdit {
  displayName?: string
  amountCents?: number | null
  period?: Period
  category?: Category
  nextRenewal?: string | null
  trialEndsAt?: string | null
  userStatus?: UserStatus
  status?: StoredSubscription['status']
}

/** Applies a correction and recomputes what depends on it. */
export function applyEdit(item: StoredSubscription, edit: SubscriptionEdit, now: string): StoredSubscription {
  const next: StoredSubscription = { ...item, updatedAt: now }
  if (edit.displayName !== undefined) next.displayName = edit.displayName.trim() || item.displayName
  if (edit.category !== undefined) next.category = edit.category
  if (edit.userStatus !== undefined) next.userStatus = edit.userStatus
  if (edit.status !== undefined) next.status = edit.status
  if (edit.period !== undefined) {
    next.period = edit.period
    next.periodIsEstimated = false
  }
  if (edit.amountCents === null) delete next.amountCents
  else if (edit.amountCents !== undefined) next.amountCents = edit.amountCents
  if (edit.nextRenewal === null) delete next.nextRenewal
  else if (edit.nextRenewal !== undefined) next.nextRenewal = edit.nextRenewal
  if (edit.trialEndsAt === null) delete next.trialEndsAt
  else if (edit.trialEndsAt !== undefined) next.trialEndsAt = edit.trialEndsAt
  next.needsAmount = next.amountCents === undefined
  const monthly = next.amountCents !== undefined ? monthlyEquivalent(next.amountCents, next.period) : undefined
  if (monthly === undefined) delete next.monthlyEquivalentCents
  else next.monthlyEquivalentCents = monthly
  return next
}

let sequence = 0
function newId(prefix: string): string {
  sequence++
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${sequence}`
  return `${prefix}:${random}`
}

const blank = (now: string): Omit<StoredSubscription, 'id' | 'displayName' | 'category' | 'origin'> => ({
  period: 'unknown',
  periodIsEstimated: false,
  confidence: 'high',
  reasons: ['Ajouté par toi.'],
  sourceTransactionIds: [],
  sourceLines: [],
  status: 'confirmed',
  needsAmount: true,
  kind: 'subscription',
  userStatus: 'keep',
  createdAt: now,
  updatedAt: now,
})

export function createManual(
  fields: { displayName: string; category: Category; amountCents?: number; period?: Period; nextRenewal?: string; serviceId?: string },
  now: string,
): StoredSubscription {
  const base: StoredSubscription = {
    ...blank(now),
    id: newId('manual'),
    displayName: fields.displayName.trim(),
    category: fields.category,
    origin: 'manual',
    ...(fields.serviceId ? { serviceId: fields.serviceId } : {}),
  }
  return applyEdit(base, { amountCents: fields.amountCents ?? null, period: fields.period ?? 'unknown', nextRenewal: fields.nextRenewal ?? null }, now)
}

/** Express free-trial entry (name + end date) in a few seconds. */
export function createTrial(fields: { displayName: string; endsAt: string; amountCents?: number; period?: Period }, now: string): StoredSubscription {
  const base: StoredSubscription = {
    ...blank(now),
    id: newId('trial'),
    displayName: fields.displayName.trim(),
    category: 'essai',
    origin: 'trial',
    reasons: ['Essai gratuit ajouté par toi.'],
    trialEndsAt: fields.endsAt,
  }
  return applyEdit(base, { amountCents: fields.amountCents ?? null, period: fields.period ?? 'unknown' }, now)
}

/** Counted in the totals: a subscription, not rejected, not cancelled. */
export function isCounted(item: StoredSubscription): boolean {
  return item.kind === 'subscription' && item.status !== 'rejected' && item.userStatus !== 'cancelled'
}

export function portfolioTotals(items: readonly StoredSubscription[]) {
  const counted = items.filter(isCounted)
  const monthlyCents = counted.reduce((sum, s) => sum + (s.monthlyEquivalentCents ?? 0), 0)
  const toCancelMonthly = counted.filter((s) => s.userStatus === 'to_cancel').reduce((sum, s) => sum + (s.monthlyEquivalentCents ?? 0), 0)
  return {
    count: counted.length,
    monthlyCents,
    yearlyCents: monthlyCents * 12,
    /** Counted but without amount or frequency: not in the total. */
    incomplete: counted.filter((s) => s.monthlyEquivalentCents === undefined).length,
    savingsYearlyCents: toCancelMonthly * 12,
  }
}

const dayNumber = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86_400_000

export function daysUntil(isoDate: string, today: string): number {
  return Math.round(dayNumber(isoDate) - dayNumber(today))
}

export interface Deadline {
  item: StoredSubscription
  date: string
  type: 'renewal' | 'trial_end'
  inDays: number
}

/** Renewals and trial ends in the coming days, shown at every opening. */
export function upcomingDeadlines(items: readonly StoredSubscription[], today: string, withinDays = 30): Deadline[] {
  const deadlines: Deadline[] = []
  for (const item of items) {
    if (item.status === 'rejected' || item.userStatus === 'cancelled') continue
    for (const [date, type] of [
      [item.trialEndsAt, 'trial_end'],
      [item.nextRenewal, 'renewal'],
    ] as const) {
      if (!date) continue
      const inDays = daysUntil(date, today)
      if (inDays >= 0 && inDays <= withinDays) deadlines.push({ item, date, type, inDays })
    }
  }
  return deadlines.sort((a, b) => a.inDays - b.inDays)
}

export function todayIso(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
