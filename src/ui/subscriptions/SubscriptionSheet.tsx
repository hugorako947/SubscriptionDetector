import { useState, type FormEvent } from 'react'
import { CATEGORY_LABELS } from '../../data/services'
import { centsToInput, parseEuroInput } from '../../domain/money'
import { createManual, PERIOD_LABELS, USER_STATUS_LABELS, type StoredSubscription, type UserStatus } from '../../domain/portfolio'
import type { Category, Period } from '../../domain/types'
import { addSubscription, deleteSubscription, editSubscription } from '../../storage/db'
import { PrimaryButton, SecondaryButton } from '../components/Buttons'
import { SelectField, Segmented, TextField } from '../components/Fields'
import { closeSheet } from '../components/closeSheet'
import { Sheet } from '../components/Sheet'
import { CONFIDENCE_LABELS, STORE_LINKS } from './labels'

const PERIODS: Period[] = ['monthly', 'yearly', 'quarterly', 'weekly', 'unknown']
const STATUSES: UserStatus[] = ['keep', 'to_cancel', 'cancelled']

export interface NewSubscriptionDraft {
  displayName?: string
  category?: Category
  serviceId?: string
}

/** Edit an item, or create one (`item` absent). Every field can be corrected. */
export function SubscriptionSheet({
  item,
  draft,
  onClose,
}: {
  item?: StoredSubscription
  draft?: NewSubscriptionDraft
  onClose: () => void
}) {
  const [name, setName] = useState(item?.displayName ?? draft?.displayName ?? '')
  const [amount, setAmount] = useState(centsToInput(item?.amountCents))
  const [period, setPeriod] = useState<Period>(item?.period ?? 'monthly')
  const [category, setCategory] = useState<Category>(item?.category ?? draft?.category ?? 'autre')
  const [nextRenewal, setNextRenewal] = useState(item?.nextRenewal ?? '')
  const [status, setStatus] = useState<UserStatus>(item?.userStatus ?? 'keep')
  const [error, setError] = useState<string | null>(null)
  const fromStore = item?.sourceTransactionIds.some((id) => id.startsWith('screenshot_store')) ?? false

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const cents = amount.trim() === '' ? null : parseEuroInput(amount)
    if (cents === null && amount.trim() !== '') {
      setError('Écris un montant comme 9,99')
      return
    }
    if (!name.trim()) return
    if (item) {
      await editSubscription(item.id, {
        displayName: name,
        amountCents: cents,
        period,
        category,
        nextRenewal: nextRenewal || null,
        userStatus: status,
        status: 'confirmed',
      })
    } else {
      const created = createManual(
        {
          displayName: name,
          category,
          period,
          ...(cents !== null ? { amountCents: cents } : {}),
          ...(nextRenewal ? { nextRenewal } : {}),
          ...(draft?.serviceId ? { serviceId: draft.serviceId } : {}),
        },
        new Date().toISOString(),
      )
      await addSubscription({ ...created, userStatus: status })
    }
    closeSheet(form)
  }

  return (
    <Sheet title={item ? 'Modifier' : 'Ajouter un abonnement'} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
        <TextField label="Nom" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="off" />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Montant"
            inputMode="decimal"
            placeholder="9,99"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              setError(null)
            }}
            error={error}
          />
          <SelectField label="Fréquence" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {p === 'unknown' ? 'Je ne sais pas' : PERIOD_LABELS[p].replace('par ', 'Par ')}
              </option>
            ))}
          </SelectField>
        </div>
        <TextField label="Prochain prélèvement" hint="Facultatif" type="date" value={nextRenewal} onChange={(e) => setNextRenewal(e.target.value)} />
        <SelectField label="Catégorie" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </SelectField>
        <Segmented legend="Ce que tu en fais" name="status" value={status} onChange={setStatus} options={STATUSES.map((s) => ({ value: s, label: USER_STATUS_LABELS[s] }))} />
        {status === 'to_cancel' && fromStore && (
          <p className="text-sm">
            Pour résilier, va dans tes abonnements :{' '}
            <a className="font-bold text-accent underline underline-offset-4" href={STORE_LINKS.apple.href} target="_blank" rel="noopener noreferrer">
              App Store
            </a>{' '}
            ou{' '}
            <a className="font-bold text-accent underline underline-offset-4" href={STORE_LINKS.google.href} target="_blank" rel="noopener noreferrer">
              Google Play
            </a>
            .
          </p>
        )}

        {item && item.origin === 'detected' && (
          <details className="rounded-lg border border-line p-3">
            <summary className="min-h-11 cursor-pointer content-center font-bold">Pourquoi je l'ai repéré ({CONFIDENCE_LABELS[item.confidence].toLowerCase()})</summary>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {item.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            {item.sourceLines.length > 0 && (
              <>
                <p className="mt-3 text-sm font-bold">Ligne lue sur ta capture</p>
                <ul className="mt-1 space-y-1">
                  {item.sourceLines.map((line) => (
                    <li key={line} className="rounded bg-paper px-2 py-1 font-mono text-sm break-words">
                      {line}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </details>
        )}

        <PrimaryButton type="submit">Enregistrer</PrimaryButton>
        {item && (
          <div className="text-center">
            {item.origin === 'detected' ? (
              <SecondaryButton
                onClick={(event) => {
                  const button = event.currentTarget
                  void editSubscription(item.id, { status: 'rejected' }).then(() => closeSheet(button))
                }}
              >
                Ce n'est pas un abonnement
              </SecondaryButton>
            ) : (
              <SecondaryButton
                onClick={(event) => {
                  const button = event.currentTarget
                  void deleteSubscription(item.id).then(() => closeSheet(button))
                }}
              >
                Supprimer
              </SecondaryButton>
            )}
          </div>
        )}
      </form>
    </Sheet>
  )
}
