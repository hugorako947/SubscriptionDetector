/**
 * Debits that are recurring but are not subscriptions (rule 2): they go to
 * « Autres prélèvements » and are never counted in the totals.
 */
const RULES: Array<[RegExp, string]> = [
  [/\b(DGFIP|IMPOTS?|TRESOR PUBLIC|FINANCES PUBLIQUES|TAXE|AMENDES?|ANTAI)\b/, 'Impôts ou taxes'],
  [/\b(PRET|ECHEANCE|ECH|CREDIT|EMPRUNT|REMBT|LOA|LLD)\b/, 'Crédit ou prêt'],
  [/\b(URSSAF|COTISATIONS? SOCIALES?)\b/, 'Cotisations sociales'],
  [/\bLOYERS?\b/, 'Loyer'],
]

export function otherDebitReason(normalizedLabel: string): string | null {
  for (const [pattern, reason] of RULES) if (pattern.test(normalizedLabel)) return reason
  return null
}
