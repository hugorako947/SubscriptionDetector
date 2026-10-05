/**
 * OCR debug screen (phase 2). Shows what the engine reads and where, to tune
 * preprocessing and page segmentation on real screenshots. Development only:
 * excluded from the production build (decision H13). Nothing is stored.
 */
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { ROUTES } from '../app/routes'
import { prepareOcr, terminateOcr } from '../ocr/engine'
import { readScreenshot } from '../ocr/readScreenshot'
import { DEFAULT_PREPROCESS, type OcrPageResult, type PageSegmentationMode, type PreprocessOptions } from '../ocr/types'
import { PrimaryButton, SecondaryLink } from '../ui/components/Buttons'

type EngineState = { kind: 'loading' } | { kind: 'ready'; ms: number } | { kind: 'error'; message: string }

interface PageView extends Omit<OcrPageResult, 'lines'> {
  name: string
  lines: OcrPageResult['lines']
  preview: string
}

const PSM_OPTIONS: Array<{ value: PageSegmentationMode; label: string }> = [
  { value: '3', label: 'Automatique (3)' },
  { value: '4', label: 'Une colonne (4)' },
  { value: '6', label: 'Un bloc (6)' },
  { value: '11', label: 'Texte épars (11)' },
]

const LOW_CONFIDENCE = 60
const PREVIEW_WIDTH = 720

/** Small JPEG of the preprocessed image, then the big canvas is released (iPhone memory). */
function toPreview(canvas: HTMLCanvasElement): string {
  const ratio = Math.min(1, PREVIEW_WIDTH / canvas.width)
  const small = document.createElement('canvas')
  small.width = Math.round(canvas.width * ratio)
  small.height = Math.round(canvas.height * ratio)
  small.getContext('2d')?.drawImage(canvas, 0, 0, small.width, small.height)
  const url = small.toDataURL('image/jpeg', 0.8)
  canvas.width = canvas.height = small.width = small.height = 0
  return url
}

function useErrorLog() {
  const [errors, setErrors] = useState<string[]>([])
  useEffect(() => {
    const add = (message: string) => setErrors((list) => [...list.slice(-9), message])
    const onError = (event: ErrorEvent) => add(event.message)
    const onRejection = (event: PromiseRejectionEvent) => add(String(event.reason))
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])
  return { errors, add: (message: string) => setErrors((list) => [...list.slice(-9), message]) }
}

