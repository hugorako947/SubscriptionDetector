import { describe, expect, it } from 'vitest'
import { PREVIEW_LINES, previewSummary } from './sampleData'

describe('previewSummary', () => {
  it('only counts the highlighted (subscription) lines', () => {
    expect(previewSummary()).toEqual({ count: 4, monthlyCents: 5096, yearlyCents: 61152 })
  })
  it('never counts credits as subscriptions', () => {
    expect(PREVIEW_LINES.filter((l) => l.cents > 0).every((l) => !l.isSubscription)).toBe(true)
  })
})
