import { useState, type FormEvent } from 'react'
import { parseEuroInput } from '../../domain/money'
import { createTrial, todayIso } from '../../domain/portfolio'
import { addSubscription } from '../../storage/db'
import { PrimaryButton } from '../components/Buttons'
import { TextField } from '../components/Fields'
import { closeSheet } from '../components/closeSheet'
import { Sheet } from '../components/Sheet'

function inDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return todayIso(date)
}

/** Express free trial: a name and an end date, in a few seconds. */
export function TrialSheet({ initialName = '', onClose }: { initialName?: string; onClose: () => void }) {
  const [name, setName] = useState(initialName)
  const [endsAt, setEndsAt] = useState(inDays(7))
  const [price, setPrice] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const cents = price.trim() === '' ? null : parseEuroInput(price)
    if (price.trim() !== '' && cents === null) {
      setError('Écris un montant comme 9,99')
      return
    }
    if (!name.trim() || !endsAt) return
    await addSubscription(
      createTrial({ displayName: name, endsAt, ...(cents !== null ? { amountCents: cents, period: 'monthly' } : {}) }, new Date().toISOString()),
    )
    closeSheet(form)
  }

  return (
    <Sheet title="Essai gratuit" onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
        <TextField label="Nom" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="off" autoFocus={!initialName} />
        <TextField label="Fin de l'essai" type="date" value={endsAt} min={todayIso()} onChange={(e) => setEndsAt(e.target.value)} required />
        <TextField
          label="Prix par mois ensuite"
          hint="Facultatif"
          inputMode="decimal"
          placeholder="9,99"
          value={price}
          onChange={(e) => {
            setPrice(e.target.value)
            setError(null)
          }}
          error={error}
        />
        <p className="text-sm text-muted">Je te le rappellerai dans « Bientôt » et dans ton calendrier si tu ajoutes les rappels.</p>
        <PrimaryButton type="submit">Ajouter l'essai</PrimaryButton>
      </form>
    </Sheet>
  )
}
