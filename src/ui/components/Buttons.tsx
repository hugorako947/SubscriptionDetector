import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from '../../app/Link'

const primary =
  'inline-flex min-h-13 w-full items-center justify-center rounded-xl bg-accent px-6 text-lg font-bold text-on-accent active:translate-y-px'
const secondary =
  'inline-flex min-h-11 items-center px-1 font-bold text-accent underline decoration-2 underline-offset-4'

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={primary}>
      {children}
    </Link>
  )
}

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`${primary} disabled:opacity-60`} />
}

export function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={secondary}>
      {children}
    </Link>
  )
}

export function SecondaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={secondary} />
}

/** Fixed bottom bar within thumb reach, clear of the home indicator. */
export function BottomActions({ children }: { children: ReactNode }) {
  return (
    <div className="safe-x safe-bottom fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper pt-3">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-1">{children}</div>
    </div>
  )
}
