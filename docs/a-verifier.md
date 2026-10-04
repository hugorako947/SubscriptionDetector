# Points à vérifier

Tout ce qui n'a pas pu être confirmé depuis l'environnement de développement. Dans le code, ces points portent la mention `TODO(vérifier)` (recherche : `TODO(vérifier)`). Coche une ligne quand elle est vérifiée sur un vrai appareil ou dans la documentation officielle à jour, et note la date.

## Hébergement

- [ ] Conditions de l'offre gratuite de Cloudflare Pages : usage commercial, limites, taille maximale par fichier (les fichiers OCR font environ 3,9 Mo chacun).
- [ ] Orientation actuelle de Cloudflare entre Pages et Workers pour un site statique.
- [ ] Syntaxe exacte du fichier `_headers` chez l'hébergeur retenu (`config/security-headers.ts`).
- [ ] Lecture de `.node-version` par le système de build de l'hébergeur.
- [ ] Comportement « application monopage » (toutes les adresses renvoient `index.html`) sans fichier `_redirects` sur Cloudflare Pages. Netlify exigerait un `_redirects` contenant `/* /index.html 200`.
- [ ] Netlify, si on bascule : conditions de l'offre gratuite.

## Installation et PWA

- [ ] iPhone : position du bouton Partager dans Safari, en particulier sur iOS 26 (menu « ⋯ » ?), et libellés « Sur l'écran d'accueil » et « Ajouter » (`src/ui/illustrations/IosInstallSteps.tsx`, `src/ui/screens/Install.tsx`).
- [ ] iPhone : installation possible depuis Chrome ou Firefox (`Install.tsx`, variante `ios-other-browser`).
- [ ] Android : libellés du menu d'installation dans Chrome, Samsung Internet et Firefox.
- [ ] Signatures des navigateurs intégrés aux applis de messagerie et réseaux sociaux (`src/pwa/platform.ts`).
- [ ] Règles actuelles d'effacement des données des sites non installés par WebKit.

## Captures et OCR (phases 2 et suivantes)

- [ ] Liens directs vers les abonnements : https://apps.apple.com/account/subscriptions et https://play.google.com/store/account/subscriptions
- [ ] Geste de capture d'écran selon les modèles de téléphone.
- [ ] Prix affichés ou non dans les listes d'abonnements de l'App Store et de Google Play.
- [ ] `'wasm-unsafe-eval'` et worker sans URL `blob:` sur Safari iOS.
- [ ] Limite de taille des canvas sur iPhone.
- [ ] Valeur de `File.lastModified` pour une image choisie dans la galerie de l'iPhone.
- [ ] Prise en charge d'OffscreenCanvas par Safari.
- [ ] Libellés bancaires réels de chaque service du dictionnaire.

## Rappels (phase 4)

- [ ] Export `.ics` sur iPhone, en particulier en mode installé.

## Outils Windows

- [ ] Identifiant winget de cloudflared (`Cloudflare.cloudflared`) : confirmer avec `winget search cloudflared`.
