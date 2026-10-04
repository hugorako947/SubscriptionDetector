import { formatEuros, formatSignedEuros } from '../../domain/money'
import { PREVIEW_LINES, previewSummary } from './sampleData'

/** Fictional statement with the subscriptions highlighted, then the totals. */
export function StatementPreview({ size = 'compact' }: { size?: 'compact' | 'large' }) {
  const summary = previewSummary()
  const large = size === 'large'
  return (
    <figure className="w-full">
      <div className="rounded-[4px] border border-line bg-surface px-4 pt-3 pb-2 shadow-[0_2px_0_var(--line)]">
        <p className="pb-1 text-sm text-muted">Exemple fictif</p>
        <ul className={large ? 'text-base' : 'text-[0.9rem]'}>
          {PREVIEW_LINES.map((line) => (
            <li
              key={line.label}
              className="grid grid-cols-[2.9rem_1fr_auto] items-baseline gap-x-2 border-t border-line py-1.5 first:border-t-0"
            >
              <span className="tabular text-muted">{line.date}</span>
              <span className="min-w-0 truncate">
                {line.isSubscription ? (
                  <mark className="highlight px-1 font-bold">{line.label}</mark>
                ) : (
                  <span className="text-muted">{line.label}</span>
                )}
              </span>
              <span className={`tabular text-right ${line.isSubscription ? 'font-bold' : 'text-muted'}`}>
                {formatSignedEuros(line.cents)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="mt-4">
        <span className="block text-muted">{summary.count} abonnements repérés</span>
        <span className={`tabular block font-bold ${large ? 'text-4xl' : 'text-3xl'}`}>
          {formatEuros(summary.monthlyCents)} <span className="text-xl font-normal">par mois</span>
        </span>
        <span className="tabular block text-muted">soit {formatEuros(summary.yearlyCents)} par an</span>
      </figcaption>
    </figure>
  )
}
