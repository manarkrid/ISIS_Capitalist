# Tunisian Capitalist

Jeu incrémental sur la cuisine tunisienne, réalisé avec **NestJS / GraphQL** et **Angular 19 / signals**, à partir de la base du projet ISIS Capitalist.

## Lancer le jeu

Prérequis : Node.js **22.22.3 ou plus récent dans la branche 22**, ou **24.15+**, et npm. Avec nvm : `nvm install` puis `nvm use` depuis la racine.

Dans un premier terminal :

```sh
cd backend
npm ci
npm run start:dev
```

Dans un second terminal :

```sh
cd frontend
npm ci
npm start
```

Ouvrir **http://localhost:4200**. L'API GraphQL est disponible sur **http://localhost:3000/graphql** et les images sur **http://localhost:3000/icones/**.

## Jouer

- Cliquer sur l'image d'un produit possédé pour lancer sa production. Le revenu arrive à la fin du cycle.
- Acheter des exemplaires avec les modes **×1, ×10, ×100 ou Max**. Le prix augmente après chaque exemplaire acheté.
- Engager un manager pour automatiser un produit, y compris pendant l'absence du joueur.
- Atteindre les paliers de quantité et acheter des améliorations pour augmenter les revenus ou réduire la durée de production.
- Ouvrir **Investisseurs** pour voir les investisseurs disponibles. Un nouveau départ remet les investissements à zéro en conservant le score cumulé et les anges. L'interface demande confirmation.
- Le pseudo identifie la sauvegarde : le changer ouvre la partie correspondante. Il est mémorisé dans le navigateur. **Actualiser** recharge l'état du serveur.

La partie commence avec **100 DT et un Cookies**, comme dans la base fournie. Les prix, revenus, durées et managers des six produits reprennent le document « Tunisian Capitalist » : Cookies, Fricassé, Makloub, Mechwi, Zgougou et Couscous.

## Partie de démonstration pour la soutenance

Depuis la racine du projet :

```sh
cd backend
npm run demo
```

Dans le jeu, saisir **Soutenance** dans le champ du pseudo et valider. Si cette
partie est déjà ouverte, cliquer sur **Actualiser la partie** après la commande.
Le backend et le frontend doivent être démarrés comme indiqué plus haut.

Cette commande crée ou remet à son état de démonstration uniquement la partie
`Soutenance`. Elle contient **1 milliard de DT**, **150 anges actifs**, un
score de **4 × 10^15**, **24 Cookies** et **9 exemplaires de chaque autre produit**.
Les prix correspondent aux quantités possédées. Les managers, paliers et
améliorations restent à débloquer pendant la présentation. Le score prépare
**150 nouveaux anges** à réclamer lors du nouveau départ.

Déroulé conseillé (environ 4 minutes) :

1. Produire des Cookies manuellement : montrer la barre et le gain par cycle.
   Le solde élevé est arrondi à l’écran : les petits gains peuvent ne pas changer
   sa valeur affichée. Lancer aussi le Couscous, dont le gain sera plus visible.
2. Acheter un Cookies en mode ×1 : la quantité passe à 25 et le premier palier
   individuel double son revenu. Acheter un exemplaire de chacune des cinq
   autres spécialités : le palier global à 10 exemplaires double tous les revenus.
3. Montrer les modes ×10 puis ×100 sur les Cookies. Engager leur manager et
   observer plusieurs cycles automatiques.
4. Acheter une amélioration en DT, puis les améliorations en anges. Montrer les
   changements de revenus et la diminution du nombre d'anges actifs.
5. Recharger la page pour montrer la sauvegarde. Pour les gains hors ligne,
   passer sur un autre onglet pendant quelques secondes puis revenir : le
   serveur recalcule les cycles du manager.
6. Montrer le mode Max vers la fin : il dépense presque tout le budget disponible
   pour le produit choisi. Faire les achats à présenter avant cette étape.
7. Terminer par **Investisseurs → nouveau départ**, puis confirmer. La partie
   revient à 100 DT et un Cookies, conserve le score et les anges restants,
   et reçoit les nouveaux anges. Les anges dépensés ne sont pas récupérés.

