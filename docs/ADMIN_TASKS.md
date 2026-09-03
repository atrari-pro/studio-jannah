# Projets, Tâches & Objectifs (admin)

Trois mécanismes dans le même espace admin, liés entre eux par nom de
projet — voir aussi `docs/ADMIN_LEADS.md` (même pattern d'auth) et
`docs/VEILLE_RSS.md` (même conventions Supabase).

## Projets (statut de premier niveau)

`tasks.project` et `objectives.project` (et depuis peu `leads.project`) sont
du texte libre — pratique, mais un projet lui-même n'avait pas de statut :
impossible de marquer "Landing Malt" comme fait une fois livré, indépendamment
du détail des tâches/objectifs qui le composent.

`projects` (`supabase/projects.sql`) comble ce trou : une table à part, liée
**par nom** (pas de foreign key) plutôt qu'une migration des colonnes
existantes — choix délibéré pour ne courir aucun risque sur les données déjà
en prod. Statuts : `actif` / `pause` / `fait` / `abandonne`.

Un projet n'a pas besoin d'être créé à la main : `admin-tasks`,
`admin-objectives` et `admin-leads` en upsertent un automatiquement (par nom,
insensible à la casse) dès qu'il est utilisé quelque part — voir
`ensureProject()` dans chacune de ces fonctions.

## Écran Planning (nav Aujourd'hui / Roadmap / Projets)

Un seul écran admin ("Planning"), avec une nav propre à cet écran
(`PlanningShell` dans `Admin.tsx` — sidebar desktop, barre d'onglets fixe en
bas sur mobile) plutôt que des cartes séparées Tâches/Objectifs :

- **Aujourd'hui** (par défaut à l'ouverture) : tâches dues ou en retard tous
  projets confondus, cadences pas encore pointées aujourd'hui — la vue "que
  dois-je faire" sans ouvrir projet par projet.
- **Roadmap** : frise Gantt maison (`TaskTimeline`) portefeuille, tous
  projets visibles selon le filtre de statut ; filtrable par catégorie.
- **Projets** : liste/grille de projets, détail projet (tâches + cadence) et
  détail tâche restent des vues imbriquées dans cet onglet, inchangées dans
  leur principe depuis la refonte "Projet = écran unique".

Refonte (voir historique git) : plus de score/statut de santé jugé nulle
part — retiré volontairement, remplacé par du suivi factuel (voir
"Objectifs" ci-dessous). L'intention : un outil de suivi et de motivation,
pas un outil qui note.

## Tâches (ponctuel)

Une tâche = un début, une fin, un statut (`a_faire` / `en_cours` / `fait`),
une catégorie optionnelle en texte libre (`category`, pas d'enum — voir
`categoryColor` dans `Admin.tsx` pour l'accent visuel déterministe par nom).
Affichée en cartes (statut modifiable en un select) + frise Gantt en dessous
dès qu'il y a plus d'une tâche sur le projet. Clic sur une carte → détail,
modifier, supprimer.

## Objectifs (cadence à tenir, en pur suivi)

Un objectif = un rythme cible à tenir dans la durée (ex. "publier sur
LinkedIn 6x/semaine"), pas une tâche avec un début/fin. Pointage manuel
jour par jour ("j'ai fait le travail aujourd'hui"), affiché sans aucun
%/statut jugé :

- **Streak** (`computeStreak`) : nombre de jours consécutifs pointés jusqu'à
  aujourd'hui (ou hier si le jour courant n'est pas encore pointé, pour ne
  pas casser l'affichage en cours de journée).
- **Rappel brut 7 jours** (`countRecentCheckins`) : nombre de pointages sur
  les 7 derniers jours, affiché à côté de l'objectif visé (`target_per_week`)
  sans ratio calculé.
- **Heatmap** (`buildActivityData` + `react-activity-calendar`) : déjà un
  suivi binaire fait/pas fait, gardée telle quelle depuis avant la refonte.
- Bouton "Pointer aujourd'hui" en plus du clic sur la case du jour dans la
  heatmap.

Pas de %, pas de statut avance/à jour/retard, pas de ring de progression —
volontairement retiré (voir plus haut).

## Modèle de données

- `projects` (`supabase/projects.sql`) : `name` (unique, insensible à la
  casse), `status` (`actif`/`pause`/`fait`/`abandonne`), `notes`
- `tasks` (`supabase/tasks.sql`) : `project`, `title`, `start_date`,
  `end_date`, `status`, `notes`, `category` (texte libre, nullable —
  catégorisation optionnelle définie par l'utilisateur, pas d'enum)
- `objectives` (`supabase/objectives.sql`) : `project`, `title`,
  `start_date`, `end_date` (nullable = sans fin prévue), `target_per_week`
  (1–7), `status` (`actif`/`pause`/`termine`)
- `objective_checkins` : `objective_id`, `date` (unique par objectif — un
  seul pointage par jour), `note` optionnelle
- `leads.project` (`supabase/projects.sql`, colonne ajoutée sur la table
  existante) : rattachement optionnel d'un lead à un projet, une fois
  transformé en mission réelle

Même choix RLS que `veille_rss`/`leads` : aucune policy anon/authenticated,
accès `service_role` uniquement via les Edge Functions, protection dans le
code plutôt qu'une policy.

## Déploiement

```bash
# Coller, dans l'ordre, dans Supabase → SQL Editor → Run :
# 1. supabase/tasks.sql
# 2. supabase/objectives.sql
# 3. supabase/projects.sql (crée `projects` + ajoute `leads.project`)

pnpm dlx supabase functions deploy admin-tasks
pnpm dlx supabase functions deploy admin-objectives
pnpm dlx supabase functions deploy admin-projects
pnpm dlx supabase functions deploy admin-leads
```

Aucun secret à poser : `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` déjà
injectées automatiquement par Supabase.

Une tâche/objectif/lead déjà existant (créé avant `projects.sql`) ne
déclenche pas rétroactivement l'auto-création de son projet — il suffit de
le rouvrir et de le réenregistrer une fois (ou de créer le projet à la main
depuis la page Projets) pour que le lien apparaisse.

## Fichiers

- Tables : `supabase/tasks.sql`, `supabase/objectives.sql`, `supabase/projects.sql`
- Fonctions : `supabase/functions/admin-tasks/`, `supabase/functions/admin-objectives/`,
  `supabase/functions/admin-projects/`, `supabase/functions/admin-leads/`
- Admin UI : `apps/app/src/Admin.tsx` — composant `Projects` (écran Planning
  entier : Aujourd'hui/Roadmap/Projets), `PlanningShell` (nav), `TaskTimeline`
  (frise), fonctions pures `computeStreak`/`countRecentCheckins`/
  `countLateTasks`/`categoryColor`/`buildActivityData`. Une seule carte
  "Projets" dans le menu (section "Planning").
