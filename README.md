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
- `frontend/src/app/game-service.service.ts` : état partagé par signals et échanges avec le serveur.
- `frontend/src/app/produit/` : affichage et interactions d'un produit.

Les parties sont stockées dans `backend/userworlds/<pseudo>-world.json`. Les fichiers déjà fournis sont conservés ; les nouvelles sauvegardes sont ignorées par Git. La variable `USERWORLDS_DIR` permet d'utiliser un autre dossier, notamment pour les tests. Le pseudo est un identifiant de partie simple, comme prévu par le sujet ; il ne constitue pas une authentification.

Pour se connecter à un autre monde compatible, modifier uniquement `GAME_SERVER_URL` dans `frontend/src/app/game.config.ts`. Cette adresse sert à la fois aux images et à GraphQL.

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
