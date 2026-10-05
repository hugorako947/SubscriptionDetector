import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'

/**
 * Re-renders whenever the queried IndexedDB data changes (Dexie liveQuery),
 * without the extra dexie-react-hooks package. `undefined` while loading.
 * Pass a stable function (defined at module level, e.g. listSubscriptions).
 */
export function useLive<T>(query: () => Promise<T>): T | undefined {
  const [value, setValue] = useState<T>()
  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next: setValue,
      error: (error: unknown) => console.error('Lecture des données locales impossible', error),
    })
    return () => subscription.unsubscribe()
  }, [query])
  return value
}
