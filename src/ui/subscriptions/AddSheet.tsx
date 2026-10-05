import type { ReactNode } from 'react'
import { navigate } from '../../app/router'
import { ROUTES } from '../../app/routes'
import { closeSheet } from '../components/closeSheet'
import { Sheet } from '../components/Sheet'

function Choice({ title, text, onClick, icon }: { title: string; text: string; onClick: (button: HTMLButtonElement) => void; icon: ReactNode }) {
  return (
    <li>
      <button type="button" onClick={(e) => onClick(e.currentTarget)} className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-3 text-left">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-paper text-accent">
          {icon}
        </span>
        <span>
          <span className="block font-bold">{title}</span>
          <span className="block text-sm text-muted">{text}</span>
        </span>
      </button>
    </li>
  )
}

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

export function AddSheet({ onClose, onManual, onTrial }: { onClose: () => void; onManual: () => void; onTrial: () => void }) {
  const leaveTo = (button: HTMLButtonElement, route: string) => {
    closeSheet(button)
    navigate(route)
  }
  return (
    <Sheet title="Ajouter" onClose={onClose}>
      <ul className="space-y-2">
        <Choice title="D'autres captures" text="Une autre banque, un autre store…" icon={icon('M4 7h3l2-3h6l2 3h3v12H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z')} onClick={(b) => leaveTo(b, ROUTES.captures)} />
        <Choice title="La liste mémoire" text="Ce que les captures n'ont pas montré." icon={icon('M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2')} onClick={(b) => leaveTo(b, ROUTES.memory)} />
        <Choice
          title="Un abonnement à la main"
          text="Nom, montant, fréquence."
          icon={icon('M12 5v14M5 12h14')}
          onClick={(b) => {
            closeSheet(b)
            onManual()
          }}
        />
        <Choice
          title="Un essai gratuit"
          text="Le nom et la date de fin, c'est tout."
          icon={icon('M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z')}
          onClick={(b) => {
            closeSheet(b)
            onTrial()
          }}
        />
      </ul>
    </Sheet>
  )
}
