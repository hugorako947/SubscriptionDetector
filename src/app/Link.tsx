import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { navigate } from './router'
import { shouldInterceptClick } from './routes'

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }

export function Link({ href, onClick, ...rest }: LinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    const intercept = shouldInterceptClick(
      {
        button: event.button,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        defaultPrevented: event.defaultPrevented,
        target: event.currentTarget.getAttribute('target'),
        download: event.currentTarget.hasAttribute('download'),
      },
      href,
      window.location.origin,
    )
    if (intercept) {
      event.preventDefault()
      navigate(href)
    }
  }
  return <a href={href} onClick={handleClick} {...rest} />
}
