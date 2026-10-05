export function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

export function hasLetters(text: string): boolean {
  return /\p{L}{2,}/u.test(text)
}
