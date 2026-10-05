import { useRef, useState, type DragEvent, type ReactNode } from 'react'
import { analyzeScreenshots, setLastSummary, type AnalysisProgress } from '../../app/analysis'
import { navigate } from '../../app/router'
import { ROUTES } from '../../app/routes'
import { useIsDesktop, usePlatform } from '../../pwa/environment'
import { BottomActions } from '../components/Buttons'
import { Screen, ScreenTitle } from '../components/Screen'
import { DebitsExample, HistoryExample, StoreExample } from '../illustrations/GuideExamples'
import { STORE_LINKS } from '../subscriptions/labels'

function Step({ n, title, optional, text, children }: { n: number; title: string; optional?: boolean; text: ReactNode; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[2rem_1fr] gap-x-3">
      <span aria-hidden="true" className="tabular flex size-8 items-center justify-center rounded-full bg-accent font-bold text-on-accent">
        {n}
      </span>
      <div>
        <h2 className="pt-0.5 text-lg leading-snug font-bold">
          {title}
          {optional && <span className="ml-2 align-middle text-sm font-normal text-muted">facultatif</span>}
        </h2>
        <p className="mt-1 text-muted">{text}</p>
        <div className="mt-3">{children}</div>
      </div>
    </li>
  )
}

/**
 * Screenshot gesture. TODO(vérifier) on the models people actually use
 * (older iPhones with a Home button, Android brands with other shortcuts).
 */
function ScreenshotGesture() {
  const { os } = usePlatform()
  const text =
    os === 'ios'
      ? 'Pour faire une capture : appuie en même temps sur le bouton latéral et le bouton volume haut.'
      : os === 'android'
        ? 'Pour faire une capture : appuie en même temps sur Marche/Arrêt et volume bas (sur la plupart des téléphones).'
        : 'Sur ton téléphone, fais une capture de chaque page, puis reviens ici.'
  return <p className="mt-4 rounded-lg bg-surface px-3 py-2 text-sm">{text}</p>
}

function Analysing({ progress }: { progress: AnalysisProgress }) {
  const overall = Math.round(((progress.current - 1 + progress.fraction) / progress.total) * 100)
  return (
    <Screen>
      <ScreenTitle>Lecture de tes captures</ScreenTitle>
      <p className="mt-6 text-lg font-bold tabular" aria-live="polite">
        Lecture de la capture {progress.current} sur {progress.total}
      </p>
      <div
        role="progressbar"
        aria-label="Avancement de la lecture"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={overall}
        className="mt-3 h-3 overflow-hidden rounded-full bg-line"
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${Math.max(4, overall)}%` }} />
      </div>
      <p className="mt-8 text-muted">
        Tout se passe sur ce téléphone : tu pourrais même le mettre en mode avion. Les images sont oubliées dès qu'elles sont lues.
      </p>
    </Screen>
  )
}

export function CaptureGuide() {
  const { os } = usePlatform()
  const isDesktop = useIsDesktop()
  const [progress, setProgress] = useState<AnalysisProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const start = async (list: FileList | File[] | null) => {
    const files = [...(list ?? [])].filter((f) => f.type.startsWith('image/') || f.type === '')
    if (files.length === 0) return
    setError(null)
    setProgress({ current: 1, total: files.length, fraction: 0 })
    try {
      const summary = await analyzeScreenshots(files, setProgress)
      if (summary.unreadable === files.length) {
        setProgress(null)
        setError("Je n'ai pu lire aucune de ces images. Vérifie que ce sont bien des captures d'écran, puis réessaie.")
        return
      }
      setLastSummary(summary)
      navigate(ROUTES.subscriptions, { replace: true })
    } catch (cause) {
      console.error(cause)
      setProgress(null)
      setError("La lecture s'est arrêtée. Ferme les autres applis pour libérer de la mémoire, puis réessaie avec moins de captures.")
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  if (progress) return <Analysing progress={progress} />

  const stores = os === 'ios' ? [STORE_LINKS.apple] : os === 'android' ? [STORE_LINKS.google] : [STORE_LINKS.apple, STORE_LINKS.google]

  return (
    <Screen back={{ href: ROUTES.home, label: 'Retour' }}>
      <ScreenTitle>Fais 2 ou 3 captures d'écran</ScreenTitle>
      <p className="mt-3 text-lg text-muted">Ouvre tes applis, capture ces pages, puis reviens ici pour les choisir.</p>
      <ScreenshotGesture />

      <ol className="mt-8 space-y-9">
        <Step n={1} title="Tes prélèvements" text="Dans ton appli bancaire, la page qui liste les organismes qui te prélèvent (souvent « Prélèvements » ou « Mandats »).">
          <DebitsExample />
        </Step>
        <Step n={2} title="Tes abonnements du store" text="La page des abonnements de ton compte Apple ou Google : tout ce que tu paies via ton téléphone.">
          <div className="mb-3 flex flex-col items-start gap-1">
            {stores.map((store) => (
              <a key={store.href} href={store.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-bold text-accent underline decoration-2 underline-offset-4">
                {store.label}
              </a>
            ))}
          </div>
          <StoreExample />
        </Step>
        <Step n={3} title="Tes derniers paiements" optional text="Une à trois captures de l'historique de ton compte : on y repère ce qui revient.">
          <HistoryExample />
        </Step>
      </ol>

      {error && (
        <p role="alert" className="mt-8 rounded-lg border-2 border-[#b3261e] px-4 py-3 font-bold">
          {error}
        </p>
      )}

      {isDesktop && (
        <div
          onDragOver={(event: DragEvent) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event: DragEvent) => {
            event.preventDefault()
            setDragging(false)
            void start(event.dataTransfer.files)
          }}
          className={`mt-10 rounded-2xl border-2 border-dashed p-8 text-center ${dragging ? 'border-accent bg-surface' : 'border-muted'}`}
        >
          <p className="font-bold">Glisse tes captures ici</p>
          <p className="text-sm text-muted">ou utilise le bouton ci-dessous</p>
        </div>
      )}

      <input
        ref={inputRef}
        id="screenshots"
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(event) => void start(event.target.files)}
      />
      <BottomActions>
        <label
          htmlFor="screenshots"
          className="inline-flex min-h-13 w-full cursor-pointer items-center justify-center rounded-xl bg-accent px-6 text-lg font-bold text-on-accent has-[+input:focus-visible]:outline-3"
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              inputRef.current?.click()
            }
          }}
          tabIndex={0}
          role="button"
        >
          Choisir mes captures
        </label>
        <p className="pb-1 text-sm text-muted">Plusieurs à la fois. Elles restent sur ton téléphone.</p>
      </BottomActions>
    </Screen>
  )
}
