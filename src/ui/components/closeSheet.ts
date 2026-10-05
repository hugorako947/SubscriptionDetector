/** Closes the sheet (native <dialog>) containing this element. */
export function closeSheet(element: HTMLElement | null): void {
  element?.closest('dialog')?.close()
}
