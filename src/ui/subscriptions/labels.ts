import type { Confidence } from '../../domain/types'

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: 'Sûr',
  medium: 'Probable',
  low: 'À confirmer',
}

/**
 * Store pages to manage subscriptions. TODO(vérifier) on real devices
 * (specification): https://apps.apple.com/account/subscriptions and
 * https://play.google.com/store/account/subscriptions
 */
export const STORE_LINKS = {
  apple: { href: 'https://apps.apple.com/account/subscriptions', label: 'Ouvrir mes abonnements App Store' },
  google: { href: 'https://play.google.com/store/account/subscriptions', label: 'Ouvrir mes abonnements Google Play' },
} as const
