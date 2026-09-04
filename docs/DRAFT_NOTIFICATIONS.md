# Notification "brouillon prêt" — routine quotidienne du blog

## Principe

```
Routine programmée (cloud, voir routine "Blog quotidien" sur claude.ai/code/routines)
        │  Director/Research/GEO-SEO/QA/Publish (.claude/agents/*.md)
        │  → si un angle solide passe QA : commit + gh pr create (content/admin-*)
        │  → sinon : rien, silence, pas de PR ce jour-là
        ▼
   POST supabase/functions/notify-draft  { title, prUrl }
        │  (header x-webhook-secret, pas de trigger SQL — le déclencheur
        │   est la routine elle-même, pas un INSERT tiers non fiable
        │   comme pour les leads, voir docs/LEAD_NOTIFICATIONS.md)
        ▼
   Telegram Bot API (même bot que les leads — TELEGRAM_BOT_TOKEN/
                      TELEGRAM_CHAT_ID déjà posés, rien à recréer)
```

La PR ouverte est **toujours `status: draft`** — jamais publiée
automatiquement. Elle apparaît dans l'admin, écran "Drafts en attente",
exactement comme celles créées par le wizard (même convention de branche
`content/admin-*`). Merger reste un geste humain explicite.

## Ce que vous devez faire

### 1. Nouveau secret

Un seul secret à créer (Telegram est déjà configuré, réutilisé tel quel) :

```bash
pnpm dlx supabase secrets set DRAFT_WEBHOOK_SECRET="$(openssl rand -hex 24)"
```

Notez la valeur générée — la routine en a besoin pour appeler cette
fonction (elle est intégrée à la configuration de la routine, pas dans
ce repo).

### 2. Déployer la fonction

```bash
pnpm dlx supabase functions deploy notify-draft
```

(ou copier `supabase/functions/notify-draft/index.ts` dans l'éditeur
inline du Dashboard → Edge Functions → Deploy, même méthode que pour les
autres fonctions de ce projet)

### 3. Test isolé

```bash
curl -s -X POST "https://eileoaxbxiimmrcakhcy.supabase.co/functions/v1/notify-draft" \
  -H "x-webhook-secret: <LA_VALEUR_DE_L'ÉTAPE_1>" \
  -H "content-type: application/json" \
  -d '{"title":"Test","prUrl":"https://github.com/atrari-pro/studio-jannah/pulls"}'
```

Doit renvoyer `{"ok":true}` et faire arriver un message Telegram en
quelques secondes. Sans le bon header → `401`.

## Sécurité

Même logique que `notify-lead` (`docs/LEAD_NOTIFICATIONS.md`) : secret
dédié (`DRAFT_WEBHOOK_SECRET`, distinct de `LEAD_WEBHOOK_SECRET` — isole
les deux points d'entrée), rien de sensible dans `apps/web` ni dans ce
repo. Panne Telegram = best-effort, ne bloque jamais la routine (la PR
existe déjà, seule la notification échoue silencieusement, loggée côté
Dashboard → Edge Functions → notify-draft → Logs).
