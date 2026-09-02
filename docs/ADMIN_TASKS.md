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
`ensureProject()` dans chacune de ces fonctions. La page Projets sert à
consulter/changer ce statut et à voir, pour un projet donné, le compte des
tâches liées + le score de l'objectif de cadence associé.

## Tâches (ponctuel)

Une tâche = un début, une fin, un statut (`a_faire` / `en_cours` / `fait`).
Affichée sur une frise mensuelle simple (barres positionnées par date,
navigation mois précédent/suivant) — pas de glisser-déposer, pas de
dépendances entre tâches. Clic sur une barre → éditer statut, supprimer.

## Objectifs (cadence à tenir, avec score)

Un objectif = un rythme cible à tenir dans la durée (ex. "publier sur
LinkedIn 6x/semaine"), pas une tâche avec un début/fin. Pointage manuel
jour par jour ("j'ai fait le travail aujourd'hui"), et un **score
recalculé à l'affichage** (jamais stocké) :

```
jours_écoulés   = (date_référence − date_début) + 1, plafonné à la date de
                  fin si l'objectif est déjà terminé
semaines_écoulées = jours_écoulés / 7
attendu         = cadence_cible × semaines_écoulées
réalisé         = nombre de pointages entre début et date_référence
%               = réalisé / attendu × 100
statut          = > 105 % avance · 95–105 % à jour · < 95 % retard
```

Une cadence de **6x/semaine** tolère nativement 1 jour de repos par semaine
sans pénalité (6 jours pointés sur 7 écoulés = 100 %) — pas besoin de logique
spéciale, la formule l'encode directement.

Deux écrans :
- **Liste** : sélecteur de date de référence (défaut aujourd'hui), tri par
  score (pire en premier) ou par échéance
- **Détail** : % à date, bande jour-par-jour du mois (case verte = pointé,
  clic pour pointer/dépointer un jour passé ou aujourd'hui — jamais un jour
  futur ni hors de la période de l'objectif)

## Modèle de données

- `projects` (`supabase/projects.sql`) : `name` (unique, insensible à la
  casse), `status` (`actif`/`pause`/`fait`/`abandonne`), `notes`
- `tasks` (`supabase/tasks.sql`) : `project`, `title`, `start_date`,
  `end_date`, `status`, `notes`
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
- Admin UI : `apps/app/src/Admin.tsx` (composants `Projects`, `Tasks`,
  `Objectives`, fonction pure `computeObjectiveScore`), cartes "Projets" /
  "Tâches" / "Objectifs" dans le menu
