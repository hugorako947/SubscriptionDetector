/**
 * Shared data model (from the specification, refined by decision H8).
 * Amounts are integer cents, always positive: `direction` carries the sign.
 */
export type SourceKind =
  | 'screenshot_bank_debits'
  | 'screenshot_store'
  | 'screenshot_card_history'
  | 'manual'
  | 'csv'
  | 'pdf'

export type Direction = 'debit' | 'credit' | 'unknown'
export type PaymentKind = 'sepa' | 'card' | 'transfer' | 'store' | 'unknown'
export type Period = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'unknown'
export type Confidence = 'high' | 'medium' | 'low'

/** Same categories as the « mémoire » checklist, plus 'autre'. */
export type Category =
  | 'streaming'
  | 'musique'
  | 'stockage'
  | 'presse'
  | 'sport'
  | 'telephonie'
  | 'assurance'
  | 'banque'
  | 'applis'
  | 'essai'
  | 'autre'

export interface Transaction {
  id: string
  /** Text as read, kept to show « ligne source lue ». Never kept for transfers. */
  rawText: string
  label: string
  normalizedLabel: string
  amountCents?: number
  currency: 'EUR'
  /** ISO 8601 date (YYYY-MM-DD). */
  date?: string
  /** True for « Aujourd'hui », « Hier », or a year guessed from context (H11). */
  dateIsApproximate?: boolean
  direction: Direction
  kind: PaymentKind
  source: SourceKind
  /** Index of the screenshot in the import, used to deduplicate overlapping captures. */
  captureIndex: number
  ocrConfidence?: number
  /** Store pages only. */
  periodHint?: Period
  renewalDate?: string
  trialEndsAt?: string
}

export interface DetectedSubscription {
  id: string
  serviceId?: string
  displayName: string
  category: Category
  amountCents?: number
  period: Period
  /** True when the period comes from the dictionary's usual period, not from the data. */
  periodIsEstimated: boolean
  monthlyEquivalentCents?: number
  confidence: Confidence
  /** Short French sentences shown to the user. */
  reasons: string[]
  sourceTransactionIds: string[]
  sourceLines: string[]
  status: 'pending' | 'confirmed' | 'rejected'
  nextRenewal?: string
  trialEndsAt?: string
  /** Seen without an amount (bank debits page): the user is asked for it. */
  needsAmount: boolean
  /** 'other_debit': taxes, loans… shown apart and never counted as subscriptions. */
  kind: 'subscription' | 'other_debit'
}