Pour rejouer la démonstration, relancer `npm run demo`, puis actualiser la partie.
Les autres pseudos sont conservés. Les montants de départ se règlent dans
`backend/scripts/create-demo.mjs` ; ils s'appliquent à la prochaine exécution.
Les sauvegardes de démonstration sont ignorées par Git, et le script permet de
les recréer sur une autre machine. `USERWORLDS_DIR` est également respecté.

## Règles importantes

Le monde contient 6 produits, 6 managers, 3 paliers par produit, 3 paliers globaux, 10 améliorations en dinars et 3 améliorations en anges. Un bonus de vitesse divise la durée de production ; un bonus de gain multiplie le revenu ; un bonus de type `ange` ajoute des points au pourcentage apporté par chaque ange.

Les formules de l'énoncé sont conservées :

```text
coût de n exemplaires = coût du prochain × (croissance^n − 1) / (croissance − 1)
gain d'un cycle = revenu × quantité × (1 + anges actifs × bonus ange / 100)
anges supplémentaires = max(0, floor(150 × sqrt(score / 10^15)) − anges déjà obtenus)
```

Les anges sont donc une mécanique de progression avancée. Les anges dépensés ne sont pas récupérés au prochain reset. Le serveur calcule les gains avant chaque action et fait autorité ; le client anime la progression et se resynchronise après les actions.

## Sauvegardes et structure

- `backend/src/origworld.ts` : contenu et équilibrage du monde initial.
- `backend/src/schema.graphql` : contrat fourni dans l'énoncé, conservé.
- `backend/src/app.service.ts` : production, bonus et persistance JSON.
- `backend/src/resolver.ts` : requête et mutations GraphQL.
- `frontend/src/app/game.service.ts` : état partagé par signals et échanges avec le serveur.
- `frontend/src/app/produit/` : affichage et interactions d'un produit.

Les parties sont stockées dans `backend/userworlds/<pseudo>-world.json`. Les fichiers déjà fournis sont conservés ; les nouvelles sauvegardes sont ignorées par Git. La variable `USERWORLDS_DIR` permet d'utiliser un autre dossier, notamment pour les tests. Le pseudo est un identifiant de partie simple, comme prévu par le sujet ; il ne constitue pas une authentification.

Pour se connecter à un autre monde compatible, saisir son adresse HTTP ou HTTPS dans le champ « Adresse du backend » de la barre latérale, puis valider. Cette adresse est mémorisée dans le navigateur et sert à la fois aux images et à GraphQL. Les boutons du multiplicateur global permettent de choisir ×1, ×10, ×100 ou Max. « Actualiser la partie » prend en compte le pseudo saisi.

Le champ `lastupdate` reste une chaîne conformément au schéma du PDF backend ; le serveur l'écrit en date ISO. Les requêtes Angular sont générées depuis ce même schéma, sans avoir besoin d'un serveur démarré :

```sh
cd frontend
npm run codegen
```

## Vérifications

```sh
cd backend
npm run build
npm test
npm run test:e2e
```

```sh
cd frontend
npm run build
npm run test:ci
```

Les tests Angular nécessitent Google Chrome ; si nécessaire, définir `CHROME_BIN` vers son exécutable. Les tests serveur utilisent des sauvegardes temporaires et ne modifient pas les parties existantes.

Pour vérifier manuellement : produire, acheter plusieurs unités, débloquer un manager, recharger la page, changer de pseudo puis revenir au premier. Vérifier ensuite les paliers, les améliorations et le nouveau départ depuis la fenêtre Investisseurs.

## Correspondance avec les cours

La relecture, les noms utilisés, les éléments Angular/GraphQL et les écarts entre les documents sont détaillés dans [docs/CONFORMITE_COURS.md](docs/CONFORMITE_COURS.md). Le client utilise `GameService`, `calcScore`, `productionDone`, les mises à jour immuables avec `map` et spread, et les SnackBars et badges Angular Material. Les requêtes restent générées avec `npm run codegen` dans `frontend/src/app/graphql/operations.ts`.
