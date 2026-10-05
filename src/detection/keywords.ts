/**
 * Generic words that point to a subscription when no service is recognised
 * (« BPCE ASSURANCES », « COTISATIONS BANCAIRES »): many bank apps show a
 * clean name without « PRLV », so rule 2 alone misses them. Medium
 * confidence: the user confirms.
 */
import type { Category } from '../domain/types'

const KEYWORDS: Array<[RegExp, Category, string]> = [
  [/\b(ASSURANCES?|ASSUR|MUTUELLE|PREVOYANCE)\b/, 'assurance', 'assurance'],
  [/\b(COTISATIONS? (BANCAIRES?|CARTE|MENSUELLE)|OFFRE GROUPEE|FRAIS DE TENUE|TENUE DE COMPTE|PACKAGE)\b/, 'banque', 'cotisation bancaire'],
  [/\b(ABONNEMENTS?|ABONNT|ABO|FORFAIT)\b/, 'autre', 'abonnement'],
]

export function subscriptionKeyword(normalizedLabel: string): { category: Category; word: string } | null {
  for (const [pattern, category, word] of KEYWORDS) if (pattern.test(normalizedLabel)) return { category, word }
  return null
}

/** Never subscriptions, even when they come back every month (totals of card spending, balances). */
const NEVER = /\b(DEBIT DIFFERE|RELEVE CARTE|ENCOURS|SOLDE|RETRAIT)\b/
/** A label that is only a payment word says nothing about who is paid. */
const PAYMENT_WORD_ONLY = /^(PRELEVEMENT( SEPA)?|PRLV|CARTE( BANCAIRE)?|CB|PAIEMENT|VIREMENT( RECU| EMIS)?|ACHAT|MANDAT( ACTIF)?)$/

export function isNeverSubscription(normalizedLabel: string): boolean {
  return NEVER.test(normalizedLabel) || PAYMENT_WORD_ONLY.test(normalizedLabel)
}
