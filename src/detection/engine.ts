/**
 * Detection engine, independent of the data source. Rules, from the most to the
 * least reliable (specification):
 * 1. label found in the dictionary → high confidence;
 * 2. SEPA debit from an unknown creditor → medium (taxes, loans… go to « Autres prélèvements »);
 * 3. same merchant and amount at regular dates → medium (3+ times) or low (twice);
 * 4. otherwise ignored (one-off purchases, transfers between people).
 * Store subscription pages are explicit lists: high confidence.
 */
import { SERVICES, type Service } from '../data/services'
import type { Confidence, DetectedSubscription, Period, Transaction } from '../domain/types'
import { formatEuros } from '../domain/money'
import { dedupeTransactions } from './dedupe'
import { jaroWinkler } from './fuzzy'
import { DEFAULT_MATCH_THRESHOLD, matchIntermediary, matchService } from './matcher'
import { otherDebitReason } from './nonSubscription'
import { detectPeriodicity, monthlyEquivalent, nextRenewalFrom } from './periodicity'

export interface DetectionOptions {
  services?: readonly Service[]
  matchThreshold?: number
}

export interface DetectionResult {
  subscriptions: DetectedSubscription[]
  otherDebits: DetectedSubscription[]
  stats: {
    transactions: number
    duplicates: number
    credits: number
    transfers: number
    ignored: number
    byConfidence: Record<Confidence, number>
  }
}

interface Group {
  key: string
  service?: Service
  via?: Service
  otherReason?: string
  transactions: Transaction[]
}

const PERIOD_WORDS: Record<Period, string> = {
  weekly: 'chaque semaine',
  monthly: 'chaque mois',
  quarterly: 'chaque trimestre',
  yearly: 'chaque année',
  unknown: '',
}

/** « CLUB FORME+ » → « Club Forme+ » for unknown merchants. */
function titleCase(normalized: string): string {
  return normalized.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase())
}

const latest = (transactions: Transaction[]) =>
  [...transactions].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))[0]!

/**
 * Key used to recognise the same unknown merchant across pages: « CINEFLUX SAS »
 * on the debits page and « CINEFLUX » on the statement, « CLUB FORME+ » and
 * « CLUB FORME PLUS ».
 */
export function merchantKey(normalized: string): string {
  return normalized
    .replace(/\+/g, ' PLUS')
    .replace(/\b(SAS|SASU|SARL|SA|EURL|SNC|SCI|FRANCE|FR|EUROPE)\b/g, ' ')
    .replace(/[^A-Z0-9]/g, '')
}

const SAME_MERCHANT_SIMILARITY = 0.93

const CONFIDENCE_ORDER: Record<Confidence, number> = { high: 0, medium: 1, low: 2 }

