export function PrivacyNote({ device = 'téléphone' }: { device?: 'téléphone' | 'appareil' }) {
  return (
    <div className="flex gap-3 border-l-4 border-accent py-1 pl-3">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 size-6 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="2" width="12" height="20" rx="2.5" />
        <path d="m9.5 12 2 2 3.5-4" />
      </svg>
      <p>
        <strong>Rien ne quitte ton {device}.</strong>{' '}
        <span className="text-muted">Les captures sont lues sur place, puis oubliées.</span>
      </p>
    </div>
  )
}
