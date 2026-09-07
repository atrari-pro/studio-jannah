# Auto-feed Blog — moteur d'auto-alimentation (100% Gemini)

## Principe

```
GitHub Actions (.github/workflows/content-auto-feed.yml)
   cron mar+ven 08:00 UTC, ou déclenché à la demande (workflow_dispatch)
                    │
        node scripts/blog-generate.mjs
                    │
   Phase 1 — RECHERCHE (Gemini + grounding Google Search,
   tools: [{googleSearch:{}}], même technique que
   supabase/functions/admin-veille-chat/index.ts)
     · lit les titres déjà publiés + .claude/agents/research.notes.md
       (journal PARTAGÉ avec la routine Claude Code "Blog quotidien" —
       aucun doublon d'angle entre les deux pipelines)
     · cherche 1 angle frais (< ~14 jours), dans le scope Studio Jannah
     · "rien de bon" → silence total, aucun fichier écrit, aucun commit
     · sources jamais prises dans le texte du modèle — uniquement dans
       groundingMetadata.groundingChunks, résolues (HEAD + follow
       redirect) vers l'URL réelle ; une source morte est écartée
                    │
   Phase 2 — RÉDACTION (Gemini, JSON structuré, PAS de grounding — les
   deux ne se combinent pas de façon fiable dans l'API)
     · reçoit le compte-rendu de la phase 1 + la liste EXACTE des
       sources vérifiées (le modèle choisit par index, ne peut pas en
       inventer une autre) + l'inventaire complet des slugs Expertises
       (pour relatedExpertises)
     · écrit apps/web/content/insights/<slug>.md, status: draft
                    │
   Le workflow détecte le nouveau fichier → branche `content/auto-<slug>`
   → commit (article + entrée dans research.notes.md) → push → PR
                    │
   POST supabase/functions/notify-draft → Telegram (même bot que les
   drafts de la routine existante, voir docs/DRAFT_NOTIFICATIONS.md)
```

Toujours `status: draft` — jamais publié automatiquement. La PR apparaît
dans l'admin comme n'importe quel autre brouillon (même convention de
branche `content/auto-*`, proche de `content/admin-*`). Merger reste un
geste humain explicite.

## Pourquoi deux pipelines de recherche/rédaction séparés

- **Routine cloud "Blog quotidien"** (Claude Code, agents `.claude/agents/*.md`) :
  qualité éditoriale la plus fine, mais consomme des crédits Claude à
  chaque article.
- **Ce moteur** (`scripts/blog-generate.mjs`, GitHub Actions) : 100% Gemini
  gratuit, zéro coût Claude, tourne indépendamment. Garantit un plancher
  de ~2 articles/semaine même quand personne ne pilote la routine Claude.

Les deux pipelines **partagent** `.claude/agents/research.notes.md` (lu et
complété par les deux) pour ne jamais reproposer le même angle. Aucun
fichier ni convention de contenu n'est dupliqué — même collection
`insights`, même schéma, même routes `/blog/*`.

## Configuration initiale (une seule fois)

### 1. Secret `GEMINI_API_KEY`

Même clé que celle déjà utilisée en local (`.env`) et côté Supabase
(`admin-generate-content`, `admin-veille-filter`, `admin-veille-chat`) —
aucune nouvelle clé à créer, juste à la déclarer aussi côté GitHub Actions :

```bash
gh secret set GEMINI_API_KEY
# colle la valeur (Google AI Studio → API keys), puis Entrée
```

**Quota gratuit** : 20 requêtes/jour/modèle/projet (voir
`scripts/expertise-generate.mjs`, même fallback multi-modèles
`gemini-2.5-flash` → `gemini-3.5-flash` réutilisé ici). Ce moteur ne fait
que 2 appels par run (recherche + rédaction) — largement dans le quota
pour une cadence de 2 runs/semaine. Si le quota est déjà épuisé par un
autre usage le même jour (comme lors de la mise en place de ce moteur,
juste après un gros lot de génération Expertises), le run échoue
proprement (aucun fichier, rien de cassé) — retente au run suivant.

