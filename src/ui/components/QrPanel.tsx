import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { localAddressIssue, shareableUrl } from '../../app/shareUrl'

/** QR code generated in the browser from the current address (never hard-coded). */
export function QrPanel() {
  const url = shareableUrl(window.location.origin)
  const issue = localAddressIssue(window.location.hostname, window.location.protocol)
  // On localhost, a phone would try to reach itself: a QR code could only fail.
  const showCode = issue !== 'this-computer-only'
  const [dataUri, setDataUri] = useState<string | null>(null)

  useEffect(() => {
    if (!showCode) return
    let cancelled = false
    QRCode.toString(url, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      color: { dark: '#16302a', light: '#ffffff' },
    })
      .then((svg) => {
        if (!cancelled) setDataUri(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)
      })
      .catch((error: unknown) => console.error('QR code impossible à générer', error))
    return () => {
      cancelled = true
    }
  }, [url, showCode])

  return (
    <section aria-labelledby="qr-title" className="rounded-2xl border-2 border-accent bg-surface p-8">
      <h2 id="qr-title" className="text-2xl leading-tight font-bold">
        Continue sur ton téléphone
      </h2>

      {showCode ? (
        <>
          <p className="mt-2 text-muted">
            Scanne ce code avec l'appareil photo de ton téléphone. Tes captures d'écran y sont déjà : c'est là que
            tout va le plus vite.
          </p>
          <div className="mt-6 inline-block rounded-lg bg-white p-2">
            {dataUri ? (
              <img src={dataUri} width={232} height={232} alt={`QR code qui ouvre ${url}`} />
            ) : (
              <div className="size-[232px]" aria-hidden="true" />
            )}
          </div>
          <p className="mt-4 text-sm text-muted">Ou tape cette adresse :</p>
          <p className="font-bold break-all select-all">{url}</p>
          {issue === 'no-https' && (
            <p role="note" className="mt-4 rounded-md bg-mark px-3 py-2 text-sm text-mark-ink">
              Ton téléphone pourra ouvrir cette adresse, mais pas installer l'appli : il faut HTTPS.
            </p>
          )}
        </>
      ) : (
        // Only seen in development (localhost): the wording targets the developer.
        <div role="note" className="mt-4 rounded-md bg-mark px-4 py-3 text-mark-ink">
          <p className="font-bold">Pas de QR code sur {url}</p>
          <p className="mt-1">
            Sur un téléphone, « localhost » désigne le téléphone lui-même, pas cet ordinateur. Ouvre ce site par un
            tunnel HTTPS ou un déploiement d'aperçu : le code apparaîtra ici (voir docs/deploiement.md).
          </p>
        </div>
      )}
    </section>
  )
}
