/**
 * Simplified sketches of Safari on iPhone (not screenshots of Apple's UI).
 * TODO(vérifier) on a real iPhone, especially iOS 26 where Safari's toolbar changed:
 * position of the Share button and exact labels « Sur l'écran d'accueil », « Ajouter ».
 */
const frame = 'w-full max-w-[17rem] rounded-lg border border-line bg-paper'

export function ShareButtonSketch() {
  return (
    <svg role="img" aria-label="Barre d'outils de Safari, le bouton Partager est entouré" viewBox="0 0 272 64" className={frame}>
      <rect x="0" y="0" width="272" height="64" rx="8" fill="var(--surface)" />
      <g fill="none" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M34 24 26 32l8 8" />
        <path d="M78 24l8 8-8 8" />
        <rect x="186" y="22" width="16" height="20" rx="3" />
        <rect x="226" y="24" width="18" height="18" rx="3" />
      </g>
      <circle cx="136" cy="32" r="22" fill="var(--mark)" />
      <g fill="none" stroke="var(--mark-ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M130 27h-4v16h20V27h-4" />
        <path d="M136 35V18m-5 5 5-5 5 5" />
      </g>
    </svg>
  )
}

export function AddToHomeSketch() {
  return (
    <svg role="img" aria-label="Menu de partage, la ligne « Sur l'écran d'accueil » est surlignée" viewBox="0 0 272 112" className={frame}>
      <rect x="0" y="0" width="272" height="112" rx="8" fill="var(--surface)" />
      <text x="16" y="30" fontSize="15" fill="var(--muted)" fontFamily="inherit">Copier</text>
      <line x1="16" y1="42" x2="256" y2="42" stroke="var(--line)" />
      <rect x="8" y="48" width="256" height="34" rx="6" fill="var(--mark)" />
      <text x="16" y="70" fontSize="15" fontWeight="700" fill="var(--mark-ink)" fontFamily="inherit">Sur l'écran d'accueil</text>
      <g fill="none" stroke="var(--mark-ink)" strokeWidth="2" strokeLinecap="round">
        <rect x="232" y="56" width="18" height="18" rx="4" />
        <path d="M241 60v10m-5-5h10" />
      </g>
      <line x1="16" y1="88" x2="256" y2="88" stroke="var(--line)" />
      <text x="16" y="106" fontSize="15" fill="var(--muted)" fontFamily="inherit">Ajouter un signet</text>
    </svg>
  )
}

export function ConfirmAddSketch() {
  return (
    <svg role="img" aria-label="Écran de confirmation, le bouton « Ajouter » en haut à droite est entouré" viewBox="0 0 272 72" className={frame}>
      <rect x="0" y="0" width="272" height="72" rx="8" fill="var(--surface)" />
      <text x="16" y="30" fontSize="15" fill="var(--muted)" fontFamily="inherit">Annuler</text>
      <rect x="196" y="12" width="66" height="28" rx="14" fill="var(--mark)" />
      <text x="229" y="31" fontSize="15" fontWeight="700" textAnchor="middle" fill="var(--mark-ink)" fontFamily="inherit">Ajouter</text>
      <rect x="16" y="48" width="16" height="16" rx="4" fill="var(--accent)" />
      <text x="40" y="61" fontSize="14" fill="var(--ink)" fontFamily="inherit">Abonnements</text>
    </svg>
  )
}
