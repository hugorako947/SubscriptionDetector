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
import { Resolver } from 'node:dns/promises'
import https from 'node:https'
import QRCode from 'qrcode'
import { preview } from 'vite'

const LOCAL_URL = 'http://127.0.0.1:4173'
const TUNNEL_URL_PATTERN = /https:\/\/(?!api\.)[a-z0-9-]+\.trycloudflare\.com/
const CHECK_INTERVAL_MS = 3000
const CHECK_ATTEMPTS = Number(process.env.TELEPHONE_CHECK_ATTEMPTS ?? 20)
const DNS_ATTEMPTS = 30

/*
 * The new tunnel hostname is checked through public resolvers, never through
 * the computer's own DNS: asking the system (or the internet box) too early
 * makes it remember "this name does not exist" for several minutes, and the
 * browser then fails too. This is what happened with the first version.
 */
const publicDns = new Resolver({ timeout: 3000, tries: 1 })
publicDns.setServers(['1.1.1.1', '8.8.8.8'])

/** IPv4 of the hostname per public DNS, null if not published yet, 'blocked' if public DNS is unreachable. */
async function publicLookup(hostname) {
  try {
    const [address] = await publicDns.resolve4(hostname)
    return address ?? null
  } catch (error) {
    return error.code === 'ENOTFOUND' || error.code === 'ENODATA' ? null : 'blocked'
  }
}

/** HTTPS GET on the tunnel, connecting to the given IP (still validated against the hostname's certificate). */
function tunnelStatus(url, address) {
  return new Promise((resolve) => {
    const request = https.request(
      url,
      {
        timeout: 10_000,
        lookup: (_hostname, options, callback) =>
          options?.all ? callback(null, [{ address, family: 4 }]) : callback(null, address, 4),
      },
      (response) => {
        response.resume()
        resolve(response.statusCode)
      },
    )
    request.on('timeout', () => request.destroy(new Error('timeout')))
    request.on('error', (error) => resolve(error.code ?? error.message))
    request.end()
  })
}
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
  const hostname = new URL(publicUrl).hostname

  say("Attente de la publication de l'adresse sur internet (DNS public) ...")
  let address = null
  for (let attempt = 1; attempt <= DNS_ATTEMPTS && !address; attempt++) {
    const result = await publicLookup(hostname)
    if (result === 'blocked') {
      fail(
        'Les DNS publics (1.1.1.1, 8.8.8.8) sont injoignables depuis ce réseau : vérification impossible.\n' +
          `  Attends une minute, puis ouvre ${publicUrl} directement sur ton téléphone.`,
      )
      return
    }
    address = result
    if (!address) {
      process.stdout.write(`  essai ${attempt}/${DNS_ATTEMPTS} : adresse pas encore publiée\n`)
      await sleep(CHECK_INTERVAL_MS)
    }
  }
  if (!address) {
    fail(`L'adresse ${hostname} n'a jamais été publiée. Arrête (Ctrl+C) et relance la commande.`)
    return
  }

  say('Vérification du chemin complet (internet → tunnel → cet ordinateur) ...')
  let status
  for (let attempt = 1; attempt <= CHECK_ATTEMPTS; attempt++) {
    status = await tunnelStatus(`${publicUrl}/`, address)
    if (status === 200) {
      const qr = await QRCode.toString(`${publicUrl}/`, { type: 'terminal', small: true })
      console.log(
        `\n✔ Tout fonctionne. Scanne ce code avec ton téléphone :\n\n${qr}\n` +
          `  Adresse : ${publicUrl}\n\n` +
          `  Sur le téléphone, de préférence en 4G/5G (Wi-Fi coupé) : le réseau mobile ne\n` +
          `  dépend pas de la box, qui peut mettre quelques minutes à connaître cette adresse.\n` +
          `  Sur ce PC, si le navigateur dit « adresse introuvable » : attends une minute,\n` +
          `  ou lance « ipconfig /flushdns » dans un autre terminal, puis recharge.\n\n` +
          `  Garde cette fenêtre ouverte pendant le test. Ctrl+C pour tout arrêter.\n` +
          `  L'adresse est publique tant que le tunnel tourne.\n`,
      )
      return
    }
    // 502: tunnel connected but cannot reach the preview. 530 (error 1033): no connector yet.
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
