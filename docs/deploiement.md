# Déployer et tester sur téléphone (Windows)

Les commandes sont pour PowerShell. Dans Windows PowerShell 5.1, `curl` est un alias d'une autre commande : écris `curl.exe` pour utiliser le vrai curl, fourni avec Windows 11.

## Pourquoi HTTPS est indispensable

Le service worker, donc l'installation et le mode hors ligne, n'existe qu'en HTTPS ou sur `localhost`. Une adresse comme `http://192.168.1.20:4173` s'ouvre sur ton téléphone, mais l'appli ne pourra ni s'installer ni marcher hors ligne. L'accueil PC l'affiche d'ailleurs dans un encadré jaune.

Trois façons de tester sur un téléphone, de la plus fidèle à la plus rapide.

## 1. Déploiement d'aperçu sur Cloudflare Pages (recommandé)

C'est la seule méthode qui applique la vraie CSP via le fichier `_headers`.

### Premier déploiement

Les intitulés de l'interface Cloudflare changent régulièrement : `TODO(vérifier)` chaque libellé ci-dessous au moment de le faire.

1. Crée un dépôt **privé** vide sur GitHub, nommé par exemple `detecteur-abonnements`, sans README ni .gitignore.
2. Envoie le projet :

   ```powershell
   cd C:\dev\detecteur-abonnements
   git remote add origin https://github.com/TON-COMPTE/detecteur-abonnements.git
   git push -u origin main
   ```

3. Dans le tableau de bord Cloudflare : *Workers & Pages*, puis créer un projet *Pages* et le connecter à GitHub. Autorise l'accès à ce seul dépôt.
4. Réglages de build :
   - commande de build : `npm run build`
   - dossier de sortie : `dist`
   - version de Node : le fichier `.node-version` du dépôt indique 24. Si l'hébergeur l'ignore, ajoute une variable d'environnement `NODE_VERSION` = `24` (`TODO(vérifier)`).
   - ne coche aucune option d'analyse d'audience (« Web Analytics ») : la CSP la bloquerait de toute façon, et le principe est zéro mesure d'audience.
5. Lance le déploiement. L'adresse de production ressemble à `https://NOM-DU-PROJET.pages.dev`.

### Vérifier les en-têtes

```powershell
curl.exe -sI https://NOM-DU-PROJET.pages.dev/ | Select-String "content-security|permissions-policy|x-content-type"
```

Tu dois retrouver exactement la CSP de `config/security-headers.ts`, avec `connect-src 'self'`.

### Aperçus par branche

Chaque branche poussée reçoit sa propre adresse HTTPS, sans toucher à la production :

```powershell
git switch -c essai-telephone
# ... modifications, commits ...
git push -u origin essai-telephone
```

Cloudflare affiche l'adresse de l'aperçu dans l'onglet des déploiements (`TODO(vérifier)` son format exact). Ouvre-la sur ton PC : le QR code de l'accueil encode automatiquement cette adresse. Il te suffit de le scanner.

### Alternative sans GitHub

L'outil en ligne de commande de Cloudflare peut envoyer le dossier `dist` directement. Je ne l'ajoute pas aux dépendances, on le lance à la demande (`TODO(vérifier)` la commande avec la documentation actuelle de Wrangler) :

```powershell
npm run build
npx wrangler pages deploy dist --project-name detecteur-abonnements
```

## 2. Tunnel HTTPS gratuit (rapide, sans déployer)

Un « Quick Tunnel » Cloudflare donne une adresse HTTPS temporaire qui pointe vers ton PC. Aucun compte n'est nécessaire.

À savoir : l'adresse est publique tant que le tunnel tourne. Ferme-le après tes tests. Les en-têtes de sécurité sont ceux de `vite preview`, qui reprend la même CSP.

```powershell
# Une seule fois. TODO(vérifier) l'identifiant avec : winget search cloudflared
winget install --id Cloudflare.cloudflared -e
```

Terminal 1 :

```powershell
cd C:\dev\detecteur-abonnements
npm run preview:prod
```

Terminal 2 :

```powershell
npm run tunnel
```

Ce script lance `cloudflared tunnel --url http://127.0.0.1:4173`. L'adresse est écrite `127.0.0.1` et non `localhost` : sous Windows, `localhost` peut désigner l'IPv6 (`::1`) pour Node et l'IPv4 pour cloudflared. Le tunnel ne trouve alors pas le serveur, et Cloudflare affiche « Bad gateway, Error code 502 ». L'aperçu écoute donc toujours sur `127.0.0.1:4173` (`vite.config.ts`).

En cas de 502 malgré tout :

- vérifie que le terminal 1 tourne encore et affiche `http://127.0.0.1:4173/` ;
- `curl.exe -sI http://127.0.0.1:4173/` doit répondre `HTTP/1.1 200 OK` ;
- `netstat -ano | findstr :4173` montre sur quelle adresse le serveur écoute ;
- lis la dernière erreur du terminal 2 (ligne `ERR ... dial tcp ...`).

cloudflared affiche une adresse en `https://….trycloudflare.com`. Ouvre-la sur ton PC et scanne le QR code. `vite.config.ts` autorise déjà ces adresses (`preview.allowedHosts`) ; sans ce réglage, Vite refuserait la connexion.

Teste toujours le **build** (`preview:prod`), jamais `npm run dev` : le service worker n'est pas actif en développement.

## 3. Android en USB (débogage)

Le téléphone accède à ton PC comme s'il s'agissait de son propre `localhost`, considéré comme sûr. Tu obtiens en plus les outils de développement du téléphone sur ton PC.

1. Sur le téléphone : active les options pour les développeurs, puis le débogage USB. La manipulation dépend du modèle.
2. Branche le téléphone et accepte l'autorisation de débogage.
3. Sur le PC : lance `npm run preview:prod`, puis ouvre `chrome://inspect/#devices` dans Chrome.
4. Active *Port forwarding* : port `4173` vers `localhost:4173`.
5. Sur le téléphone, dans Chrome : ouvre `http://localhost:4173`.
6. Dans `chrome://inspect`, clique sur *inspect* sous l'onglet du téléphone pour voir sa console.

Pour l'iPhone, l'inspecteur de Safari exige un Mac. Sans Mac, on s'appuiera sur l'écran de débogage de la phase 2, qui affichera les erreurs dans la page.

## Liste de vérification sur téléphone (fin de phase 1)

- [ ] Le QR code de l'accueil PC ouvre l'appli sur le téléphone.
- [ ] Android, Chrome : le bouton « Installer l'appli » apparaît et installe l'appli.
- [ ] iPhone, Safari : les trois étapes du guide correspondent à ce que tu vois. Note toute différence, surtout sur iOS 26.
- [ ] Une fois installée, l'appli s'ouvre sans barre d'adresse, et l'écran d'installation ne s'affiche plus : « Trouver mes abonnements » mène directement au guide de capture.
- [ ] Mode avion : l'appli installée s'ouvre et navigue entre l'accueil et le guide de capture.
- [ ] Mode sombre du téléphone : l'appli suit.
- [ ] Encoche et barre du bas : rien n'est masqué, le bouton reste au-dessus de la barre d'accueil.
- [ ] Outils de développement de Chrome sur PC, onglet *Application* : le manifest ne montre aucune erreur et le service worker est « activated ».
