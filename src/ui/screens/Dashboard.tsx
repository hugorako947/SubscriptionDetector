import { useMemo, useState, type ReactNode } from 'react'
import { takeLastSummary, type AnalysisSummary } from '../../app/analysis'
import { Link } from '../../app/Link'
import { navigate } from '../../app/router'
import { ROUTES } from '../../app/routes'
import { formatEuros } from '../../domain/money'
import { portfolioTotals, todayIso, upcomingDeadlines, type StoredSubscription } from '../../domain/portfolio'
import { buildIcs } from '../../reminders/ics'
import { editSubscription, listSubscriptions, wipeAll } from '../../storage/db'
import { useLive } from '../../storage/useLive'
import { BottomActions, PrimaryButton, SecondaryButton } from '../components/Buttons'
import { closeSheet } from '../components/closeSheet'
import { Sheet } from '../components/Sheet'
import { Wordmark } from '../components/Wordmark'
import { relativeDay } from '../format'
import { AddSheet } from '../subscriptions/AddSheet'
import { SubscriptionCard } from '../subscriptions/SubscriptionCard'
import { SubscriptionSheet, type NewSubscriptionDraft } from '../subscriptions/SubscriptionSheet'
import { TrialSheet } from '../subscriptions/TrialSheet'

const CONFIDENCE_RANK = { high: 0, medium: 1, low: 2 } as const

type OpenSheet =
  | { kind: 'add' }
  | { kind: 'edit'; item: StoredSubscription }
  | { kind: 'new'; draft?: NewSubscriptionDraft }
  | { kind: 'trial' }
  | { kind: 'wipe' }

function Section({ title, count, children, note }: { title: string; count: number; children: ReactNode; note?: string }) {
  if (count === 0) return null
  return (
    <section className="mt-8" aria-labelledby={`section-${title}`}>
      <h2 id={`section-${title}`} className="text-lg font-bold">
        {title} <span className="font-normal text-muted tabular">({count})</span>
      </h2>
      {note && <p className="text-sm text-muted">{note}</p>}
      <ul className="mt-3 space-y-3">{children}</ul>
    </section>
  )
}

function downloadIcs(items: StoredSubscription[], today: string): number {
  const { content, events } = buildIcs(items, today)
  if (events === 0) return 0
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'rappels-abonnements.ics'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return events
}

