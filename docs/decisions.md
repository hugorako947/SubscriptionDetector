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

## Décisions de la phase 3

**Chaîne complète** : lignes OCR → `parsing/` (montants, dates, libellés, mise en page) → `sources/screenshots/` (un adaptateur par type de page, tous au format `Transaction`) → `detection/engine.ts` (indépendant de la source). Rien n'est encore branché sur l'interface : ce sera la phase 4.

**Montants** : formats du cahier des charges, plus « 9 € » et « € » lu « E » par l'OCR (seulement après des centimes). Un nombre sans centimes ni symbole n'est jamais un montant (« 200 GO », « 05/09 »). Les O et l lus dans un montant redeviennent des chiffres.

**Dates** : « 05/09 » (barre oblique seulement : « 13.49 » est un montant), avec année, mois en lettres abrégés ou non, en-têtes de section, « Aujourd'hui », « Hier ». Sans année : la date passée la plus récente pour une opération, la prochaine date future pour un renouvellement.

**Libellés** : majuscules, sans accents, sans préfixes de paiement, numéros de carte, références, dates ni longs codes (au moins 4 chiffres). Le type de paiement (prélèvement, carte, virement) est lu avant d'effacer les préfixes. 0/O et 1/I sont corrigés dans les mots surtout faits de lettres ; la confusion rn/m est testée au moment de la correspondance, car remplacer « RN » partout abîmerait de vrais mots.

**Mise en page** : un montant seul sur sa ligne va à la ligne d'opération la plus proche qui n'en a pas (libellé et sous-libellé compris). Un sous-libellé est une ligne faite seulement d'un mot de type de paiement, ou une ligne plus petite collée à une opération. Les titres de page et les lignes de solde sont ignorés. Les hauteurs comparées sont celles des mots, pas de la ligne, qui grandit quand un montant décalé la rejoint.

**Correspondance avec le dictionnaire** : séquence de mots exacte d'abord, puis Jaro-Winkler ≥ 0,92 (réglable) avec un nombre de modifications plafonné, car Jaro-Winkler seul confondait « ORANGERIE » et « ORANGE ». Les variantes de moins de 5 lettres (« SFR », « DAZN ») doivent apparaître telles quelles. Le service caché derrière PayPal l'emporte sur PayPal.

**Dictionnaire** : 40 services et 3 intermédiaires (Apple, Google Play, PayPal), sans aucun prix, `cancelUrl` vide et `verified: false`. Fréquence habituelle « inconnue » dès qu'un service propose couramment plusieurs fréquences. Toutes les variantes de libellés sont à vérifier sur de vrais relevés.

**Règles de classement** :
- service connu → confiance élevée ;
- ligne de la page des abonnements d'un store → élevée ;
- prélèvement SEPA d'un organisme inconnu → moyenne ;
- impôts, crédit, cotisations, loyer → « Autres prélèvements », jamais comptés ;
- même marchand régulier → moyenne (3 fois ou plus) ou faible (2 fois) ;
- le reste est ignoré.

Les crédits et les virements sont écartés, et le texte d'un virement n'est jamais conservé.

**Recoupements** : une ligne Apple ou Google du même montant qu'un abonnement de la page du store est rattachée à cet abonnement (pas de double compte). Un même organisme inconnu vu sur la page des prélèvements et sur le relevé est fusionné (« CINEFLUX SAS » et « CINEFLUX », « CLUB FORME+ » et « CLUB FORME PLUS »). Une ligne vue sur deux captures qui se chevauchent est comptée une fois, mais deux lignes identiques sur la même capture sont gardées (deux cafés le même jour).

**Fréquence et totaux** : la fréquence lue sur le store ou détectée dans les dates prime ; sinon la fréquence habituelle du service, signalée comme estimée. Sans fréquence, l'abonnement n'entre pas dans le total et l'utilisateur la précisera (phase 4). Prochaine échéance : date du store, sinon dernier paiement plus une période.

