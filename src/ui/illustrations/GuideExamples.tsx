import type { ReactNode } from 'react'

/**
 * Small fictional examples of the three pages to capture. Invented names and
 * amounts; they show the shape of the page, not any real app.
 */
function Phone({ title, children, label }: { title: string; children: ReactNode; label: string }) {
  return (
    <div role="img" aria-label={label} className="w-full max-w-[15rem] rounded-xl border-2 border-line bg-surface p-3 text-[0.8rem] leading-tight shadow-[0_2px_0_var(--line)]">
      <p className="mb-2 text-sm font-bold" aria-hidden="true">
        {title}
      </p>
      <div aria-hidden="true">{children}</div>
    </div>
  )
}

const Row = ({ left, right, sub, marked }: { left: string; right?: string; sub?: string; marked?: boolean }) => (
  <div className="flex items-center justify-between gap-2 border-t border-line py-1.5 first:border-t-0">
    <div>
      <div className={marked ? 'highlight inline px-0.5 font-bold' : ''}>{left}</div>
      {sub && <div className="text-[0.7rem] text-muted">{sub}</div>}
    </div>
    {right && <div className="tabular font-bold">{right}</div>}
  </div>
)

export function DebitsExample() {
  return (
    <Phone title="Prélèvements" label="Exemple fictif : la page des prélèvements liste les organismes qui te prélèvent">
      <Row left="CINÉFLUX SAS" sub="Mandat actif" marked />
      <Row left="CLUB FORME+" sub="Mandat actif" marked />
      <Row left="ONDÉA MUSIQUE" sub="Mandat actif" marked />
    </Phone>
  )
}

export function StoreExample() {
  return (
    <Phone title="Abonnements" label="Exemple fictif : la page des abonnements du store, avec le prix et la date de renouvellement">
      <Row left="Nuagerie Pro" sub="Renouvellement le 3 mars" right="29,99 €/an" marked />
      <Row left="Carnet Malin" sub="Essai gratuit jusqu'au 20 oct." right="2,99 €/mois" marked />
    </Phone>
  )
}

export function HistoryExample() {
  return (
    <Phone title="Opérations" label="Exemple fictif : l'historique des paiements, où les abonnements se mêlent aux achats">
      <Row left="PRLV CINÉFLUX" right="−11,99 €" marked />
      <Row left="CB BOULANGERIE" right="−4,20 €" />
      <Row left="NUAGERIE 200 GO" right="−2,99 €" marked />
    </Phone>
  )
}
