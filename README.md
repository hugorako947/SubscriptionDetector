# Détecteur d'abonnements (nom provisoire)

Application web progressive (PWA) qui lit des captures d'écran sur le téléphone de l'utilisateur pour dresser la liste de ses abonnements, avec le total mensuel et annuel. Aucune donnée ne quitte l'appareil.

Avancement : **phase 4** terminée (parcours complet : guide de capture, import, analyse, tableau de bord, liste mémoire, essais, rappels .ics, Tout effacer). Phase 3 : moteur de détection. Phase 2 : lecture OCR locale, écran `/debug`. Phase 1 : squelette, PWA installable, accueils, guide d'installation. Plan complet et décisions : `docs/decisions.md`.

## Démarrer (Windows, PowerShell)

Prérequis : Node.js 24 LTS (ou 22.12+, ou 26+) et Git.

```powershell
cd C:\dev\detecteur-abonnements
npm ci                   # installe exactement les versions du lockfile
npm test                 # tests unitaires (Vitest)
npm run dev              # développement : http://localhost:5173 (sans service worker)
npm run preview:prod     # build + aperçu avec la vraie CSP : http://127.0.0.1:4173
npm run telephone        # build + aperçu + tunnel HTTPS vérifié, pour tester sur téléphone
```

Autres commandes : `npm run lint` (oxlint), `npm run typecheck`, `npm run build`.

## Organisation

```text
config/ocr-assets.ts         copie des fichiers OCR dans public/ocr (non versionné)
config/security-headers.ts   CSP et en-têtes : source unique (aperçu + dist/_headers)
design/                      sources SVG des icônes et script de génération des PNG
docs/                        décisions, déploiement, points à vérifier
public/icons/                icônes de la PWA
tests/fixtures/              captures fictives et leur script de génération
src/app/                     routeur maison, routes, adresse du QR code
src/data/services.ts         dictionnaire des services (sans prix)
src/debug/                   écran /debug (hors production)
src/detection/               moteur de détection, correspondance, périodicité, doublons
src/domain/                  types partagés, montants en centimes
src/ocr/                     prétraitement, moteur tesseract.js, reconstruction des lignes
src/parsing/                  montants, dates, libellés, mise en page, pages des stores
src/pwa/                     plateforme, installation, service worker
src/reminders/               fichier calendrier .ics
src/sources/                 adaptateurs d'entrée (captures ; CSV et PDF plus tard)
src/storage/                 stockage local (Dexie), Tout effacer
src/ui/                      écrans, composants, illustrations, aperçu fictif
```

Le dossier `metrics/` (mode test et mesures) arrivera en phase 6.

## Principes

Confidentialité totale (CSP `connect-src 'self'`, aucun script ni police tiers), mobile d'abord, 0 €, l'utilisateur valide toujours, rien d'inventé : tout point non confirmé porte `TODO(vérifier)` et figure dans `docs/a-verifier.md`.

## Déployer et tester sur téléphone

Voir `docs/deploiement.md`.
