import { ROUTES } from '../../app/routes'
import { SecondaryLink } from '../components/Buttons'
import { PrivacyNote } from '../components/PrivacyNote'
import { QrPanel } from '../components/QrPanel'
import { Wordmark } from '../components/Wordmark'
import { StatementPreview } from '../preview/StatementPreview'

export function DesktopHome() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center px-10 py-6">
        <Wordmark />
      </header>
      <main className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-start gap-16 px-10 pt-6 pb-16">
        <section>
          <h1 tabIndex={-1} className="max-w-[16ch] text-[3.25rem] leading-[1.05] font-bold tracking-[-0.02em] outline-none">
            Retrouve les abonnements que tu paies sans y penser.
          </h1>
          <p className="mt-5 max-w-[34rem] text-xl text-muted">
            Quelques captures d'écran de ton appli bancaire et de ton store suffisent. Tu obtiens la liste, avec le
            total par mois et par an.
          </p>
          <div className="mt-6 max-w-[34rem]">
            <PrivacyNote device="appareil" />
          </div>
          <div className="mt-10 max-w-md">
            <StatementPreview size="large" />
          </div>
        </section>
        <aside className="sticky top-10">
          <QrPanel />
          <p className="mt-4 pl-1 text-muted">
            Tes captures sont sur cet ordinateur ? <SecondaryLink href={ROUTES.captures}>Analyser ici</SecondaryLink>
          </p>
        </aside>
      </main>
    </div>
  )
}
