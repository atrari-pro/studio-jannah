# Tâches & Objectifs (admin)

Deux mécanismes distincts, dans le même espace admin, qui répondent à deux
besoins différents — voir aussi `docs/ADMIN_LEADS.md` (même pattern d'auth)
et `docs/VEILLE_RSS.md` (même conventions Supabase).

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

- `tasks` (`supabase/tasks.sql`) : `project`, `title`, `start_date`,
  `end_date`, `status`, `notes`
- `objectives` (`supabase/objectives.sql`) : `project`, `title`,
  `start_date`, `end_date` (nullable = sans fin prévue), `target_per_week`
  (1–7), `status` (`actif`/`pause`/`termine`)
- `objective_checkins` : `objective_id`, `date` (unique par objectif — un
  seul pointage par jour), `note` optionnelle

Même choix RLS que `veille_rss`/`leads` : aucune policy anon/authenticated,
accès `service_role` uniquement via les Edge Functions, protection dans le
code plutôt qu'une policy.

## Déploiement

```bash
# Coller supabase/tasks.sql puis supabase/objectives.sql dans
# Supabase → SQL Editor → Run

pnpm dlx supabase functions deploy admin-tasks
pnpm dlx supabase functions deploy admin-objectives
```

Aucun secret à poser : `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` déjà
injectées automatiquement par Supabase.

## Fichiers

- Tables : `supabase/tasks.sql`, `supabase/objectives.sql`
- Fonctions : `supabase/functions/admin-tasks/`, `supabase/functions/admin-objectives/`
- Admin UI : `apps/app/src/Admin.tsx` (composants `Tasks`, `Objectives`,
  fonction pure `computeObjectiveScore`), cartes "Tâches" / "Objectifs"
  dans le menu
