# Scanner plusieurs URLs depuis Node

Depuis `apps/tracking-score/`, avec Node >= 22 et les dépendances existantes installées :

```bash
npm run compile
# Si Chromium Playwright n'est pas encore installé :
npx playwright install chromium
node scripts/scan-urls.mjs rapport.json https://example.com/ https://example.com/produit https://example.com/panier
```

Le premier argument est le fichier JSON de sortie (écrasé s'il existe), les suivants sont les URLs explicites. Aucun lien n'est découvert. Les logs existants restent sur la console ; le JSON est écrit dans le fichier. Code de sortie 1 si une page échoue ou si l'écriture échoue, 0 sinon (quel que soit le score).

Dans un script ESM situé à la racine de l'app :

```js
import { scanUrls } from './dist/electron/scan-runner.js';

const report = await scanUrls([
  'https://example.com/',
  'https://example.com/produit',
  'https://example.com/panier',
]);
console.log(report.globalScore);
```

L'API TypeScript est exportée par `electron/scan-runner.ts`. Option : `{ headless: false }` pour afficher Chromium. L'app Electron garde son contrôleur, ses handlers IPC, son cycle interactif et son navigateur visible par défaut. Le moteur étant déjà indépendant d'Electron, aucune migration des handlers n'est nécessaire.

## Exécution et rapport

Chaque URL passe par `PlaywrightController.startScan()` puis `finishScan()`, puis `close()` dans un `finally`. Les pages sont traitées dans l'ordre, avec un navigateur et un contexte neufs : cookies, consentement, dataLayer et réseau ne sont pas partagés. Ce sont des audits indépendants, pas un parcours utilisateur avec panier/session persistants. Une erreur de navigation ou de génération du rapport est conservée par page et n'empêche pas le scan suivant. Une liste vide ou contenant autre chose que des chaînes est rejetée avant lancement.

- `pages[]` : URL demandée, statut, rapport complet existant (`report`, dont URL normalisée, scores, recommandations, données brutes et revue manuelle), ou erreur d'exécution.
- `issues[]` sur les pages réussies : critères `fail`/`partial` et tests comportementaux `fail`, repris sans réinterprétation. Les critères `manual`/`non_determine` et tests `not_tested` restent dans le rapport complet ; ce ne sont pas des problèmes confirmés.
- `summary` : nombre de pages demandées, réussies et échouées.
- `globalScore` : `obtained = somme(totalScore)`, `max = somme(maxScore)`, `percentage = obtained / max × 100`. Seules les pages réussies comptent. Le score est `null` si aucune page ne réussit, et le pourcentage vaut 0 si leur maximum total est nul. Un rapport avec des échecs est donc partiel.

L'agrégation conserve les maxima effectifs du moteur (notamment l'exclusion des critères CMP `non_determine`). Elle ne force pas un dénominateur de 120 : les maxima nominaux actuels des six modules du code totalisent 130, malgré le total annoncé dans la méthodologie. Aucun critère ni calcul existant n'est corrigé dans cette extraction.

## Limites conservées

Le runner termine après la détection initiale, sans phase humaine ni automatisation d'achat/consentement. L'audit CMP peut déjà ouvrir son panneau d'options. L'appel PageSpeed mobile existant est effectué pour chaque page (timeout de 60 s) ; son indisponibilité garde le traitement actuel du module Performance. Les pages authentifiées et les tunnels dépendant d'un panier nécessiteront une future gestion explicite de session/scénario. Aucun changement de méthodologie ni dépendance supplémentaire.

## Vérification

```bash
npm run compile
npm test -- --run
```

Les tests d'orchestration remplacent les opérations du contrôleur et le lancement Chromium : ordre séquentiel, isolation des instances, erreurs start/finish, fermeture, maxima variables, problèmes vs indéterminés, absence de score en cas d'échec total et défauts headed/headless.
