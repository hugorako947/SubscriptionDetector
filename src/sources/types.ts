/**
 * Every input (screenshots today, CSV and PDF later) produces the same
 * Transaction format, so methods can be compared on equal terms.
 */
import type { SourceKind, Transaction } from '../domain/types'
import type { ReferenceDay } from '../parsing/dates'

export interface SourceContext {
  captureIndex: number
  /** Day the screenshot was taken (or imported, H11): « Aujourd'hui » refers to it. */
  referenceDay: ReferenceDay
}

export interface SourceAdapter<Input> {
  kind: SourceKind
  toTransactions(input: Input, context: SourceContext): Transaction[]
}