**Tests** : 182 tests, dont la chaîne complète sur la sortie OCR réelle des quatre captures fictives (`tests/fixtures/ocr/`, produite par l'écran `/debug`), en mode clair et sombre.

## Décisions de la phase 4

**Parcours complet, sans `/debug`** : accueil, installation, guide de capture, import, analyse, puis tableau de bord. Une fois qu'une liste existe, l'accueil de l'appli devient le tableau de bord.

**Guide de capture** : les trois pages à capturer, chacune avec un exemple visuel fictif, le geste de capture selon le système et les liens vers les abonnements des stores (à vérifier). Un seul bouton « Choisir mes captures » ouvre la galerie avec sélection multiple, sans attribut `capture`. Sur PC, une zone de glisser-déposer s'ajoute.

**Type de capture deviné** : l'utilisateur ne dit jamais quelle page il importe. `sources/screenshots/classify.ts` reconnaît la page du store, la page des prélèvements ou l'historique, d'après les mots et les montants lus (testé sur les sorties OCR réelles des captures fictives).

**Analyse** : progression « Lecture de la capture 2 sur 4 » avec une barre accessible ; moteur OCR libéré à la fin ; image libérée dès qu'elle est lue. La date du fichier sert de date de capture quand elle est plausible (H11, à vérifier sur iPhone).

**Tableau de bord** :
- le total mensuel et annuel en tête, avec le nombre d'abonnements sans montant ou sans fréquence, qui ne sont pas comptés ;
- les économies possibles quand des abonnements sont marqués « À résilier » ;
- « Bientôt » : renouvellements et fins d'essai des 30 prochains jours, à chaque ouverture ;
- « À vérifier » : les détections, avec la raison et deux réponses en un geste (« Oui, c'en est un » ou « Non ») ;
- « Mes abonnements », « Autres prélèvements » (repliés, hors total) et « Écartés » (repliés, restaurables) ;
- un seul bouton principal, « Ajouter » : d'autres captures, la liste mémoire, un abonnement à la main ou un essai gratuit.

**Fiche d'un abonnement** (fenêtre `<dialog>` native : focus gardé, Échap ferme) : tous les champs se corrigent, avec le statut choisi par l'utilisateur (« Je garde », « À résilier », « Résilié »). La fiche montre aussi pourquoi l'abonnement a été repéré, avec la ligne lue. Pour un abonnement venu d'une page de store marqué « À résilier », elle propose les liens vers les abonnements App Store et Google Play. Aucun lien de résiliation propre à un service : rien n'est inventé.

**Statut réel** : l'appli ne peut pas savoir si un abonnement est réellement résilié ; elle affiche ce que l'utilisateur déclare. Un abonnement « Résilié » sort du total et des rappels.

**Liste mémoire** : les dix catégories du cahier des charges. Chaque catégorie propose les services du dictionnaire, ou des exemples génériques (assurances, options bancaires) ; un toucher ouvre la fiche pré-remplie. Une case « Vu » par catégorie, avec un compteur de progression.

**Essai express** : un nom et une date de fin (par défaut dans 7 jours), le prix ensuite en option.

**Rappels** : fichier `.ics` (RFC 5545) avec un événement par renouvellement (répété selon la fréquence, rappel la veille) et par fin d'essai (rappel deux jours avant). Lignes repliées à 75 octets sans couper un caractère accentué. Comportement sur iPhone à vérifier.

**Stockage** : Dexie (IndexedDB), version 1 du schéma. Une nouvelle analyse ne touche jamais ce que l'utilisateur a confirmé ou écarté ; elle met à jour les détections encore « à vérifier » et ajoute les nouvelles. L'appli demande au navigateur un stockage persistant. « Tout effacer » supprime la base entière après confirmation.

**Tests** : 205 tests unitaires. Parcours complet vérifié dans Chromium avec les quatre captures fictives (environ 6 s d'analyse) : corrections, statut « À résilier » et économies, essai gratuit, liste mémoire, fichier `.ics`, rechargement, mode hors ligne et « Tout effacer ». Aucune violation de CSP ni erreur dans la console.

## Correctifs après le premier essai réel (5 octobre 2026)

Premier essai sur une vraie capture d'historique, en mode sombre. La lecture OCR était bonne (confiance moyenne 87), mais **aucun abonnement n'a été trouvé, et l'appli revenait à l'écran d'accueil sans rien dire**. Trois causes, toutes corrigées :

1. **Date sous chaque libellé.** Cette appli affiche la date sous chaque opération (« Lun. 18 mai »), pas en tête de groupe, avec un jour abrégé. Ces lignes devenaient de fausses opérations, et les vraies n'avaient pas de date. Désormais, les jours abrégés sont reconnus, et une ligne de date collée sous une opération est rattachée à celle-ci.
2. **Libellé sur deux lignes.** Une opération écrite sur deux lignes devenait deux opérations. Le seuil de continuation passe de 0,35 à 0,8 hauteur de ligne, et un montant porté par la seconde ligne est bien rattaché.
3. **Pas de « PRLV » dans les libellés.** L'appli affiche des noms nettoyés (« BPCE ASSURANCES ») et indique le type par une icône, que l'OCR ne lit pas. La règle 2 (prélèvement SEPA) ne pouvait donc pas jouer. Ajouts :
   - des **mots-clés d'abonnement** (assurance, mutuelle, cotisations bancaires, frais de tenue de compte, abonnement, forfait) donnent une confiance moyenne et une catégorie ;
   - **Navigo / Imagine R** entre dans le dictionnaire, avec une nouvelle catégorie « Transports » ;
   - les **débits différés de carte**, encours, soldes et retraits ne sont jamais proposés, même s'ils reviennent chaque mois ;
   - un libellé fait d'un seul mot de paiement (« PRÉLÈVEMENT ») non plus.

**Protection des noms.** Un libellé commençant par une civilité (« M », « MME », « MONSIEUR »…) est traité comme un virement vers une personne. Son texte n'est jamais gardé (règle 4) : le libellé de ces virements ne contenait pas « VIR ».

**Résultat vide.** Après une analyse, l'appli va toujours au tableau de bord. S'il n'y a rien, elle dit combien d'opérations ont été lues et quelles pages marchent le mieux, avec des liens vers d'autres captures et vers la liste mémoire.

**Fréquence en un geste.** Un abonnement au montant connu mais à la fréquence inconnue affiche deux boutons, « Par mois » et « Par an ».

**Tests de non-régression** sur deux nouvelles captures fictives reprenant cette mise en page (`banque-date-sous-libelle`, `banque-sans-abonnement`), avec des noms et des montants inventés. La vraie capture n'est ni dans le dépôt, ni dans les tests.
