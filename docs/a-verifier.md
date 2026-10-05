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
- [ ] `'wasm-unsafe-eval'` et worker sans URL `blob:` sur Safari iOS : ouvrir `/debug` sur l'iPhone, le moteur doit afficher « prêt ».
- [ ] Temps de lecture d'une capture sur un vrai téléphone (iPhone et Android d'entrée de gamme).
- [ ] Décodage des photos HEIC de l'iPhone par `createImageBitmap` (les captures d'écran sont normalement en PNG).
- [ ] Nom de la variable de branche du build Cloudflare Pages (`CF_PAGES_BRANCH`), qui exclut `/debug` de la production (`vite.config.ts`).
- [ ] Limite de taille des canvas sur iPhone.
- [ ] Valeur de `File.lastModified` pour une image choisie dans la galerie de l'iPhone.
- [ ] Prise en charge d'OffscreenCanvas par Safari.
- [ ] Libellés bancaires réels de chaque service du dictionnaire (`src/data/services.ts`), et nom actuel de HBO Max en France.
- [ ] Fréquence habituelle de Navigo / Imagine R (prélèvements mensuels supposés).
- [ ] Mots-clés d'abonnement et libellés toujours exclus, sur d'autres banques (`src/detection/keywords.ts`).
- [ ] Fréquence habituelle des services marqués « inconnue » (salles de sport, Amazon Prime, jeux).
- [ ] Mots des sous-libellés, titres de page et lignes de solde des vraies applis bancaires (`src/parsing/layout.ts`).
- [ ] Préfixes et marqueurs de type de paiement sur de vrais relevés (`src/parsing/normalize.ts`).
- [ ] Textes exacts des pages d'abonnements de l'App Store et de Google Play en français : renouvellement, essai, sections des abonnements expirés (`src/parsing/store.ts`).

## Parcours (phase 4)

- [ ] Geste de capture affiché dans le guide : bouton latéral + volume haut (iPhone), Marche/Arrêt + volume bas (Android), selon les modèles (`src/ui/screens/CaptureGuide.tsx`).
- [ ] Reconnaissance automatique du type de capture sur de vraies pages de plusieurs banques et des deux stores (`src/sources/screenshots/classify.ts`).
- [ ] Sélection multiple dans la galerie et décodage des images sur iPhone et Android.

## Rappels (phase 4)

- [ ] Export `.ics` sur iPhone, en particulier en mode installé.

## Outils Windows

- [ ] Identifiant winget de cloudflared (`Cloudflare.cloudflared`) : confirmer avec `winget search cloudflared`.
