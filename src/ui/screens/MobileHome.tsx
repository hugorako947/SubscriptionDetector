import { ROUTES } from '../../app/routes'
import { useIsStandalone } from '../../pwa/environment'
import { BottomActions, PrimaryLink } from '../components/Buttons'
import { PrivacyNote } from '../components/PrivacyNote'
import { Wordmark } from '../components/Wordmark'
import { StatementPreview } from '../preview/StatementPreview'

export function MobileHome() {
  const standalone = useIsStandalone()
  return (
    <div className="mx-auto min-h-dvh max-w-xl">
      <header className="safe-x safe-top flex min-h-14 items-center">
        <Wordmark />
      </header>
      <main className="safe-x pb-36">
        <h1 tabIndex={-1} className="mt-4 text-[2rem] leading-[1.12] font-bold tracking-[-0.015em] outline-none">
          Retrouve les abonnements que tu paies sans y penser.
        </h1>
        <p className="mt-3 text-lg text-muted">
          Quelques captures d'écran de ton appli bancaire et de ton store suffisent. Tu obtiens la liste, avec le
          total par mois et par an.
        </p>
        <div className="mt-6">
          <PrivacyNote />
        </div>
        <div className="mt-8">
          <StatementPreview />
        </div>
      </main>
      <BottomActions>
        <PrimaryLink href={standalone ? ROUTES.captures : ROUTES.install}>Trouver mes abonnements</PrimaryLink>
      </BottomActions>
    </div>
  )
}
