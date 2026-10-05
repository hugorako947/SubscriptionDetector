import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createManual } from '../domain/portfolio'
import type { DetectedSubscription } from '../domain/types'
import * as storage from './db'

const detection = (id: string, amountCents = 1000): DetectedSubscription => ({
  id,
  displayName: id,
  category: 'streaming',
  amountCents,
  period: 'monthly',
  periodIsEstimated: true,
  monthlyEquivalentCents: amountCents,
  confidence: 'high',
  reasons: [],
  sourceTransactionIds: [],
  sourceLines: [],
  status: 'pending',
  needsAmount: false,
  kind: 'subscription',
})

beforeEach(async () => {
  await storage.wipeAll()
})

describe('local storage', () => {
  it('saves an analysis, then merges a second one without duplicates', async () => {
    expect(await storage.saveDetections([detection('a'), detection('b')])).toEqual({ added: 2, refreshed: 0 })
    await storage.editSubscription('a', { status: 'confirmed', amountCents: 1200 })
    expect(await storage.saveDetections([detection('a', 999), detection('c')])).toEqual({ added: 1, refreshed: 0 })
    const items = await storage.listSubscriptions()
    expect(items.map((s) => s.id).sort()).toEqual(['a', 'b', 'c'])
    expect(items.find((s) => s.id === 'a')).toMatchObject({ status: 'confirmed', amountCents: 1200, monthlyEquivalentCents: 1200 })
  })

  it('adds, edits and deletes manual items', async () => {
    const item = createManual({ displayName: 'Mutuelle', category: 'assurance' }, new Date().toISOString())
    await storage.addSubscription(item)
    await storage.editSubscription(item.id, { amountCents: 3000, period: 'monthly', userStatus: 'to_cancel' })
    expect((await storage.listSubscriptions())[0]).toMatchObject({ monthlyEquivalentCents: 3000, userStatus: 'to_cancel' })
    await storage.deleteSubscription(item.id)
    expect(await storage.listSubscriptions()).toEqual([])
  })

  it('remembers the ticked memory categories', async () => {
    await storage.setCheckedCategories(['streaming', 'presse'])
    expect(await storage.getCheckedCategories()).toEqual(['streaming', 'presse'])
  })

  it('« Tout effacer » removes everything and leaves a working empty database', async () => {
    await storage.saveDetections([detection('a')])
    await storage.setCheckedCategories(['musique'])
    await storage.wipeAll()
    expect(await storage.listSubscriptions()).toEqual([])
    expect(await storage.getCheckedCategories()).toEqual([])
    await storage.saveDetections([detection('z')])
    expect(await storage.listSubscriptions()).toHaveLength(1)
  })
})
