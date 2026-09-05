# Déclenchement manuel du pipeline éditorial (depuis mobile/admin)

## Principe

```
Admin (/admin → "Chat veille (IA)"), mobile ou desktop
        │  textarea "Lancer un article" + une idée tapée
        ▼
   POST supabase/functions/admin-trigger-article  { idea }
        │  (auth admin standard — requireUser, même pattern que les
        │   autres fonctions admin-*)
        ▼
   GitHub Issue créée (label `blog-on-demand`, via GITHUB_TOKEN déjà
   posé pour admin-generate-content — aucun nouveau secret)
        │
        ▼
   Webhook trigger (Claude GitHub App) réveille la routine cloud
   "Blog quotidien Studio Jannah" (voir mémoire blog-daily-routine)
        │  Étape 0.5 de son prompt : détecte l'issue, retire le label
        │  immédiatement (évite un traitement concurrent en double),
        │  utilise le titre/corps comme angle de départ (au lieu d'une
        │  recherche libre), fait quand même une recherche
        │  complémentaire pour sourcer/vérifier
        ▼
   Research → GEO/SEO → QA → Publish (même rigueur que le run quotidien)
        │
        ├─ Angle solide : PR content/admin-* (status: draft) + commentaire
        │  sur l'issue avec le lien + fermeture + PushNotification
        │
        └─ Angle rejeté par QA / pas de source solide : commentaire sur
           l'issue expliquant pourquoi + fermeture + PushNotification
           quand même — une demande explicite ne reste JAMAIS sans
           réponse (contrairement au run quotidien, silencieux par
           design quand rien n'émerge).
```

Le résultat est **toujours** une PR `status: draft` (jamais publiée
automatiquement) si un angle passe — exactement les mêmes garanties que
le run quotidien. Le délai est de 5 à 10 minutes, jamais instantané.

## Pourquoi une issue GitHub et pas un appel direct

L'API qui lance une routine cloud (`RemoteTrigger action:"run"`) n'est
accessible qu'authentifiée par un compte Claude.ai OAuth d'une session
Claude Code — une Edge Function Supabase ne peut pas l'appeler sans
stocker ce token côté serveur, ce qu'on refuse (même principe que ne
jamais donner la clé `service_role` à un contexte cloud tiers). Une issue
GitHub est un événement que la routine peut observer elle-même avec ses
propres outils (`mcp__github__*`), sans qu'aucun secret Claude ne
transite par Supabase.

## Prérequis (déjà fait au moment d'écrire ceci)

- Label `blog-on-demand` créé sur le repo.
- **Claude GitHub App** installée sur `atrari-pro/studio-jannah`
  (https://github.com/apps/claude/installations/select_target) — distincte
  de la connexion OAuth `/web-setup`, nécessaire pour que GitHub puisse
  livrer l'événement webhook à la routine.
- Webhook trigger attaché à la routine `trig_011UEH4fdjrTjUeb3JqS3Atk`
  (événement `issues` du repo, filtré sur le label `blog-on-demand`).

## Sécurité

Même garde-fous que `admin-generate-content` : auth admin obligatoire
(`requireUser`), idée plafonnée à 2000 caractères, aucun secret nouveau
(réutilise `GITHUB_TOKEN`). L'issue créée est publique sur le repo
GitHub — pas de donnée sensible à y mettre au-delà de l'idée d'article
elle-même.
