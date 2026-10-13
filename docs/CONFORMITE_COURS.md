# Relecture du projet à partir des cours et des consignes

Cette relecture rapproche le code des exemples étudiés, tout en conservant le monde Tunisian Capitalist et l'interface existante. Les quatre boutons ×1, ×10, ×100 et Max sont conservés à la demande de l'utilisateur.

## Organisation et noms

| Élément demandé | Fichier du projet |
| --- | --- |
| Composant principal, interface générale | `frontend/src/app/app.component.ts`, `.html`, `.css` |
| Composant produit, entrées `prod` et `qtmulti` | `frontend/src/app/produit/produit.component.ts` |
| Service partagé `GameService` | `frontend/src/app/game.service.ts` |
| Configuration GraphQL | `frontend/src/app/graphql.provider.ts` |
| Requêtes et mutations avec variables typées | `frontend/src/app/graphql/queries.graphql` |
| Types et opérations générés avec codegen | `frontend/src/app/graphql/operations.ts` |
| Schéma GraphQL fourni, approche schema first | `backend/src/schema.graphql` |
| Classes métiers générées | `backend/src/graphql.ts` |
| Monde initial, six produits et leurs bonus | `backend/src/origworld.ts` |
| Résolveur `GraphQlResolver` | `backend/src/resolver.ts` |
| Service `AppService`, calcul du temps et sauvegardes | `backend/src/app.service.ts` |

Les noms publics du contrat sont conservés : `World`, `Product`, `Palier`, `RatioType`, `getWorld`, `acheterQtProduit`, `lancerProductionProduit`, `engagerManager`, `acheterCashUpgrade`, `acheterAngelUpgrade`, `resetWorld`.

## Éléments du cours utilisés

- TypeScript, composants standalone et séparation HTML/CSS/TypeScript.
- Injection avec `inject()` et services `@Injectable`.
- Signaux `signal`, `computed`, `input`, `effect`, `set` et `update`.
- Interpolation, propriétés `[src]`, `[disabled]`, `[style.width.%]`, événements `(click)` et formulaires.
- Structures `@if`, `@for` avec `track` et `@switch`.
- Programmation immuable avec spread, `map` et `filter`. Les achats, managers, bonus et paliers retournent de nouveaux objets sans modifier l'ancien monde.
- Pipes `BigvaluePipe` et `SecondPipe`.
- CSS Grid pour le layout.
- `MatSnackBar` déclenchée par l'effet sur `snackmessage` et `MatBadge` pour les actions achetables.
- `calcScore()` pour la boucle temporelle et `productionDone(prod, qt)` pour créditer les cycles terminés, avec le bonus des anges.
- Requêtes/mutations GraphQL nommées, variables typées et sélection des seuls champs nécessaires. Le TD sur les patients illustre ces mécanismes ; son modèle médical ne remplace pas le contrat du jeu.
- NestJS, décorateurs `@Query`, `@Mutation`, `@Args`, génération de classes, fichiers JSON et images statiques.

Le calcul temporel est centralisé dans le service : une horloge met à jour tous les produits. Le composant produit utilise `requestAnimationFrame`, `performance.now()`, un signal `progress` et la méthode `animate` pour interpoler visuellement la barre entre les mises à jour du monde. Chaque changement du temps restant ou de la vitesse recale l'animation ; `ngOnDestroy` annule la frame programmée. L'animation ne crédite jamais les revenus, réservés à `calcScore` et `productionDone`.

## Grille fonctionnelle

| Domaine | Réalisation |
| --- | --- |
| Production | Clic sur l'image, progression liée à la durée, temps restant et crédit d'un cycle manuel |
| Achat | Quatre modes, quantité Max, coût géométrique, bouton conditionnel, nouvelle quantité et prochain coût |
| Managers | Modale, seuls managers non engagés, badge, débit du coût et production automatique |
| Cash et Angel Upgrades | Accès latéral, contrôle du solde et application immédiate aux cibles |
| Investors | Anges totaux/actifs, nouveaux anges, confirmation puis reset côté serveur |
| Pseudo | Saisie, validation, localStorage et actualisation du pseudo saisi |
| Feedback | SnackBars pour achat, manager, bonus, reset et erreurs ; les messages de paliers sont conservés dans la confirmation d'achat |
| Adresse backend | Champ validé, localStorage, même adresse pour images et GraphQL, changement effectif sans recharger la page |
| Synchronisation | Recharge depuis le serveur après les mutations ; données persistées et cycles pendant l'absence |

Les notifications Material restent visibles dans les modales natives : leur conteneur est déplacé dans le dialogue ouvert, puis replacé dans la page à sa fermeture.

## Divergences des documents et décisions

1. **Reset** : la grille indique zéro argent et zéro quantité, mais les deux énoncés demandent de revenir au monde initial. Le backend donne lui-même un premier produit possédé dans son exemple. Le reset conserve donc le démarrage de ce monde : 100 DT et un Cookies, sans manager ni bonus débloqué. Le score cumulé et les anges sont conservés. Ce choix respecte le mécanisme décrit dans les énoncés mais reste un écart avec la formulation littérale de la grille.
2. **Multiplicateur** : le sujet et la grille décrivent un bouton cyclique. Les quatre boutons sont maintenus selon la demande explicite de l'utilisateur ; les quatre modes fonctionnent, mais l'interaction n'est pas cyclique.
3. **`lastupdate`** : le frontend mentionne `Int`, tandis que le contrat backend utilise `String`. Le schéma backend est conservé, avec des dates ISO et lecture des anciennes dates numériques.
4. **API récentes** : le projet utilise Angular 19 et Apollo Angular 10. Les Signal Forms du cours nécessitent Angular 21 ou plus et `apollo.signal` n'est pas exposé par la version Apollo installée. Les formulaires utilisent `ngModel` relié à des signaux ; les classes GraphQL générées utilisent les observables Apollo, convertis en promesses avec `firstValueFrom`, puis mettent à jour les signaux du jeu. Ces équivalents préservent les versions du projet. Il n'y a pas de fausse implémentation de `form`, `FormField` ou `apollo.signal`.
5. **Coût** : `cout` est le prix du prochain exemplaire, conformément à l'énoncé backend. On n'applique pas une deuxième fois la croissance avant le premier achat.

## Validation

- Génération GraphQL : `npm run codegen`.
- Compilation frontend et backend : `npm run build` dans chaque dossier.
- Tests backend : 34 tests unitaires et 4 tests GraphQL de bout en bout.
- Tests frontend : règles temporelles, erreurs, séparation des joueurs, reset confirmé, objets gelés et application unique des paliers, adresse effective du transport, notifications et composants.
- Les tests serveur utilisent des dossiers temporaires et ne modifient pas les sauvegardes des joueurs.

La compatibilité avec un serveur d'un autre groupe reste à vérifier avec son adresse réelle. Le test de changement d'adresse utilise un transport HTTP simulé.

## Documents consultés

- [Cours Angular](</Users/nabilouanoir/Desktop/Web serrvice /projet/Angular.html>)
- [Consignes frontend](</Users/nabilouanoir/Desktop/Web serrvice /projet/frontendangularsignal.pdf>)
- [Consignes backend](</Users/nabilouanoir/Desktop/Web serrvice /projet/backend (1).pdf>)
- [TD GraphQL](</Users/nabilouanoir/Desktop/Web serrvice /projet/TD GraphQL.pdf>)
- [Grille fonctionnelle](</Users/nabilouanoir/Desktop/Web serrvice /projet/grille évaluation fonctionnelle.pdf>)
- [Documentation officielle Signal Forms](https://angular.dev/guide/forms/signals/overview)
