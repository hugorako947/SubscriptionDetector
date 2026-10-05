/**
 * Dictionary of common subscription services in France.
 *
 * - `variants`: how the service may appear on a bank statement or a store page,
 *   already normalised (uppercase, no accents, see parsing/normalize.ts).
 *   TODO(vérifier) every variant against real statements: they are educated
 *   guesses, not verified bank formats (risk R11).
 * - No prices, ever: prices change (specification).
 * - `usualPeriod: 'unknown'` when the service commonly offers several periods.
 * - `cancelUrl` stays empty with `verified: false` until someone checks it.
 * - `intermediary`: payment platforms that hide the real service (Apple, Google, PayPal).
 */
import type { Category, Period } from '../domain/types'

export interface Service {
  id: string
  displayName: string
  category: Category
  variants: string[]
  usualPeriod: Period
  cancelUrl: string
  verified: boolean
  intermediary?: boolean
}

type Entry = [id: string, displayName: string, category: Category, usualPeriod: Period, variants: string[]]

const ENTRIES: Entry[] = [
  // Streaming vidéo
  ['netflix', 'Netflix', 'streaming', 'monthly', ['NETFLIX']],
  ['disney-plus', 'Disney+', 'streaming', 'monthly', ['DISNEY+', 'DISNEY PLUS', 'DISNEYPLUS']],
  ['prime-video', 'Amazon Prime', 'streaming', 'unknown', ['AMAZON PRIME', 'AMZN PRIME', 'PRIME VIDEO', 'PRIMEVIDEO']],
  ['canal-plus', 'Canal+', 'streaming', 'monthly', ['CANAL+', 'CANAL PLUS', 'CANALPLUS', 'GROUPE CANAL']],
  ['apple-tv-plus', 'Apple TV+', 'streaming', 'monthly', ['APPLE TV+', 'APPLE TV']],
  // TODO(vérifier) current name of the service in France (HBO Max / Max).
  ['hbo-max', 'HBO Max', 'streaming', 'monthly', ['HBO MAX', 'HBOMAX']],
  ['paramount-plus', 'Paramount+', 'streaming', 'monthly', ['PARAMOUNT+', 'PARAMOUNT PLUS']],
  ['crunchyroll', 'Crunchyroll', 'streaming', 'monthly', ['CRUNCHYROLL']],
  ['dazn', 'DAZN', 'streaming', 'monthly', ['DAZN']],
  ['bein-sports', 'beIN SPORTS', 'streaming', 'monthly', ['BEIN SPORTS', 'BEIN SPORT']],
  ['youtube-premium', 'YouTube Premium', 'streaming', 'monthly', ['YOUTUBE PREMIUM', 'YOUTUBEPREMIUM', 'GOOGLE YOUTUBE']],
  // Musique
  ['spotify', 'Spotify', 'musique', 'monthly', ['SPOTIFY']],
  ['deezer', 'Deezer', 'musique', 'monthly', ['DEEZER']],
  ['apple-music', 'Apple Music', 'musique', 'monthly', ['APPLE MUSIC']],
  // Stockage en ligne
  ['icloud', 'iCloud+', 'stockage', 'monthly', ['ICLOUD', 'ICLOUD+']],
  ['google-one', 'Google One', 'stockage', 'unknown', ['GOOGLE ONE', 'GOOGLE STORAGE']],
  ['dropbox', 'Dropbox', 'stockage', 'unknown', ['DROPBOX']],
  // Presse et lecture
  ['le-monde', 'Le Monde', 'presse', 'monthly', ['LE MONDE', 'LEMONDE']],
  ['le-figaro', 'Le Figaro', 'presse', 'monthly', ['LE FIGARO', 'FIGARO']],
  ['mediapart', 'Mediapart', 'presse', 'monthly', ['MEDIAPART']],
  ['lequipe', "L'Équipe", 'presse', 'monthly', ['L EQUIPE', 'LEQUIPE']],
  ['audible', 'Audible', 'presse', 'monthly', ['AUDIBLE']],
  // Salle de sport (période commune non vérifiée)
  ['basic-fit', 'Basic-Fit', 'sport', 'unknown', ['BASIC FIT', 'BASICFIT']],
  ['fitness-park', 'Fitness Park', 'sport', 'unknown', ['FITNESS PARK', 'FITNESSPARK']],
  // Téléphonie et box
  ['orange', 'Orange', 'telephonie', 'monthly', ['ORANGE']],
  ['sosh', 'Sosh', 'telephonie', 'monthly', ['SOSH']],
  ['sfr', 'SFR', 'telephonie', 'monthly', ['SFR']],
  ['red-by-sfr', 'RED by SFR', 'telephonie', 'monthly', ['RED BY SFR', 'REDBYSFR']],
  ['bouygues-telecom', 'Bouygues Telecom', 'telephonie', 'monthly', ['BOUYGUES TELECOM', 'BOUYGUES TEL', 'BYTEL']],
  ['free', 'Free', 'telephonie', 'monthly', ['FREE MOBILE', 'FREE TELECOM', 'FREEBOX']],
  ['b-and-you', 'B&You', 'telephonie', 'monthly', ['B&YOU', 'B AND YOU', 'BANDYOU']],
  // Applis et jeux
  ['chatgpt', 'ChatGPT', 'applis', 'monthly', ['OPENAI', 'CHATGPT']],
  ['adobe', 'Adobe', 'applis', 'unknown', ['ADOBE']],
  ['microsoft-365', 'Microsoft 365', 'applis', 'unknown', ['MICROSOFT 365', 'MICROSOFT365', 'OFFICE 365']],
  ['playstation-plus', 'PlayStation Plus', 'applis', 'unknown', ['PLAYSTATION', 'PLAYSTATION NETWORK', 'SONY INTERACTIVE']],
  ['xbox', 'Xbox Game Pass', 'applis', 'unknown', ['XBOX', 'XBOX GAME PASS']],
  ['nintendo-switch-online', 'Nintendo Switch Online', 'applis', 'unknown', ['NINTENDO']],
  ['duolingo', 'Duolingo', 'applis', 'unknown', ['DUOLINGO']],
  ['uber-one', 'Uber One', 'applis', 'monthly', ['UBER ONE']],
  ['deliveroo-plus', 'Deliveroo Plus', 'applis', 'monthly', ['DELIVEROO PLUS']],
]

const INTERMEDIARIES: Entry[] = [
  ['apple', 'Apple', 'applis', 'unknown', ['APPLE.COM BILL', 'APPLE COM BILL', 'APPLE.COM']],
  ['google-play', 'Google Play', 'applis', 'unknown', ['GOOGLE PLAY']],
  ['paypal', 'PayPal', 'autre', 'unknown', ['PAYPAL']],
]

const toService = ([id, displayName, category, usualPeriod, variants]: Entry, intermediary = false): Service => ({
  id,
  displayName,
  category,
  variants,
  usualPeriod,
  cancelUrl: '',
  verified: false,
  ...(intermediary ? { intermediary: true } : {}),
})

export const SERVICES: readonly Service[] = [
  ...ENTRIES.map((entry) => toService(entry)),
  ...INTERMEDIARIES.map((entry) => toService(entry, true)),
]

export const CATEGORY_LABELS: Record<Category, string> = {
  streaming: 'Streaming',
  musique: 'Musique',
  stockage: 'Stockage en ligne',
  presse: 'Presse et lecture',
  sport: 'Salle de sport',
  telephonie: 'Téléphonie et box',
  assurance: 'Assurances',
  banque: 'Options bancaires',
  applis: 'Applis et jeux',
  essai: 'Essais gratuits',
  autre: 'Autres',
}