export function detectSubscriptions(input: readonly Transaction[], options: DetectionOptions = {}): DetectionResult {
  const services = options.services ?? SERVICES
  const threshold = options.matchThreshold ?? DEFAULT_MATCH_THRESHOLD
  const { kept, duplicates } = dedupeTransactions(input)
  let credits = 0
  let transfers = 0
  let ignored = 0

  const groups = new Map<string, Group>()
  const addTo = (key: string, transaction: Transaction, fields: Omit<Group, 'key' | 'transactions'>) => {
    const group = groups.get(key) ?? { key, transactions: [], ...fields }
    group.transactions.push(transaction)
    groups.set(key, group)
  }

  for (const transaction of kept) {
    if (transaction.direction === 'credit') {
      credits++
      continue
    }
    if (transaction.kind === 'transfer') {
      transfers++
      continue
    }
    if (!transaction.normalizedLabel) {
      ignored++
      continue
    }
    const match = matchService(transaction.normalizedLabel, services, threshold)
    const other = otherDebitReason(transaction.normalizedLabel)
    if (match && !match.service.intermediary) {
      addTo(`service:${match.service.id}`, transaction, {
        service: match.service,
        ...(matchIntermediary(transaction.normalizedLabel, services) ? { via: matchIntermediary(transaction.normalizedLabel, services)! } : {}),
      })
    } else if (other) {
      addTo(`other:${transaction.normalizedLabel}`, transaction, { otherReason: other })
    } else if (match?.service.intermediary && transaction.source !== 'screenshot_store') {
      // One Apple or Google line per amount: each amount is likely a different subscription.
      addTo(`via:${match.service.id}:${transaction.amountCents ?? '?'}`, transaction, { via: match.service })
    } else {
      // Store pages are billed through Apple or Google: never merged with bank lines of the same name.
      const prefix = transaction.source === 'screenshot_store' ? 'store' : 'label'
      const key = merchantKey(transaction.normalizedLabel) || transaction.normalizedLabel
      const similar = [...groups.keys()].find((existing) => {
        if (!existing.startsWith(`${prefix}:`)) return false
        const other = existing.slice(prefix.length + 1)
        return other === key || (key.length >= 5 && jaroWinkler(other, key) >= SAME_MERCHANT_SIMILARITY)
      })
      addTo(similar ?? `${prefix}:${key}`, transaction, {})
    }
  }

  // An Apple/Google line with the same amount as a store subscription is that subscription (risk R2).
  const storeGroups = [...groups.values()].filter((g) => g.transactions.some((t) => t.source === 'screenshot_store'))
  for (const group of [...groups.values()]) {
    if (!group.key.startsWith('via:')) continue
    const amount = group.transactions[0]?.amountCents
    const target = storeGroups.find((g) => g.transactions.some((t) => t.source === 'screenshot_store' && t.amountCents === amount))
    if (amount !== undefined && target) {
      target.transactions.push(...group.transactions)
      target.via ??= group.via
      groups.delete(group.key)
    }
  }

  const subscriptions: DetectedSubscription[] = []
  const otherDebits: DetectedSubscription[] = []

  for (const group of groups.values()) {
    const transactions = group.transactions
    const fromStore = transactions.find((t) => t.source === 'screenshot_store')
    const isSepa = transactions.some((t) => t.kind === 'sepa')
    const periodicity = detectPeriodicity(transactions)
    const reasons: string[] = []
    let confidence: Confidence

    if (group.service) {
      confidence = 'high'
      reasons.push(`Reconnu dans la liste des services : ${group.service.displayName}.`)
    } else if (fromStore) {
      confidence = 'high'
      reasons.push("Listé sur la page des abonnements du store.")
    } else if (group.otherReason) {
      confidence = 'medium'
      reasons.push(`${group.otherReason} : prélèvement, mais pas un abonnement.`)
    } else if (group.via) {
      confidence = 'medium'
      reasons.push(`Payé via ${group.via.displayName}, qui ne précise pas le service. Une capture de la page des abonnements du store le retrouverait.`)
    } else if (isSepa) {
      confidence = 'medium'
      reasons.push("Prélèvement d'un organisme que je ne connais pas : à toi de dire si c'est un abonnement.")
    } else if (periodicity) {
      confidence = periodicity.occurrences >= 3 ? 'medium' : 'low'
      reasons.push(`Même marchand et montant proche, ${periodicity.occurrences} fois, ${PERIOD_WORDS[periodicity.period]}.`)
    } else {
      ignored += transactions.length
      continue
    }
    if (group.via && group.service) reasons.push(`Payé via ${group.via.displayName}.`)

    const last = latest(transactions)
    const amountCents = fromStore?.amountCents ?? last.amountCents ?? transactions.find((t) => t.amountCents !== undefined)?.amountCents
    const hintedPeriod = fromStore?.periodHint && fromStore.periodHint !== 'unknown' ? fromStore.periodHint : undefined
    const period: Period = hintedPeriod ?? periodicity?.period ?? group.service?.usualPeriod ?? 'unknown'
    const periodIsEstimated = !hintedPeriod && !periodicity
    if (periodIsEstimated && period !== 'unknown') reasons.push('Fréquence estimée : la fréquence habituelle de ce service.')
    if (amountCents === undefined) reasons.push('Montant absent de la capture : à compléter.')
    else if (period === 'unknown') reasons.push(`Montant lu : ${formatEuros(amountCents)}, fréquence inconnue.`)

    const nextRenewal = fromStore?.renewalDate ?? (last.date ? nextRenewalFrom(last.date, period) : undefined)
    const named = transactions.find((t) => t.amountCents !== undefined) ?? last
    const displayName =
      group.service?.displayName ??
      (fromStore
        ? fromStore.label
        : group.key.startsWith('via:') && group.via
          ? `Abonnement ${group.via.displayName}`
          : titleCase(named.normalizedLabel))
    const monthly = amountCents !== undefined ? monthlyEquivalent(amountCents, period) : undefined

    const detected: DetectedSubscription = {
      id: `sub:${group.key}`,
      ...(group.service ? { serviceId: group.service.id } : {}),
      displayName,
      category: group.service?.category ?? (fromStore?.trialEndsAt ? 'essai' : 'autre'),
      ...(amountCents !== undefined ? { amountCents } : {}),
      period,
      periodIsEstimated,
      ...(monthly !== undefined ? { monthlyEquivalentCents: monthly } : {}),
      confidence,
      reasons,
      sourceTransactionIds: transactions.map((t) => t.id),
      sourceLines: [...new Set(transactions.map((t) => t.rawText).filter(Boolean))],
      status: 'pending',
      ...(nextRenewal ? { nextRenewal } : {}),
      ...(fromStore?.trialEndsAt ? { trialEndsAt: fromStore.trialEndsAt } : {}),
      needsAmount: amountCents === undefined,
      kind: group.otherReason ? 'other_debit' : 'subscription',
    }
    ;(detected.kind === 'other_debit' ? otherDebits : subscriptions).push(detected)
  }

  subscriptions.sort(
    (a, b) =>
      CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence] ||
      (b.monthlyEquivalentCents ?? 0) - (a.monthlyEquivalentCents ?? 0) ||
      (b.amountCents ?? 0) - (a.amountCents ?? 0),
  )
  const byConfidence: Record<Confidence, number> = { high: 0, medium: 0, low: 0 }
  subscriptions.forEach((s) => byConfidence[s.confidence]++)

  return {
    subscriptions,
    otherDebits,
    stats: { transactions: input.length, duplicates, credits, transfers, ignored, byConfidence },
  }
}

/** Monthly and yearly totals of the subscriptions not rejected (other debits never count). */
export function totals(subscriptions: readonly DetectedSubscription[]): { monthlyCents: number; yearlyCents: number; withoutAmount: number } {
  const counted = subscriptions.filter((s) => s.kind === 'subscription' && s.status !== 'rejected')
  const monthlyCents = counted.reduce((sum, s) => sum + (s.monthlyEquivalentCents ?? 0), 0)
  return { monthlyCents, yearlyCents: monthlyCents * 12, withoutAmount: counted.filter((s) => s.monthlyEquivalentCents === undefined).length }
}