**Pour aller plus loin** : `scripts/expertise-generate.mjs` et
`scripts/blog-generate.mjs` savent utiliser plusieurs clés en fallback
automatique. Une seconde clé (nouveau projet Google AI Studio, gratuit,
sans carte bancaire) a son propre quota indépendant de la première.

Local (`.env`) — ajouter une ligne, sans toucher à `GEMINI_API_KEY` :
```
GEMINI_API_KEY_2=ta_seconde_cle
```

GitHub Actions — même principe :
```bash
gh secret set GEMINI_API_KEY_2
```

`GEMINI_API_KEY_3` à `GEMINI_API_KEY_5` sont acceptées de la même façon
si besoin d'encore plus de débit. Pas nécessaire pour la cadence cible de
ce moteur (2/semaine, 2 appels Gemini par run) — utile surtout si Gemini
tourne en parallèle d'un autre usage le même jour (génération Expertises,
admin-veille-filter...).

### 2. Secret `DRAFT_WEBHOOK_SECRET`

Déjà créé côté Supabase pour `notify-draft` (voir
`docs/DRAFT_NOTIFICATIONS.md`) — il faut juste la même valeur côté
GitHub Actions :

```bash
gh secret set DRAFT_WEBHOOK_SECRET
# colle la MÊME valeur que le secret Supabase du même nom
```

(Si la valeur d'origine n'est plus disponible, elle se retrouve dans le
Dashboard Supabase → Edge Functions → notify-draft → Secrets — ou se
régénère avec `openssl rand -hex 24`, à condition de mettre à jour le
secret Supabase ET la config de la routine Claude Code cloud avec la
même nouvelle valeur, sinon la routine existante casse.)

### 3. Vérification

```bash
gh workflow run content-auto-feed.yml
gh run watch
```

Sans angle frais trouvé ce jour-là : le run se termine en succès, sans
rien committer (normal, pas un bug). Avec un angle trouvé : une PR
`content/auto-*` apparaît, et un message Telegram arrive.

## Cadence et déclenchement à la demande

- **Plancher automatique** : mardi + vendredi, 08:00 UTC — modifiable en
  éditant le `cron:` du workflow.
- **Plus cette semaine** : `gh workflow run content-auto-feed.yml` (autant
  de fois que voulu), ou bouton "Run workflow" sur GitHub → Actions →
  "Auto-feed Blog (Gemini)". Peut aussi être demandé directement à Claude
  Code en session ("lance un run du moteur d'auto-alimentation") plutôt
  que de toucher l'UI GitHub.
- **Rien cette semaine** : ne rien faire, ou fermer la PR si un brouillon
  ne convient pas — le journal `research.notes.md` garde trace de ce qui
  a été écarté pour ne pas le reproposer.

## Limites connues (v1)

- Pas de notification Telegram en cas d'échec technique (quota épuisé,
  erreur API) — seulement en cas de succès (nouveau brouillon). Un run en
  échec reste visible dans GitHub Actions (onglet Actions du repo), pas
  ailleurs. Amélioration possible plus tard si besoin réel : notifier
  aussi les échecs.
- **Grounding et quota** (constaté empiriquement le 2026-09-07, deux clés
  testées) : le grounding Google Search (`tools:[{googleSearch:{}}]`,
  phase recherche) semble consommer le MÊME quota général
  `generate_content_free_tier_requests` (20/jour/modèle/projet) plutôt
  qu'un quota dédié séparé — comportement documenté comme bug connu côté
  écosystème Gemini (des utilisateurs rapportent le même souci), malgré
  la communication officielle Google qui annonce un forfait mensuel de
  grounding bien plus généreux (5000/mois sur la famille Gemini 3.x). En
  pratique : une session qui a déjà fait beaucoup d'appels
  `expertise:generate`/`blog:generate` dans la journée peut épuiser le
  quota de recherche AVANT même la 1ère requête de rédaction — pas un bug
  de ce script, une contrainte du palier gratuit à surveiller. Une
  seconde clé (`GEMINI_API_KEY_2`) aide mais peut aussi s'épuiser vite si
  utilisée pour tester en rafale (vérifié : plusieurs appels manuels de
  test ont suffi à l'épuiser le même jour que sa création).