export default function DebugOcr() {
  const [engine, setEngine] = useState<EngineState>({ kind: 'loading' })
  const [files, setFiles] = useState<File[]>([])
  const [options, setOptions] = useState<PreprocessOptions>(DEFAULT_PREPROCESS)
  const [psm, setPsm] = useState<PageSegmentationMode>('3')
  const [progress, setProgress] = useState<string | null>(null)
  const [pages, setPages] = useState<PageView[]>([])
  const [dragging, setDragging] = useState(false)
  const { errors, add: logError } = useErrorLog()
  const inputRef = useRef<HTMLInputElement>(null)

  // Prepare the engine as soon as the screen opens (decision H4), free it on leave.
  useEffect(() => {
    const started = performance.now()
    prepareOcr()
      .then(() => setEngine({ kind: 'ready', ms: Math.round(performance.now() - started) }))
      .catch((error: unknown) => setEngine({ kind: 'error', message: String(error) }))
    return () => void terminateOcr()
  }, [])

  const run = async () => {
    setPages([])
    for (const [index, file] of files.entries()) {
      const label = `Lecture de la capture ${index + 1} sur ${files.length}`
      setProgress(label)
      try {
        const result = await readScreenshot(file, options, psm, (status, value) => {
          if (status === 'recognizing text') setProgress(`${label} : ${Math.round(value * 100)} %`)
        })
        const { canvas, ...rest } = result
        const view: PageView = { ...rest, name: file.name, preview: toPreview(canvas) }
        setPages((list) => [...list, view])
      } catch (error) {
        logError(`${file.name} : ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    setProgress(null)
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    setFiles([...event.dataTransfer.files].filter((f) => f.type.startsWith('image/')))
  }

  const busy = progress !== null

  return (
    <div className="mx-auto min-h-dvh max-w-3xl">
      <header className="safe-x safe-top flex min-h-14 items-center">
        <SecondaryLink href={ROUTES.home}>Accueil</SecondaryLink>
      </header>
      <main className="safe-x pb-16">
        <h1 tabIndex={-1} className="text-[1.875rem] leading-tight font-bold outline-none">
          Débogage OCR
        </h1>
        <p role="note" className="mt-3 rounded-md bg-mark px-3 py-2 text-mark-ink">
          Écran de développement. Le texte lu peut contenir des données personnelles : il reste sur cet appareil et
          n'est jamais enregistré.
        </p>

        <p className="mt-4" aria-live="polite">
          Moteur :{' '}
          {engine.kind === 'loading' && 'chargement…'}
          {engine.kind === 'ready' && <strong>prêt ({engine.ms} ms)</strong>}
          {engine.kind === 'error' && <strong className="text-[#b3261e]">erreur : {engine.message}</strong>}
        </p>

        <section
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`mt-4 rounded-lg border-2 border-dashed p-4 ${dragging ? 'border-accent bg-surface' : 'border-line'}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            id="debug-files"
            onChange={(event) => setFiles([...(event.target.files ?? [])])}
          />
          <label htmlFor="debug-files" className="inline-flex min-h-11 cursor-pointer items-center font-bold text-accent underline underline-offset-4">
            Choisir des captures
          </label>
          <span className="text-muted"> ou glisse-les ici (sur ordinateur).</span>
          <p className="mt-1 text-sm text-muted">
            {files.length === 0 ? 'Aucune image choisie.' : `${files.length} image(s) : ${files.map((f) => f.name).join(', ')}`}
          </p>
        </section>

        <fieldset className="mt-4 grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Réglages</legend>
          <label className="flex flex-col gap-1">
            <span className="font-bold">Segmentation de page</span>
            <select value={psm} onChange={(e) => setPsm(e.target.value as PageSegmentationMode)} className="min-h-11 rounded-md border border-muted bg-surface px-2">
              {PSM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-bold">Agrandissement</span>
            <select
              value={String(options.scale)}
              onChange={(e) => setOptions({ ...options, scale: e.target.value === 'auto' ? 'auto' : (Number(e.target.value) as 1 | 2) })}
              className="min-h-11 rounded-md border border-muted bg-surface px-2"
            >
              <option value="auto">Automatique</option>
              <option value="1">×1</option>
              <option value="2">×2</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-bold">Inversion (mode sombre)</span>
            <select
              value={options.invert}
              onChange={(e) => setOptions({ ...options, invert: e.target.value as PreprocessOptions['invert'] })}
              className="min-h-11 rounded-md border border-muted bg-surface px-2"
            >
              <option value="auto">Automatique</option>
              <option value="on">Toujours</option>
              <option value="off">Jamais</option>
            </select>
          </label>
          <div className="flex flex-col justify-end gap-1">
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" className="size-5" checked={options.stretchContrast} onChange={(e) => setOptions({ ...options, stretchContrast: e.target.checked })} />
              Renforcer le contraste
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" className="size-5" checked={options.binarize} onChange={(e) => setOptions({ ...options, binarize: e.target.checked })} />
              Noir et blanc (Otsu)
            </label>
          </div>
        </fieldset>

        <div className="mt-6">
          <PrimaryButton onClick={() => void run()} disabled={busy || files.length === 0 || engine.kind !== 'ready'}>
            {busy ? 'Lecture en cours…' : 'Lire les captures'}
          </PrimaryButton>
          <p className="mt-2 min-h-6 text-center tabular" aria-live="polite">
            {progress}
          </p>
        </div>

        {pages.map((page) => (
          <PageResult key={page.name + page.timingsMs.recognize} page={page} />
        ))}

        {errors.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-bold">Erreurs</h2>
            <ul className="mt-2 space-y-1 rounded-md border border-line bg-surface p-3 text-sm">
              {errors.map((message, index) => (
                <li key={index} className="break-words">
                  {message}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}

function PageResult({ page }: { page: PageView }) {
  const { preprocess: p, timingsMs: t, lines } = page
  const meanConfidence = lines.length ? Math.round(lines.reduce((s, l) => s + l.confidence, 0) / lines.length) : 0
  return (
    <section className="mt-10 border-t border-line pt-6">
      <h2 className="text-xl font-bold break-all">{page.name}</h2>
      <p className="mt-1 text-sm text-muted tabular">
        {p.width} × {p.height} px · échelle {p.scale} · {p.inverted ? 'inversée' : 'non inversée'}
        {p.threshold !== null && ` · seuil ${p.threshold}`} · prétraitement {t.preprocess} ms · lecture {t.recognize} ms ·{' '}
        {lines.length} lignes · confiance moyenne {meanConfidence}
      </p>

      <div className="relative mt-4 overflow-hidden rounded border border-line">
        <img src={page.preview} alt="Image prétraitée envoyée au moteur" className="block w-full" />
        <svg viewBox={`0 0 ${p.width} ${p.height}`} className="absolute inset-0 size-full" aria-hidden="true">
          {lines.map((line, index) => (
            <rect
              key={index}
              x={line.bbox.x0}
              y={line.bbox.y0}
              width={line.bbox.x1 - line.bbox.x0}
              height={line.bbox.y1 - line.bbox.y0}
              fill="none"
              stroke={line.confidence < LOW_CONFIDENCE ? '#d93025' : '#1d6a56'}
              strokeWidth={Math.max(2, p.width / 400)}
            />
          ))}
        </svg>
      </div>

      <ol className="mt-4 space-y-1 text-sm">
        {lines.map((line, index) => (
          <li
            key={index}
            className={`grid grid-cols-[3rem_1fr_auto] gap-2 rounded px-1 py-0.5 ${line.confidence < LOW_CONFIDENCE ? 'bg-mark text-mark-ink' : ''}`}
          >
            <span className="tabular text-muted">y{Math.round(line.bbox.y0)}</span>
            <span className="break-words">
              {line.segments.map((segment, i) => (
                <span key={i}>
                  {i > 0 && <span className="px-1 text-muted">|</span>}
                  {segment}
                </span>
              ))}
            </span>
            <span className="tabular">{Math.round(line.confidence)}</span>
          </li>
        ))}
      </ol>

      <details className="mt-4">
        <summary className="min-h-11 cursor-pointer font-bold">Texte brut de Tesseract</summary>
        <pre className="mt-2 overflow-x-auto rounded border border-line bg-surface p-3 text-sm whitespace-pre-wrap">{page.rawText}</pre>
      </details>
    </section>
  )
}
