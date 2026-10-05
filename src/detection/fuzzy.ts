/** String distances used to match OCR'd labels against the service dictionary. */

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + cost)
    }
    previous = current
  }
  return previous[b.length]!
}

export function jaro(a: string, b: string): number {
  if (a === b) return 1
  if (!a.length || !b.length) return 0
  const window = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1)
  const aMatched = new Array<boolean>(a.length).fill(false)
  const bMatched = new Array<boolean>(b.length).fill(false)
  let matches = 0
  for (let i = 0; i < a.length; i++) {
    const from = Math.max(0, i - window)
    const to = Math.min(b.length - 1, i + window)
    for (let j = from; j <= to; j++) {
      if (bMatched[j] || a[i] !== b[j]) continue
      aMatched[i] = bMatched[j] = true
      matches++
      break
    }
  }
  if (matches === 0) return 0
  let transpositions = 0
  let k = 0
  for (let i = 0; i < a.length; i++) {
    if (!aMatched[i]) continue
    while (!bMatched[k]) k++
    if (a[i] !== b[k]) transpositions++
    k++
  }
  return (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3
}

/** Jaro-Winkler similarity, 0–1 (1 = identical), favouring a common prefix. */
export function jaroWinkler(a: string, b: string, prefixScale = 0.1): number {
  const similarity = jaro(a, b)
  let prefix = 0
  while (prefix < Math.min(4, a.length, b.length) && a[prefix] === b[prefix]) prefix++
  return similarity + prefix * prefixScale * (1 - similarity)
}
