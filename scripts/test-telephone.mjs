/**
 * One command to test on a phone: starts the production preview, opens a
 * Cloudflare quick tunnel to it, then checks the whole path (internet → tunnel
 * → this computer) before telling the user the address is ready.
 *
 * Usage: npm run telephone            (builds first, see package.json)
 *        npm run telephone -- --http2  (if the network blocks QUIC/UDP)
 *
 * Messages are in French: they are read by the developer at the console.
 */
import { spawn } from 'node:child_process'
import { preview } from 'vite'

const LOCAL_URL = 'http://127.0.0.1:4173'
const TUNNEL_URL_PATTERN = /https:\/\/(?!api\.)[a-z0-9-]+\.trycloudflare\.com/
const CHECK_INTERVAL_MS = 3000
const CHECK_ATTEMPTS = Number(process.env.TELEPHONE_CHECK_ATTEMPTS ?? 20)
const useHttp2 = process.argv.includes('--http2')

const say = (message) => console.log(`\n▶ ${message}`)
const fail = (message) => {
  console.error(`\n✖ ${message}\n`)
  process.exitCode = 1
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function httpStatus(url) {
  try {
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10_000) })
    return response.status
  } catch (error) {
    return error instanceof Error ? error.cause?.code ?? error.name : 'erreur'
  }
}

// 1. Local preview, in this same process (no second window to keep open).
say(`Démarrage de l'aperçu sur ${LOCAL_URL} ...`)
let server
try {
  server = await preview()
} catch (error) {
  fail(
    `L'aperçu n'a pas démarré : ${error.message}\n` +
      '  Si le port 4173 est déjà pris, ferme l\'autre fenêtre où tourne "npm run preview:prod".',
  )
  process.exit()
}
const localStatus = await httpStatus(`${LOCAL_URL}/`)
if (localStatus !== 200) {
  fail(`L'aperçu ne répond pas correctement (${localStatus}).`)
  await server.close()
  process.exit()
}
say('Aperçu prêt.')

// 2. Tunnel.
const args = ['tunnel', '--no-autoupdate', '--url', LOCAL_URL]
if (useHttp2) args.splice(1, 0, '--protocol', 'http2')
say(`Ouverture du tunnel : cloudflared ${args.join(' ')}`)
const tunnel = spawn('cloudflared', args, { stdio: ['ignore', 'pipe', 'pipe'] })

let publicUrl = null
let registered = false
let checking = false
const recentErrors = []

let shuttingDown = false
async function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  tunnel.kill()
  await server.close()
  process.exit()
}
process.on('SIGINT', () => void shutdown())

tunnel.on('error', (error) => {
  if (error.code === 'ENOENT') {
    fail(
      'cloudflared est introuvable.\n' +
        '  Installe-le : winget install --id Cloudflare.cloudflared -e\n' +
        '  puis ferme et rouvre le terminal (y compris celui de ton éditeur).',
    )
  } else {
    fail(`cloudflared n'a pas pu démarrer : ${error.message}`)
  }
  void shutdown()
})

tunnel.on('exit', (code) => {
  if (code !== null && code !== 0) fail(`cloudflared s'est arrêté (code ${code}).`)
  void shutdown()
})

function onLine(line) {
  const urlMatch = line.match(TUNNEL_URL_PATTERN)
  if (urlMatch && !publicUrl) {
    publicUrl = urlMatch[0]
    say(`Adresse du tunnel : ${publicUrl} (pas encore vérifiée)`)
    // If the "registered" log line changes format, check anyway after a few seconds.
    setTimeout(() => void checkEndToEnd(), 8000)
  }
  if (/Registered tunnel connection/i.test(line) && !registered) {
    registered = true
    void checkEndToEnd()
  }
  if (/\bERR\b|error/i.test(line)) {
    recentErrors.push(line.trim())
    if (recentErrors.length > 8) recentErrors.shift()
    console.log(`  cloudflared : ${line.trim()}`)
  }
}

for (const stream of [tunnel.stdout, tunnel.stderr]) {
  let buffer = ''
  stream.setEncoding('utf8')
  stream.on('data', (chunk) => {
    buffer += chunk
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''
    lines.forEach(onLine)
  })
}

// 3. End-to-end check, from the internet back to this computer.
async function checkEndToEnd() {
  if (checking || !publicUrl) return
  checking = true
  say('Vérification du chemin complet (internet → tunnel → cet ordinateur) ...')
  let status
  for (let attempt = 1; attempt <= CHECK_ATTEMPTS; attempt++) {
    status = await httpStatus(`${publicUrl}/`)
    if (status === 200) {
      console.log(
        `\n✔ Tout fonctionne.\n\n` +
          `  1. Ouvre sur ce PC :  ${publicUrl}\n` +
          `  2. Scanne le QR code avec ton téléphone.\n\n` +
          `  Garde cette fenêtre ouverte pendant le test. Ctrl+C pour tout arrêter.\n` +
          `  L'adresse est publique tant que le tunnel tourne.\n`,
      )
      return
    }
    // 502: tunnel connected but cannot reach the preview. 530 (error 1033): no connector yet.
    // ENOTFOUND: the new hostname is not resolvable yet.
    process.stdout.write(`  essai ${attempt}/${CHECK_ATTEMPTS} : ${status}\n`)
    await sleep(CHECK_INTERVAL_MS)
  }
  const retryHint = useHttp2 ? '' : ' Essaie : npm run telephone -- --http2'
  const hint =
    status === 502
      ? "Le tunnel est connecté mais n'atteint pas l'aperçu sur ce PC (erreur 502)."
      : status === 530
        ? `Cloudflare ne voit aucun tunnel connecté (erreur 1033).${retryHint}`
        : `Le tunnel ne répond pas (${status}).${retryHint}`
  fail(
    `${hint}\n  Dernières erreurs de cloudflared :\n` +
      (recentErrors.length ? recentErrors.map((l) => `    ${l}`).join('\n') : '    (aucune)') +
      '\n  Copie ce bloc pour le diagnostic. La fenêtre reste ouverte : Ctrl+C pour arrêter.',
  )
}
