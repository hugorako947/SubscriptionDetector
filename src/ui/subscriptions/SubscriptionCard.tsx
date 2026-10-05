import { CATEGORY_LABELS } from '../../data/services'
import { formatEuros } from '../../domain/money'
import { PERIOD_LABELS, USER_STATUS_LABELS, type StoredSubscription } from '../../domain/portfolio'
import { editSubscription } from '../../storage/db'
import { relativeDay } from '../format'
import { CONFIDENCE_LABELS } from './labels'

function AmountLine({ item }: { item: StoredSubscription }) {
  if (item.amountCents === undefined) return <span className="font-bold text-accent">Montant à compléter</span>
  return (
    <span className="tabular">
      <strong>{formatEuros(item.amountCents)}</strong> <span className="text-muted">{PERIOD_LABELS[item.period]}</span>
      {item.period !== 'monthly' && item.monthlyEquivalentCents !== undefined && (
        <span className="text-muted"> · {formatEuros(item.monthlyEquivalentCents)}/mois</span>
      )}
      {item.periodIsEstimated && item.period !== 'unknown' && <span className="text-muted"> (estimé)</span>}
    </span>
  )
}

/** One subscription. Pending ones get two big answers: yes / no. */
export function SubscriptionCard({ item, today, onOpen }: { item: StoredSubscription; today: string; onOpen: () => void }) {
  const pending = item.status === 'pending'
  const cancelled = item.userStatus === 'cancelled'
  const nameId = `name-${item.id}`
  return (
    <li className="rounded-xl border border-line bg-surface">
      <button type="button" onClick={onOpen} className="block w-full rounded-xl px-4 pt-3 pb-3 text-left" aria-describedby={nameId}>
        <span className="flex items-start justify-between gap-3">
          <span id={nameId} className={`text-lg leading-snug font-bold ${cancelled ? 'text-muted line-through' : ''}`}>
            {item.displayName}
          </span>
          {pending ? (
            <span className="shrink-0 rounded-full border border-muted px-2 py-0.5 text-xs font-bold text-muted">{CONFIDENCE_LABELS[item.confidence]}</span>
          ) : item.userStatus !== 'keep' ? (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${item.userStatus === 'to_cancel' ? 'bg-mark text-mark-ink' : 'border border-line text-muted'}`}>
              {USER_STATUS_LABELS[item.userStatus]}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block">
          <AmountLine item={item} />
        </span>
        <span className="mt-0.5 block text-sm text-muted">
          {CATEGORY_LABELS[item.category]}
          {item.trialEndsAt ? ` · essai jusqu'au ${relativeDay(item.trialEndsAt, today).replace(/^le /, '')}` : ''}
          {!item.trialEndsAt && item.nextRenewal && !cancelled ? ` · prochain ${relativeDay(item.nextRenewal, today)}` : ''}
        </span>
        {pending && item.reasons[0] && <span className="mt-1.5 block text-sm">{item.reasons[0]}</span>}
      </button>
      {pending && (
        <div className="grid grid-cols-2 gap-2 border-t border-line p-2">
          <button
            type="button"
            onClick={() => void editSubscription(item.id, { status: 'confirmed' })}
            aria-label={`Oui, ${item.displayName} est un abonnement`}
            className="min-h-11 rounded-lg bg-accent font-bold text-on-accent"
          >
            Oui, c'en est un
          </button>
          <button
            type="button"
            onClick={() => void editSubscription(item.id, { status: 'rejected' })}
            aria-label={`Non, ${item.displayName} n'est pas un abonnement`}
            className="min-h-11 rounded-lg border border-line font-bold"
          >
            Non
          </button>
        </div>
      )}
    </li>
  )
}
