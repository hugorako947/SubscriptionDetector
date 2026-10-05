# Décisions

Journal des choix du projet. Chaque entrée dit ce qui a été décidé et pourquoi. Les hypothèses H1 à H15 ont été validées à la fin de la phase 0 (4 octobre 2026).

## Cadre (cahier des charges, non négociable)

Aucune donnée de l'utilisateur ne quitte l'appareil, l'appli marche en mode avion une fois installée, tout est gratuit et open source, l'utilisateur valide toujours la liste finale, et rien n'est inventé : ce qui doit être vérifié porte la mention `TODO(vérifier)` (liste dans `docs/a-verifier.md`).

Écartés : connexion bancaire, lecture des e-mails. Import PDF/CSV : plus tard, pour comparer les méthodes.

## Hypothèses validées

**H1. Poste de travail.** Node 24 LTS (Vitest 5 refuse Node 23 et 25), Git, VS Code, projet dans `C:\dev\` hors de OneDrive.

**H2. Dépôt et hébergeur.** Dépôt GitHub privé relié à Cloudflare Pages (aperçu HTTPS par branche, CSP via `_headers`). Netlify en repli. Sous-domaine gratuit de l'hébergeur, pas de domaine personnel au début.

**H3. Versions.** Modèle officiel Vite React TS, TypeScript 6.0 (pas la 7.0), `strict` explicite. vite-plugin-pwa 1.3.0 plutôt que 2.0.0 (publiée le 3 octobre 2026) ; on montera de version après un correctif 2.0.x. Versions épinglées, lockfile versionné.

**H4. Moteur OCR.** Un seul worker tesseract.js réutilisé, captures traitées une par une, mode LSTM seul, français seul, worker préparé dès l'écran d'import.

**H5. Fichiers OCR en précache.** Les trois variantes LSTM du cœur (`lstm`, `simd-lstm`, `relaxedsimd-lstm`), `fra.traineddata.gz` (best_int) et le worker : environ 12,6 Mo stockés, 5,2 Mo téléchargés. Limite Workbox (`maximumFileSizeToCacheInBytes`, 2 Mio par défaut) à relever.

**H6. Agrandissement ×2 conditionnel.** Mesuré en phase 2 ; on n'agrandit que les images au texte petit (risque mémoire des canvas sur iPhone).

**H7. Reconstruction des lignes** à partir des mots et de leurs positions, sans se fier au découpage de Tesseract. Modes de segmentation comparés sur l'écran de débogage.

**H8. Modèle de données.** Montants en centimes entiers (`amountCents`). `Transaction` reçoit l'index de capture, la position et un `kind` ; `DetectedSubscription` reçoit `needsAmount`, la distinction « abonnement / autre prélèvement » et `trialEndsAt`.

**H9. Dépendances évitées.** Routeur maison (History API) au lieu de react-router, Jaro-Winkler et Levenshtein écrits à la main. Dexie pour IndexedDB (phase 4), `fake-indexeddb` pour les tests.

**H10. PC ou téléphone** choisi par media query `(min-width: 768px) and (pointer: fine)`. L'user-agent ne sert qu'au choix du guide d'installation. Une tablette suit le parcours mobile.

**H11. Dates incomplètes.** Date sans année : la plus récente dans le passé. « Aujourd'hui » et « Hier » : relatifs au jour de la capture (`File.lastModified` si fiable, sinon date d'import signalée comme approximative).

**H12. Mesures.** Nombres et durées uniquement. Précision et rappel calculés sur la liste du moteur avant corrections ; appariement confirmé à la main dans `/test` ; l'export ne contient que des totaux. Les ajouts de la liste « mémoire » sont comptés à part.

**H13. Écran de débogage OCR** actif seulement dans les déploiements d'aperçu, exclu de la production.

**H14. Offre payante future.** Seulement un emplacement documenté et les champs `cancelUrl` / `verified` du dictionnaire. Aucun code.

**H15. Téléphones de test.** Au moins un Android ; un iPhone si possible, sinon le parcours iPhone reste non vérifié.

## Décisions de la phase 1

**Mise à jour de l'appli en mode « prompt ».** Le service worker n'impose jamais de rechargement : une bannière propose la mise à jour. Un rechargement automatique ferait perdre une analyse en cours, puisque les images ne sont jamais stockées.

**CSP à source unique.** `config/security-headers.ts` alimente à la fois `vite preview` et `dist/_headers`. Les tests vérifient l'absence de `unsafe-eval`, de `unsafe-inline` et de tout domaine tiers. Le service worker est enregistré depuis React (`injectRegister: false`) : aucun script en ligne.

**Police.** Atkinson Hyperlegible Next (licence OFL), conçue pour la lisibilité, auto-hébergée via `@fontsource`. Seul le sous-ensemble latin en graisses 400 et 700 est chargé (environ 30 Ko en woff2). Elle contient les chiffres tabulaires, « € » et le signe moins « − ».

**Direction visuelle.** Un trait de surligneur jaune sur un relevé fictif : c'est ce que fait l'appli. Palette vert ardoise, texte aligné à gauche, rayons d'angle différents selon le rôle (relevé presque droit, boutons arrondis). Contrastes du texte ≥ 6:1 en clair et en sombre.

**Nom provisoire.** « Détecteur d'abonnements » (nom court du manifest : « Abonnements »). Ce n'est pas un nom définitif et sa disponibilité n'a pas été vérifiée.

**Accueil mobile.** Le bouton « Trouver mes abonnements » mène à l'installation, ou directement au guide de capture si l'appli est déjà installée.

**Données de l'aperçu.** Services et montants inventés (`src/ui/preview/sampleData.ts`), affichés avec la mention « Exemple fictif ».

## Décisions de la phase 2

**Fichiers du moteur servis par le site.** `config/ocr-assets.ts` copie dans `public/ocr/` (non versionné) le worker, les trois cœurs LSTM et `fra.traineddata.gz`. Le précache passe à 18 entrées (environ 12,6 Mo) avec `maximumFileSizeToCacheInBytes` à 5 Mio. Un test vérifie la présence des fichiers et leur taille.

**Options de tesseract.js 7.0.0**, vérifiées dans son code source : `corePath` est un dossier (la bibliothèque y ajoute la variante choisie), les chemins sont absolus (un chemin relatif serait résolu depuis le worker), `workerBlobURL: false` garde la CSP `worker-src 'self'`, et `cacheMethod: 'none'` évite une copie des données de langue dans IndexedDB, puisque le service worker les garde déjà hors ligne.

**Prétraitement par défaut** : gris, inversion automatique des captures en mode sombre (niveau de gris moyen < 110), renforcement du contraste entre les 1er et 99e centiles, pas de noir et blanc (le modèle LSTM travaille mieux sur les niveaux de gris ; Otsu reste disponible dans l'écran de débogage). Agrandissement ×2 seulement sous 1000 px de large, et jamais plus de 12 millions de pixels.

**Lignes reconstruites par recouvrement vertical** des mots (au moins 50 % de la plus petite hauteur), et découpées en segments quand l'écart horizontal dépasse 1,5 hauteur de ligne. Sur la capture fictive, le montant, centré entre le libellé et la mention « Prélèvement », forme sa propre ligne : le rattacher au bon libellé est le travail du parsing (phase 3).

**Écran `/debug`** construit partout sauf en production sur Cloudflare Pages (`CF_PAGES_BRANCH === 'main'`, à vérifier) : il disparaît du bundle de production. Il prépare le moteur dès l'ouverture et le libère en sortant, garde seulement un aperçu JPEG réduit de chaque image, et affiche les erreurs dans la page (pas d'inspecteur Safari sans Mac).

**Mesures sur les captures fictives** (Chromium sur Linux, pas un téléphone) : moteur prêt en 0,6 à 1 s ; 0,6 à 1,7 s de lecture par capture de 1170 × 2532 px ; confiance moyenne 89 à 91. Le mode hors ligne fonctionne, aucune requête hors du site, aucune violation de CSP. Les accents des majuscules sont parfois perdus (« ONDEA »), le signe « − » est lu « - », et un petit artefact de confiance très basse (« RL », 18 à 22) apparaît : ces points seront traités au parsing.
