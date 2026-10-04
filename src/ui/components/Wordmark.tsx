/** Provisional product name: not a final brand (see docs/decisions.md). */
export function Wordmark() {
  return (
    <p className="flex items-center gap-2 font-bold">
      <img src="/favicon.svg" alt="" width={28} height={28} className="rounded-md" />
      <span>Détecteur d'abonnements</span>
    </p>
  )
}
