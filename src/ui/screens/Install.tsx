import { useEffect, useState, type ReactNode } from 'react'
import { navigate } from '../../app/router'
import { ROUTES } from '../../app/routes'
import { shareableUrl } from '../../app/shareUrl'
import { useIsStandalone, usePlatform } from '../../pwa/environment'
import { promptInstall, useInstallPrompt } from '../../pwa/installPrompt'
import { chooseInstallGuide } from '../../pwa/platform'
import { BottomActions, PrimaryButton, SecondaryButton, SecondaryLink } from '../components/Buttons'
import { Screen, ScreenTitle } from '../components/Screen'
import { AddToHomeSketch, ConfirmAddSketch, ShareButtonSketch } from '../illustrations/IosInstallSteps'

function Steps({ children }: { children: ReactNode }) {
  return <ol className="mt-6 space-y-6">{children}</ol>
}

function Step({ n, title, children }: { n: number; title: ReactNode; children?: ReactNode }) {
  return (
    <li className="grid grid-cols-[2rem_1fr] gap-x-3">
      <span aria-hidden="true" className="tabular flex size-8 items-center justify-center rounded-full border-2 border-accent font-bold text-accent">
        {n}
      </span>
      <div>
        <p className="pt-0.5 text-lg font-bold">{title}</p>
        {children && <div className="mt-2 space-y-2">{children}</div>}
      </div>
    </li>
  )
}

function CopyAddress() {
  const [copied, setCopied] = useState(false)
  const url = shareableUrl(window.location.origin)
  return (
    <div className="mt-4 rounded-lg border border-line bg-surface p-4">
      <p className="font-bold break-all select-all">{url}</p>
      <SecondaryButton
        onClick={() => {
          navigator.clipboard
            .writeText(url)
            .then(() => setCopied(true))
            .catch(() => setCopied(false))
        }}
      >
        {copied ? 'Adresse copiée' : "Copier l'adresse"}
      </SecondaryButton>
    </div>
  )
}

export function Install() {
  const platform = usePlatform()
  const standalone = useIsStandalone()
  const { canPrompt, justInstalled } = useInstallPrompt()
  const guide = chooseInstallGuide({ platform, standalone, canPrompt })

  useEffect(() => {
    if (guide === 'installed') navigate(ROUTES.captures, { replace: true })
  }, [guide])

  if (justInstalled) {
    return (
      <Screen back={{ href: ROUTES.home, label: 'Accueil' }}>
        <ScreenTitle>C'est installé.</ScreenTitle>
        <p className="mt-3 text-lg text-muted">
          Ouvre l'appli « Abonnements » depuis ton écran d'accueil : elle marchera même sans réseau.
        </p>
        <BottomActions>
          <SecondaryLink href={ROUTES.captures}>Continuer ici</SecondaryLink>
        </BottomActions>
      </Screen>
    )
  }

  return (
    <Screen back={{ href: ROUTES.home, label: 'Accueil' }}>
      <ScreenTitle>Installe l'appli sur ton téléphone</ScreenTitle>
      <p className="mt-3 text-lg text-muted">
        Elle s'ouvrira depuis ton écran d'accueil, comme une appli, et marchera sans réseau.
      </p>

      {guide === 'prompt' && (
        <p className="mt-6">Ton navigateur peut l'installer en un geste. Rien n'est envoyé, rien n'est demandé.</p>
      )}

      {guide === 'ios-safari' && (
        <Steps>
          <Step n={1} title="Touche le bouton Partager">
            <ShareButtonSketch />
            {/* TODO(vérifier) sur iOS 26 : le bouton Partager peut être dans le menu « ⋯ ». */}
            <p className="text-muted">Tu ne le vois pas ? Touche d'abord « ⋯ » dans la barre de Safari.</p>
          </Step>
          <Step n={2} title="Choisis « Sur l'écran d'accueil »">
            <AddToHomeSketch />
            <p className="text-muted">Fais défiler le menu vers le bas si besoin.</p>
          </Step>
          <Step n={3} title="Touche « Ajouter »">
            <ConfirmAddSketch />
          </Step>
        </Steps>
      )}

      {guide === 'ios-other-browser' && (
        <>
          {/* TODO(vérifier) : Chrome et Firefox sur iPhone proposent peut-être aussi « Sur l'écran d'accueil ». */}
          <p className="mt-6">Sur iPhone, l'installation se fait depuis Safari. Ouvre cette adresse dans Safari :</p>
          <CopyAddress />
        </>
      )}

      {guide === 'in-app' && (
        <>
          <p className="mt-6">
            Cette page est ouverte dans une autre appli, qui ne permet pas d'installer. Ouvre-la dans ton navigateur
            habituel : cherche « Ouvrir dans le navigateur » dans le menu, ou copie l'adresse.
          </p>
          <CopyAddress />
        </>
      )}

      {guide === 'android-manual' && (
        // TODO(vérifier) libellés exacts selon Chrome, Samsung Internet et Firefox.
        <Steps>
          <Step n={1} title="Ouvre le menu de ton navigateur">
            <p className="text-muted">Souvent les trois points « ⋮ », en haut ou en bas de l'écran.</p>
          </Step>
          <Step n={2} title="Choisis « Installer l'application »">
            <p className="text-muted">Le menu peut aussi dire « Ajouter à l'écran d'accueil ».</p>
          </Step>
        </Steps>
      )}

      {guide === 'unsupported' && (
        <p className="mt-6">Ce navigateur ne propose pas l'installation. Tu peux quand même continuer.</p>
      )}

      <BottomActions>
        {guide === 'prompt' && <PrimaryButton onClick={() => void promptInstall()}>Installer l'appli</PrimaryButton>}
        <SecondaryLink href={ROUTES.captures}>
          {guide === 'unsupported' ? 'Continuer' : 'Continuer sans installer'}
        </SecondaryLink>
      </BottomActions>
    </Screen>
  )
}
