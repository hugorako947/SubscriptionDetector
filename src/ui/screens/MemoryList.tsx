import { useState } from 'react'
import { navigate } from '../../app/router'
import { ROUTES } from '../../app/routes'
import { CATEGORY_LABELS, SERVICES } from '../../data/services'
import type { Category } from '../../domain/types'
import { getCheckedCategories, listSubscriptions, setCheckedCategories } from '../../storage/db'
import { useLive } from '../../storage/useLive'
import { BottomActions, PrimaryButton } from '../components/Buttons'
import { Screen, ScreenTitle } from '../components/Screen'
import { SubscriptionSheet, type NewSubscriptionDraft } from '../subscriptions/SubscriptionSheet'
import { TrialSheet } from '../subscriptions/TrialSheet'

/** The checklist categories, in the order of the specification. */
const CATEGORIES: Category[] = ['streaming', 'musique', 'stockage', 'presse', 'sport', 'telephonie', 'assurance', 'banque', 'applis', 'essai']

/** Generic examples for categories without dictionary services (no brand, no price). */
const GENERIC: Partial<Record<Category, string[]>> = {
  assurance: ['Mutuelle', 'Assurance habitation', 'Assurance auto', 'Assurance téléphone'],
  banque: ['Carte bancaire premium', 'Assurance moyens de paiement', 'Frais de tenue de compte'],
  sport: ['Salle de sport', 'Club de sport'],
}

type Open = { kind: 'new'; draft: NewSubscriptionDraft } | { kind: 'trial' }

export function MemoryList() {
  const stored = useLive(getCheckedCategories)
  // Optimistic copy: the box reacts instantly, the database follows.
  const [optimistic, setOptimistic] = useState<Category[] | null>(null)
  const checked = optimistic ?? stored ?? []
  const items = useLive(listSubscriptions) ?? []
  const [open, setOpen] = useState<Open | null>(null)
  const owned = new Set(items.filter((s) => s.status !== 'rejected').flatMap((s) => [s.serviceId, s.displayName.toLowerCase()]))

  const toggle = (category: Category) => {
    const next = checked.includes(category) ? checked.filter((c) => c !== category) : [...checked, category]
    setOptimistic(next)
    void setCheckedCategories(next)
  }
  const closeIf = (target: Open) => () => setOpen((current) => (current === target ? null : current))

  return (
    <Screen back={{ href: ROUTES.home, label: 'Mes abonnements' }}>
      <ScreenTitle>Liste mémoire</ScreenTitle>
      <p className="mt-3 text-lg text-muted">Ce que tes captures n'ont peut-être pas montré. Touche ce que tu paies, coche la catégorie quand c'est vu.</p>
      <p className="mt-3 font-bold tabular" aria-live="polite">
        {checked.length} catégorie{checked.length > 1 ? 's' : ''} sur {CATEGORIES.length} vérifiée{checked.length > 1 ? 's' : ''}
      </p>

      <ul className="mt-6 space-y-4">
        {CATEGORIES.map((category) => {
          const services = SERVICES.filter((s) => s.category === category && !s.intermediary).slice(0, 8)
          const done = checked.includes(category)
          return (
            <li key={category} className={`rounded-xl border bg-surface px-4 py-3 ${done ? 'border-accent' : 'border-line'}`}>
              <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
                <span className="text-lg font-bold">{CATEGORY_LABELS[category]}</span>
                <span className="flex items-center gap-2 text-sm text-muted">
                  Vu
                  <input type="checkbox" checked={done} onChange={() => toggle(category)} className="size-6 accent-[var(--accent)]" />
                </span>
              </label>
              <ul className="mt-2 flex flex-wrap gap-2" aria-label={`Exemples : ${CATEGORY_LABELS[category]}`}>
                {category === 'essai' ? (
                  <li>
                    <button type="button" onClick={() => setOpen({ kind: 'trial' })} className="min-h-11 rounded-full border border-accent px-4 font-bold text-accent">
                      + Ajouter un essai gratuit
                    </button>
                  </li>
                ) : (
                  [...services.map((s) => ({ name: s.displayName, serviceId: s.id as string | undefined })), ...(GENERIC[category] ?? []).map((name) => ({ name, serviceId: undefined }))].map(
                    ({ name, serviceId }) => {
                      const has = owned.has(serviceId) || owned.has(name.toLowerCase())
                      return (
                        <li key={name}>
                          <button
                            type="button"
                            disabled={has}
                            onClick={() => setOpen({ kind: 'new', draft: { displayName: name, category, ...(serviceId ? { serviceId } : {}) } })}
                            className={`min-h-11 rounded-full border px-4 ${has ? 'border-transparent bg-paper text-muted' : 'border-line'}`}
                          >
                            {has ? `✓ ${name}` : name}
                          </button>
                        </li>
                      )
                    },
                  )
                )}
                {category !== 'essai' && (
                  <li>
                    <button type="button" onClick={() => setOpen({ kind: 'new', draft: { category } })} className="min-h-11 rounded-full border border-dashed border-muted px-4 text-muted">
                      Autre…
                    </button>
                  </li>
                )}
              </ul>
            </li>
          )
        })}
      </ul>

      <BottomActions>
        <PrimaryButton onClick={() => navigate(ROUTES.home)}>Terminé</PrimaryButton>
      </BottomActions>

      {open?.kind === 'new' && <SubscriptionSheet draft={open.draft} onClose={closeIf(open)} />}
      {open?.kind === 'trial' && <TrialSheet onClose={closeIf(open)} />}
    </Screen>
  )
}
