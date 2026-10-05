/**
 * Local storage (IndexedDB through Dexie). Only what the user validated or
 * entered is kept: never images, never OCR text other than the short source
 * lines shown as « ligne source lue », never transfers.
 */
import { Dexie, type EntityTable } from 'dexie'
import { applyEdit, mergeDetections, type StoredSubscription, type SubscriptionEdit } from '../domain/portfolio'
import type { Category, DetectedSubscription } from '../domain/types'

export interface Settings {
  key: 'memory'
  /** Categories ticked in the « mémoire » checklist. */
  checkedCategories: Category[]
}

export const DB_NAME = 'detecteur-abonnements'

class AppDatabase extends Dexie {
  subscriptions!: EntityTable<StoredSubscription, 'id'>
  settings!: EntityTable<Settings, 'key'>

  constructor() {
    super(DB_NAME)
    // Version 1. A schema change adds a new version() call with its upgrade.
    this.version(1).stores({
      subscriptions: 'id, status, userStatus, kind, nextRenewal, trialEndsAt',
      settings: 'key',
    })
  }
}

export let db = new AppDatabase()

const nowIso = () => new Date().toISOString()

/** Asks the browser not to evict our data (Safari can clear sites not used for a while). */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}

export async function listSubscriptions(): Promise<StoredSubscription[]> {
  return db.subscriptions.toArray()
}

export async function saveDetections(detected: readonly DetectedSubscription[]): Promise<{ added: number; refreshed: number }> {
  return db.transaction('rw', db.subscriptions, async () => {
    const existing = await db.subscriptions.toArray()
    const { added, refreshed } = mergeDetections(existing, detected, nowIso())
    await db.subscriptions.bulkPut([...added, ...refreshed])
    return { added: added.length, refreshed: refreshed.length }
  })
}

export async function addSubscription(item: StoredSubscription): Promise<void> {
  await db.subscriptions.put(item)
}

export async function editSubscription(id: string, edit: SubscriptionEdit): Promise<void> {
  await db.transaction('rw', db.subscriptions, async () => {
    const item = await db.subscriptions.get(id)
    if (item) await db.subscriptions.put(applyEdit(item, edit, nowIso()))
  })
}

export async function deleteSubscription(id: string): Promise<void> {
  await db.subscriptions.delete(id)
}

export async function getCheckedCategories(): Promise<Category[]> {
  return (await db.settings.get('memory'))?.checkedCategories ?? []
}

export async function setCheckedCategories(categories: Category[]): Promise<void> {
  await db.settings.put({ key: 'memory', checkedCategories: categories })
}

/** « Tout effacer »: deletes the whole database, then starts an empty one. */
export async function wipeAll(): Promise<void> {
  db.close()
  await Dexie.delete(DB_NAME)
  db = new AppDatabase()
}
