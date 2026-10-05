/**
 * Whole chain on the real OCR output of the fictional screenshots
 * (tests/fixtures/ocr/*.json, produced by the /debug screen from
 * tests/fixtures/images/). Includes real OCR artefacts: lost accents, « - »
 * for « − », amounts on their own line, a low-confidence « RL ».
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { detectSubscriptions, totals } from '../../detection/engine'
import type { OcrLine } from '../../ocr/types'
import type { ReferenceDay } from '../../parsing/dates'
import { parseBankList } from '../../parsing/layout'
import { screenshotToTransactions } from './index'

const load = (name: string): OcrLine[] =>
  JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/ocr', `${name}.json`), 'utf8')) as OcrLine[]

const referenceDay: ReferenceDay = { year: 2026, month: 10, day: 5 }

describe('bank statement (light and dark mode give the same result)', () => {
  for (const name of ['banque-fictive-clair', 'banque-fictive-sombre']) {
    it(`${name}: pairs every label with its amount and date header`, () => {
      const entries = parseBankList(load(name), referenceDay)
      expect(entries.map((e) => [e.label, e.amount?.cents, e.date?.iso, e.kind, e.direction])).toEqual([
        ['PRLV SEPA CINÉFLUX', 1199, '2026-09-02', 'sepa', 'debit'],
        ['CB BOULANGERIE DU PORT', 420, '2026-09-02', 'card', 'debit'],
        ['PRLV SEPA ONDEA MUSIQUE', 1099, '2026-09-04', 'sepa', 'debit'],
        ['CB SUPERMARCHE CENTRE', 3874, '2026-09-04', 'card', 'debit'],
        ['NUAGERIE 200 GO', 299, '2026-09-08', 'card', 'debit'],
        ['PRLV CLUB FORME+', 2499, '2026-09-08', 'sepa', 'debit'],
        ['REMBOURSEMENT', 1500, '2026-09-08', 'transfer', 'credit'],
      ])
    })
  }

  it('keeps unknown SEPA creditors as candidates and ignores the rest', () => {
    const transactions = screenshotToTransactions('screenshot_card_history', load('banque-fictive-clair'), {
      captureIndex: 0,
      referenceDay,
    })
    const result = detectSubscriptions(transactions)
    expect(result.subscriptions.map((s) => [s.displayName, s.amountCents, s.confidence])).toEqual([
      ['Club Forme+', 2499, 'medium'],
      ['Cineflux', 1199, 'medium'],
      ['Ondea Musique', 1099, 'medium'],
    ])
    expect(result.stats).toMatchObject({ transactions: 7, credits: 1, ignored: 3 })
  })

  it('deduplicates the same statement imported twice', () => {
    const lines = load('banque-fictive-clair')
    const twice = [
      ...screenshotToTransactions('screenshot_card_history', lines, { captureIndex: 0, referenceDay }),
      ...screenshotToTransactions('screenshot_card_history', load('banque-fictive-sombre'), { captureIndex: 1, referenceDay }),
    ]
    const result = detectSubscriptions(twice)
    expect(result.stats.duplicates).toBe(7)
    expect(result.subscriptions).toHaveLength(3)
  })
})

describe('store subscriptions page', () => {
  it('reads name, price, period, renewal and trial, and skips expired ones', () => {
    const transactions = screenshotToTransactions('screenshot_store', load('store-fictif'), { captureIndex: 0, referenceDay })
    const { subscriptions } = detectSubscriptions(transactions)
    expect(
      subscriptions.map((s) => [s.displayName, s.amountCents, s.period, s.monthlyEquivalentCents, s.nextRenewal, s.trialEndsAt, s.category]),
    ).toEqual([
      ['Cinéflux', 499, 'monthly', 499, '2026-10-12', undefined, 'autre'],
      ['Carnet Malin', 299, 'monthly', 299, undefined, '2026-10-20', 'essai'],
      ['Nuagerie Pro', 2999, 'yearly', 250, '2027-03-03', undefined, 'autre'],
    ])
    expect(subscriptions.every((s) => s.confidence === 'high')).toBe(true)
    expect(JSON.stringify(subscriptions)).not.toContain('Vieux Jeu')
  })
})

describe('bank debits page (names only) combined with the statement', () => {
  it('fills amounts from the statement, flags taxes apart, asks for missing amounts', () => {
    const transactions = [
      ...screenshotToTransactions('screenshot_bank_debits', load('prelevements-fictifs'), { captureIndex: 0, referenceDay }),
      ...screenshotToTransactions('screenshot_card_history', load('banque-fictive-clair'), { captureIndex: 1, referenceDay }),
    ]
    const result = detectSubscriptions(transactions)
    expect(result.subscriptions.map((s) => [s.displayName, s.amountCents, s.needsAmount])).toEqual([
      ['Club Forme+', 2499, false],
      ['Cineflux', 1199, false],
      ['Ondea Musique', 1099, false],
    ])
    expect(result.otherDebits.map((s) => s.displayName)).toEqual(['Dgfip Impot'])
    expect(totals(result.subscriptions).withoutAmount).toBe(3) // unknown creditors: frequency to confirm
  })

  it('page titles and « Mandat actif » never become subscriptions', () => {
    const transactions = screenshotToTransactions('screenshot_bank_debits', load('prelevements-fictifs'), { captureIndex: 0, referenceDay })
    expect(transactions.map((t) => t.normalizedLabel)).toEqual(['CINEFLUX SAS', 'DGFIP IMPOT', 'CLUB FORME PLUS', 'ONDEA MUSIQUE'])
  })
})

describe('transfers between people', () => {
  const line = (text: string, y: number): OcrLine => ({
    text,
    segments: [text],
    words: text.split(' ').map((word, i) => ({ text: word, confidence: 95, bbox: { x0: i * 100, y0: y, x1: i * 100 + 90, y1: y + 30 } })),
    bbox: { x0: 0, y0: y, x1: 900, y1: y + 30 },
    confidence: 95,
  })

  it("never keeps or shows the name of a person found in a transfer (rule 4)", () => {
    const lines = [line('Lundi 7 septembre', 100), line('VIR SEPA M JEAN DUPONT -50,00 €', 200), line('PRLV SEPA NETFLIX.COM -10,00 €', 300)]
    const transactions = screenshotToTransactions('screenshot_card_history', lines, { captureIndex: 0, referenceDay })
    const transfer = transactions.find((t) => t.kind === 'transfer')
    expect(transfer).toMatchObject({ rawText: '', label: '', normalizedLabel: '', amountCents: 5000 })
    const result = detectSubscriptions(transactions)
    expect(result.subscriptions.map((s) => s.displayName)).toEqual(['Netflix'])
    expect(result.stats.transfers).toBe(1)
    expect(JSON.stringify({ transactions, result })).not.toMatch(/DUPONT|JEAN/)
  })
})

describe('bank app printing the date under each label (layout seen on a real app, invented data)', () => {
  it('gives every row its own date, joins a label written on two lines, finds no-PRLV subscriptions', () => {
    const lines = load('banque-date-sous-libelle')
    expect(parseBankList(lines, referenceDay).map((e) => [e.label, e.amount?.cents, e.date?.iso, e.kind])).toEqual([
      ['Compte individuel', undefined, undefined, 'unknown'],
      ['REMISE COTISATIONS', 995, '2026-05-18', 'unknown'],
      ['COTISATIONS BANCAIRES', 1595, '2026-05-18', 'unknown'],
      ['M DURAND PAUL', 1000, '2026-05-16', 'transfer'],
      ['PASS NAVIGO / IMAGIN-R', 5000, '2026-05-06', 'unknown'],
      ['MUTUELLE EXEMPLE', 2310, '2026-05-05', 'unknown'],
      ['DEBIT DIFFERE N° 1234', 25000, '2026-05-04', 'unknown'],
      ['BANQUE EXEMPLE ILE DE FRANCE', 540, '2026-05-04', 'unknown'],
      ['VIREMENT MENSUEL', 2000, '2026-05-04', 'transfer'],
      ['CB EPICERIE DU COIN', 830, '2026-05-02', 'card'],
    ])
    const transactions = screenshotToTransactions('screenshot_card_history', lines, { captureIndex: 0, referenceDay })
    const result = detectSubscriptions(transactions)
    expect(result.subscriptions.map((s) => [s.displayName, s.amountCents, s.confidence, s.category])).toEqual([
      ['Navigo / Imagine R', 5000, 'high', 'transport'],
      ['Mutuelle Exemple', 2310, 'medium', 'assurance'],
      ['Cotisations Bancaires', 1595, 'medium', 'banque'],
    ])
    expect(result.stats).toMatchObject({ credits: 1, transfers: 2 })
    // The person's name in a transfer is never kept (rule 4).
    expect(JSON.stringify({ transactions, result })).not.toContain('DURAND')
  })

  it('finds nothing on a page without subscriptions, and keeps no name', () => {
    const transactions = screenshotToTransactions('screenshot_card_history', load('banque-sans-abonnement'), { captureIndex: 0, referenceDay })
    const result = detectSubscriptions(transactions)
    expect(result.subscriptions).toEqual([])
    expect(transactions.filter((t) => t.amountCents !== undefined)).toHaveLength(4)
    expect(JSON.stringify(transactions)).not.toContain('DURAND')
  })
})