export function Dashboard() {
  const items = useLive(listSubscriptions)
  const [sheet, setSheet] = useState<OpenSheet | null>(null)
  const [summary, setSummary] = useState<AnalysisSummary | null>(() => takeLastSummary())
  const [icsMessage, setIcsMessage] = useState<string | null>(null)
  const today = todayIso()

  const groups = useMemo(() => {
    const all = items ?? []
    const subscriptions = all.filter((s) => s.kind === 'subscription')
    return {
      // Same order as the engine: surest first, then the most expensive.
      pending: subscriptions
        .filter((s) => s.status === 'pending')
        .sort(
          (a, b) =>
            CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence] ||
            (b.monthlyEquivalentCents ?? 0) - (a.monthlyEquivalentCents ?? 0) ||
            (b.amountCents ?? 0) - (a.amountCents ?? 0),
        ),
      mine: subscriptions
        .filter((s) => s.status === 'confirmed')
        .sort((a, b) => Number(a.userStatus === 'cancelled') - Number(b.userStatus === 'cancelled') || (b.monthlyEquivalentCents ?? 0) - (a.monthlyEquivalentCents ?? 0)),
      rejected: all.filter((s) => s.status === 'rejected'),
      other: all.filter((s) => s.kind === 'other_debit' && s.status !== 'rejected'),
      totals: portfolioTotals(all),
      upcoming: upcomingDeadlines(all, today, 30),
    }
  }, [items, today])

  if (!items) return <div className="min-h-dvh" />

  /** Closes a sheet only if it is still the open one (closing is asynchronous). */
  const closeIf = (target: OpenSheet) => () => setSheet((current) => (current === target ? null : current))
  const open = (next: OpenSheet) => setSheet(next)
  const { totals } = groups

  return (
    <div className="mx-auto min-h-dvh max-w-xl">
      <header className="safe-x safe-top flex min-h-14 items-center">
        <Wordmark />
      </header>
      <main className="safe-x pb-40">
        <h1 tabIndex={-1} className="sr-only">
          Mes abonnements
        </h1>

        {summary && items.length > 0 && (
          <div role="status" className="mb-5 flex items-start gap-3 rounded-xl border-2 border-accent bg-surface p-4">
            <p className="flex-1">
              <strong>
                {summary.found === 0
                  ? "Je n'ai repéré aucun abonnement sur ces captures."
                  : `${summary.found} abonnement${summary.found > 1 ? 's' : ''} repéré${summary.found > 1 ? 's' : ''}.`}
              </strong>{' '}
              {summary.found > 0 && groups.pending.length > 0 && 'Vérifie ceux du haut : un geste suffit.'}
              {summary.unreadable > 0 && ` ${summary.unreadable} capture${summary.unreadable > 1 ? 's' : ''} n'a pas pu être lue.`}
            </p>
            <button type="button" onClick={() => setSummary(null)} className="-mt-2 -mr-2 inline-flex size-11 shrink-0 items-center justify-center text-muted" aria-label="Masquer ce message">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        )}

        {items.length > 0 && (
        <section aria-label="Total" className="rounded-2xl bg-accent px-5 pt-5 pb-4 text-on-accent">
          <p className="font-bold opacity-90">Tu paies</p>
          <p className="tabular text-[2.75rem] leading-none font-bold tracking-[-0.02em]">
            {formatEuros(totals.monthlyCents)}
            <span className="ml-2 text-xl font-normal">par mois</span>
          </p>
          <p className="tabular mt-2 opacity-90">
            soit <strong>{formatEuros(totals.yearlyCents)}</strong> par an, pour {totals.count} abonnement{totals.count > 1 ? 's' : ''}
          </p>
          {totals.incomplete > 0 && (
            <p className="mt-2 text-sm opacity-90">
              {totals.incomplete} sans montant ou fréquence, pas encore compté{totals.incomplete > 1 ? 's' : ''}.
            </p>
          )}
        </section>
        )}
        {totals.savingsYearlyCents > 0 && (
          <p className="mt-3 text-lg">
            En résiliant ce que tu as marqué, tu économises <mark className="highlight px-1 font-bold tabular">{formatEuros(totals.savingsYearlyCents)} par an</mark>.
          </p>
        )}

        {groups.upcoming.length > 0 && (
          <section className="mt-6" aria-labelledby="upcoming-title">
            <h2 id="upcoming-title" className="text-lg font-bold">
              Bientôt
            </h2>
            <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-surface">
              {groups.upcoming.slice(0, 5).map((deadline) => (
                <li key={deadline.item.id + deadline.type} className="flex items-baseline justify-between gap-3 px-4 py-3">
                  <span>
                    <span className="font-bold">{deadline.item.displayName}</span>
                    <span className="block text-sm text-muted">{deadline.type === 'trial_end' ? "Fin de l'essai gratuit" : 'Renouvellement'}</span>
                  </span>
                  <span className={`shrink-0 text-right tabular ${deadline.inDays <= 3 ? 'font-bold' : ''}`}>
                    {relativeDay(deadline.date, today)}
                    {deadline.item.amountCents !== undefined && <span className="block text-sm font-normal text-muted">{formatEuros(deadline.item.amountCents)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Section title="À vérifier" count={groups.pending.length} note="Je les ai repérés sur tes captures. Dis-moi si ce sont des abonnements.">
          {groups.pending.map((item) => (
            <SubscriptionCard key={item.id} item={item} today={today} onOpen={() => open({ kind: 'edit', item })} />
          ))}
        </Section>

        <Section title="Mes abonnements" count={groups.mine.length}>
          {groups.mine.map((item) => (
            <SubscriptionCard key={item.id} item={item} today={today} onOpen={() => open({ kind: 'edit', item })} />
          ))}
        </Section>

        {items.length === 0 && (
          <section className="mt-8 rounded-xl border border-dashed border-muted p-5" aria-labelledby="empty-title">
            <h2 id="empty-title" className="text-lg font-bold">
              {summary ? 'Rien ne ressemble à un abonnement sur ces captures' : 'Ta liste est vide'}
            </h2>
            {summary && summary.operations > 0 && (
              <p className="mt-1">
                J'ai bien lu {summary.operations} opération{summary.operations > 1 ? 's' : ''}, mais aucune ne ressemble à un abonnement :
                courses, virements, remboursements… C'est peut-être juste ce que montrait cette page.
              </p>
            )}
            <p className="mt-3 font-bold">Les pages qui marchent le mieux</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>la page des prélèvements de ton appli bancaire ;</li>
              <li>la page des abonnements de l'App Store ou de Google Play ;</li>
              <li>plusieurs captures de ton historique, sur deux ou trois mois.</li>
            </ul>
            <div className="mt-4 flex flex-col items-start gap-1">
              <Link href={ROUTES.captures} className="inline-flex min-h-11 items-center font-bold text-accent underline decoration-2 underline-offset-4">
                Analyser d'autres captures
              </Link>
              <Link href={ROUTES.memory} className="inline-flex min-h-11 items-center font-bold text-accent underline decoration-2 underline-offset-4">
                Ajouter avec la liste mémoire
              </Link>
            </div>
          </section>
        )}

        {groups.other.length > 0 && (
          <details className="mt-8 rounded-xl border border-line bg-surface px-4">
            <summary className="flex min-h-12 cursor-pointer items-center font-bold">Autres prélèvements ({groups.other.length})</summary>
            <p className="text-sm text-muted">Impôts, crédit, loyer… Ce ne sont pas des abonnements : ils ne sont pas dans le total.</p>
            <ul className="mt-2 mb-3 divide-y divide-line">
              {groups.other.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 py-2">
                  <span>{item.displayName}</span>
                  <span className="tabular text-muted">{item.amountCents !== undefined ? formatEuros(item.amountCents) : ''}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        {groups.rejected.length > 0 && (
          <details className="mt-3 rounded-xl border border-line bg-surface px-4">
            <summary className="flex min-h-12 cursor-pointer items-center font-bold">Écartés ({groups.rejected.length})</summary>
            <ul className="mb-3 divide-y divide-line">
              {groups.rejected.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-1">
                  <span className="text-muted">{item.displayName}</span>
                  <SecondaryButton onClick={() => void editSubscription(item.id, { status: 'pending' })}>Remettre</SecondaryButton>
                </li>
              ))}
            </ul>
          </details>
        )}

        <section className="mt-10 border-t border-line pt-6" aria-label="Outils">
          <p className="text-sm text-muted">
            Cette liste n'est peut-être pas complète.{' '}
            <Link href={ROUTES.memory} className="font-bold text-accent underline underline-offset-4">
              Vérifie avec la liste mémoire
            </Link>
            .
          </p>
          <div className="mt-4 flex flex-col items-start gap-1">
            <SecondaryButton
              onClick={() => {
                const events = downloadIcs(items, today)
                setIcsMessage(
                  events === 0
                    ? "Aucune date à venir : ajoute une date de prochain prélèvement ou de fin d'essai."
                    : `${events} rappel${events > 1 ? 's' : ''} dans le fichier « rappels-abonnements.ics ». Ouvre-le pour l'ajouter à ton calendrier.`,
                )
              }}
            >
              Ajouter les rappels à mon calendrier
            </SecondaryButton>
            {icsMessage && (
              <p role="status" className="text-sm">
                {icsMessage}
              </p>
            )}
            <SecondaryButton onClick={() => open({ kind: 'wipe' })}>Tout effacer</SecondaryButton>
          </div>
        </section>
      </main>

      <BottomActions>
        <PrimaryButton onClick={() => open({ kind: 'add' })}>Ajouter</PrimaryButton>
      </BottomActions>

      {sheet?.kind === 'add' && (
        <AddSheet onClose={closeIf(sheet)} onManual={() => open({ kind: 'new' })} onTrial={() => open({ kind: 'trial' })} />
      )}
      {sheet?.kind === 'edit' && <SubscriptionSheet item={sheet.item} onClose={closeIf(sheet)} />}
      {sheet?.kind === 'new' && <SubscriptionSheet {...(sheet.draft ? { draft: sheet.draft } : {})} onClose={closeIf(sheet)} />}
      {sheet?.kind === 'trial' && <TrialSheet onClose={closeIf(sheet)} />}
      {sheet?.kind === 'wipe' && (
        <Sheet title="Tout effacer ?" onClose={closeIf(sheet)}>
          <p>Ta liste, tes corrections et ta liste mémoire seront supprimées de ce téléphone. Rien n'est gardé ailleurs : c'est définitif.</p>
          <div className="mt-5 space-y-2">
            <button
              type="button"
              className="inline-flex min-h-13 w-full items-center justify-center rounded-xl bg-[#b3261e] px-6 text-lg font-bold text-white"
              onClick={(event) => {
                const button = event.currentTarget
                void wipeAll().then(() => {
                  closeSheet(button)
                  navigate(ROUTES.home, { replace: true })
                  window.location.reload()
                })
              }}
            >
              Oui, tout effacer
            </button>
            <div className="text-center">
              <SecondaryButton onClick={(event) => closeSheet(event.currentTarget)}>Annuler</SecondaryButton>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  )
}
