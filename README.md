# Détecteur d'abonnements (nom provisoire)

Application web progressive (PWA) qui lit des captures d'écran sur le téléphone de l'utilisateur pour dresser la liste de ses abonnements, avec le total mensuel et annuel. Aucune donnée ne quitte l'appareil.

Avancement : **phase 1** terminée (squelette, PWA installable, accueils PC et mobile, guide d'installation). Plan complet et décisions : `docs/decisions.md`.

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
config/security-headers.ts   CSP et en-têtes : source unique (aperçu + dist/_headers)
design/                      sources SVG des icônes et script de génération des PNG
docs/                        décisions, déploiement, points à vérifier
public/icons/                icônes de la PWA
src/app/                     routeur maison, routes, adresse du QR code
src/domain/                  types partagés, montants en centimes
src/pwa/                     plateforme, installation, service worker
src/ui/                      écrans, composants, illustrations, aperçu fictif
```

Les dossiers `ocr/`, `parsing/`, `detection/`, `sources/`, `data/`, `storage/`, `reminders/`, `metrics/` et `debug/` arriveront dans les phases 2 à 6.

## Principes

Confidentialité totale (CSP `connect-src 'self'`, aucun script ni police tiers), mobile d'abord, 0 €, l'utilisateur valide toujours, rien d'inventé : tout point non confirmé porte `TODO(vérifier)` et figure dans `docs/a-verifier.md`.

## Déployer et tester sur téléphone

Voir `docs/deploiement.md`.
