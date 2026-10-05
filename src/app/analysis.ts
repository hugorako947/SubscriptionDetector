/**
 * The real import flow: read each screenshot, guess its kind, extract
 * transactions, detect subscriptions, save them. Images stay in memory only
 * and are released as soon as they are read.
 */
import { detectSubscriptions } from '../detection/engine'
import { prepareOcr, terminateOcr } from '../ocr/engine'
import { readScreenshot } from '../ocr/readScreenshot'
import { DEFAULT_PREPROCESS } from '../ocr/types'
import { referenceDayFrom } from '../parsing/dates'
import { classifyScreenshot } from '../sources/screenshots/classify'
import { screenshotToTransactions } from '../sources/screenshots'
import type { Transaction } from '../domain/types'
import { requestPersistence, saveDetections } from '../storage/db'

export interface AnalysisProgress {
  /** 1-based index of the screenshot being read. */
  current: number
  total: number
  /** 0–1 progress of the current screenshot. */
  fraction: number
}

export interface AnalysisSummary {
  screenshots: number
  /** Lines with an amount that were read (shown when nothing is found). */
  operations: number
  unreadable: number
  found: number
  added: number
  otherDebits: number
}

const TWO_YEARS_MS = 2 * 365 * 24 * 3600 * 1000

/**
 * « Aujourd'hui » on a screenshot means the day it was taken. The file date is
 * used when plausible (H11). TODO(vérifier) its value for images picked from
 * the iPhone photo library.
 */
function captureDay(file: File): Date {
  const modified = file.lastModified
  return modified && Date.now() - modified < TWO_YEARS_MS && modified <= Date.now() ? new Date(modified) : new Date()
}

export async function analyzeScreenshots(files: readonly File[], onProgress: (p: AnalysisProgress) => void): Promise<AnalysisSummary> {
  const transactions: Transaction[] = []
  let unreadable = 0
  onProgress({ current: 1, total: files.length, fraction: 0 })
  await prepareOcr()
  try {
    for (const [index, file] of files.entries()) {
      onProgress({ current: index + 1, total: files.length, fraction: 0 })
      try {
        const page = await readScreenshot(file, DEFAULT_PREPROCESS, '3', (status, value) => {
          if (status === 'recognizing text') onProgress({ current: index + 1, total: files.length, fraction: value })
        })
        page.canvas.width = page.canvas.height = 0 // frees the image memory right away
        const kind = classifyScreenshot(page.lines)
        transactions.push(
          ...screenshotToTransactions(kind, page.lines, { captureIndex: index, referenceDay: referenceDayFrom(captureDay(file)) }),
        )
      } catch (error) {
        unreadable++
        console.error(`Capture ${index + 1} illisible`, error)
      }
    }
  } finally {
    await terminateOcr()
  }
  const result = detectSubscriptions(transactions)
  const saved = await saveDetections([...result.subscriptions, ...result.otherDebits])
  void requestPersistence()
  return {
    screenshots: files.length,
    operations: transactions.filter((t) => t.amountCents !== undefined).length,
    unreadable,
    found: result.subscriptions.length,
    added: saved.added,
    otherDebits: result.otherDebits.length,
  }
}

/** Result of the last analysis, shown once on the dashboard (memory only). */
let lastSummary: AnalysisSummary | null = null
export const setLastSummary = (summary: AnalysisSummary | null) => {
  lastSummary = summary
}
export const takeLastSummary = (): AnalysisSummary | null => {
  const summary = lastSummary
  lastSummary = null
  return summary
}
