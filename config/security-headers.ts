/**
 * Single source of truth for security headers.
 * Used twice: by `vite preview` (local test of the real CSP) and to generate
 * `dist/_headers` (format read by Cloudflare Pages and Netlify,
 * TODO(vérifier) the exact syntax with the host's current docs).
 *
 * Every directive is explained because the CSP is what guarantees
 * that no request leaves for another domain.
 */
export const cspDirectives: Readonly<Record<string, readonly string[]>> = {
  // Everything not listed below is forbidden.
  'default-src': ["'none'"],
  // Our own scripts only. 'wasm-unsafe-eval' allows WebAssembly compilation
  // (needed by tesseract.js in phase 2) without allowing JS eval().
  // TODO(vérifier) support on Safari iOS.
  'script-src': ["'self'", "'wasm-unsafe-eval'"],
  'style-src': ["'self'"],
  // data: for the QR code (SVG generated in the browser), blob: for previews of
  // the screenshots the user selects (phase 2).
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'"],
  // The key guarantee: fetch/XHR/WebSocket can only reach our own site.
  'connect-src': ["'self'"],
  // The OCR worker will be loaded from our site (workerBlobURL: false, phase 2).
  'worker-src': ["'self'"],
  'manifest-src': ["'self'"],
  'base-uri': ["'none'"],
  'form-action': ["'none'"],
  'frame-ancestors': ["'none'"],
  'object-src': ["'none'"],
}

export function buildCsp(directives = cspDirectives): string {
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ')
}

export const securityHeaders: Readonly<Record<string, string>> = {
  'Content-Security-Policy': buildCsp(),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  // Capabilities the app never needs. Screenshots come from the gallery, not the camera.
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
}

/** Content of the `_headers` file: one rule applied to every path. */
export function buildHeadersFile(headers = securityHeaders): string {
  const lines = Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`)
  return ['/*', ...lines, ''].join('\n')
}
