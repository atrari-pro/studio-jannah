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

Chaque URL passe par `PlaywrightController.startScan()`, `measureAutomatedConsent()`, puis `finishScan()` et `close()` dans un `finally`.

1. Détection initiale et audit CMP avant acceptation : présence, CTA, blocage et catégories (l'audit peut ouvrir le panneau via `OPEN_OPTIONS`).
2. Attente jusqu'à la fin des trois premières secondes depuis le début du scan : c'est la fenêtre pré-consentement utilisée par le scoring TMS et le test réseau existants. Les requêtes capturées sont conservées.
3. Tentative de clic Playwright (timeout 2 s) sur le CTA Accepter identifié par la recherche DOM partagée avec `auditCmp` dans `cmp-detection.ts` : règles Consent-O-Matic `presentSelectors`/`showingSelectors`, repli contextuel et mots-clés existants. Les libellés de refus sont exclus pour l'action, notamment « continuer sans accepter ».
4. Si le clic réussit, attente de 2 s puis nouvelle détection TMS, analytics, dataLayer et autres outils. L'audit CMP initial est conservé. Consent Mode v2 est mesuré par `finishScan()` sur cet état, sans changer ses critères.
5. Si aucun CTA accessible n'est trouvé ou si le clic échoue, rapport pré-consentement avec `consentMeasurement.status: "non_determine"` et raison explicite.

Les pages sont traitées dans l'ordre, avec un navigateur et un contexte neufs : cookies, consentement, dataLayer et réseau ne sont pas partagés. Ce sont des audits indépendants, pas un parcours utilisateur avec panier/session persistants. Une erreur de navigation ou de génération du rapport est conservée par page et n'empêche pas le scan suivant. Une liste vide ou contenant autre chose que des chaînes est rejetée avant lancement.

- `pages[]` : URL demandée, statut, rapport complet existant (`report`, dont URL normalisée, scores, recommandations, données brutes et revue manuelle), ou erreur d'exécution.
- `issues[]` sur les pages réussies : critères `fail`/`partial` et tests comportementaux `fail`, repris sans réinterprétation. Les critères `manual`/`non_determine` et tests `not_tested` restent dans le rapport complet ; ce ne sont pas des problèmes confirmés.
- `consentMeasurement` sur chaque page réussie : `status: "post_consent"` si le clic a réussi, sinon `"non_determine"` avec « Consentement non automatisable, mesure limitée à l'état pré-consentement ». `reason` précise la portée de la mesure. Un clic réussi ne certifie pas que la CMP a effectivement appliqué tous les consentements.
- `consentMeasurement` à la racine : nombres `postConsent` et `preConsentOnly` parmi les pages réussies ; `scoreIsLimited` indique qu'au moins une page n'a pas pu être mesurée après clic. Les échecs d'exécution restent comptés dans `summary.failed`.
- `summary` : nombre de pages demandées, réussies et échouées.
- `globalScore` : `obtained = somme(totalScore)`, `max = somme(maxScore)`, `percentage = obtained / max × 100`. Seules les pages réussies comptent. Le score est `null` si aucune page ne réussit, et le pourcentage vaut 0 si leur maximum total est nul. Un rapport avec des échecs est donc partiel.

L'agrégation conserve les maxima effectifs du moteur (notamment l'exclusion des critères CMP `non_determine`). Elle ne force pas un dénominateur de 120 : les maxima nominaux actuels des six modules du code totalisent 130, malgré le total annoncé dans la méthodologie. Aucun critère ni calcul existant n'est corrigé dans cette extraction.

## Limites conservées

Les CMP non reconnues par les sélecteurs et l'heuristique existants, les CTA non accessibles (par exemple certaines iframes), les langues non couvertes ou les panneaux de préférences sans CTA Accepter identifiable restent non-déterminables. La couverture n'est pas de 100 %. Le délai de 2 s peut manquer des tags plus tardifs.

Les scores, critères, recommandations et `issues` du moteur restent inchangés : en cas d'échec du clic, ils décrivent uniquement l'état pré-consentement. Un « non détecté » dans ces modules ne prouve alors pas l'absence d'un outil après consentement ; il faut lire `consentMeasurement` avec le score, y compris `globalScore`. Aucune exclusion de points ni renormalisation supplémentaire n'est appliquée.

Le moteur actuel garde les critères Consent Mode « default = denied » et « update après consentement » manuels, et les tests refus/transition gcs non exécutés. La détection v2 existante n'est pas étendue par ce changement. La fenêtre réseau pré-consentement reste celle des trois premières secondes, pas toute la durée jusqu'au clic. Le runner n'automatise ni refus ni achat.

L'appel PageSpeed mobile existant est effectué pour chaque page (timeout de 60 s) ; son indisponibilité garde le traitement actuel du module Performance. Les pages authentifiées et les tunnels dépendant d'un panier nécessiteront une future gestion explicite de session/scénario. Aucun changement de méthodologie ni dépendance supplémentaire.

## Vérification

```bash
npm run compile
npm test -- --run
```

Les tests d'orchestration remplacent les opérations du contrôleur et le lancement Chromium : ordre séquentiel, isolation des instances, erreurs start/finish, fermeture, maxima variables, problèmes vs indéterminés, absence de score en cas d'échec total et défauts headed/headless. Ils couvrent aussi le clic réussi/échoué, une erreur CMP, le signalement agrégé, le délai pré-consentement, le rafraîchissement post-clic et la conservation du CMP initial.
