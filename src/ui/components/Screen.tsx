import type { ReactNode } from 'react'
import { Link } from '../../app/Link'

/** Phone screen layout: left-aligned, single column, room for the bottom bar. */
export function Screen({ children, back }: { children: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mx-auto min-h-dvh max-w-xl">
      <header className="safe-x safe-top flex min-h-14 items-center">
        {back && (
          <Link href={back.href} className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-muted">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 6-6 6 6 6" />
            </svg>
            {back.label}
          </Link>
        )}
      </header>
      <main className="safe-x pb-40">{children}</main>
    </div>
  )
}

export function ScreenTitle({ children }: { children: ReactNode }) {
  return (
    <h1 tabIndex={-1} className="text-[1.875rem] leading-[1.15] font-bold tracking-[-0.01em] outline-none">
      {children}
    </h1>
  )
}
