# Notifications leads — email + Telegram

## Principe

```
Formulaire /contact → INSERT public.leads (déjà en place, RLS anon insert-only)
                              │
              Database Webhook Supabase (Dashboard, pas de code)
                              │
              Edge Function supabase/functions/notify-lead
                              │
                    Resend (email)   +   Telegram Bot API
```

Rien de sensible ne transite par le site statique (`apps/web`). Tous les secrets
vivent dans les **secrets de la fonction Supabase** — jamais dans `apps/web/.env`,
jamais avec un préfixe `PUBLIC_*` (ce préfixe finit dans le bundle JS envoyé au
navigateur, donc public par construction — bon pour l'anon key protégée par RLS,
jamais pour une clé d'email ou un token de bot).

## Ce que vous devez faire (comptes / secrets — je ne peux pas le faire à votre place)

### 1. Resend (email)

1. Créer un compte sur [resend.com](https://resend.com) (gratuit, 3000 emails/mois).
2. Domains → ajouter votre domaine si vous en avez un (sinon le domaine de test
   `onboarding@resend.dev` fonctionne mais atterrit plus facilement en spam —
   à réserver aux tests). Suivre les enregistrements DNS proposés (SPF/DKIM).
3. API Keys → créer une clé → copier (`re_...`).

### 2. Telegram (notification instantanée)

1. Ouvrir Telegram, chercher **@BotFather**, envoyer `/newbot`, suivre les
   instructions → il vous donne un token (`123456:ABC-...`).
2. Envoyer un message quelconque à votre nouveau bot (sinon il ne peut pas
   vous écrire).
3. Récupérer votre `chat_id` : ouvrir dans le navigateur
   `https://api.telegram.org/bot<VOTRE_TOKEN>/getUpdates` juste après avoir
   envoyé le message — le `chat.id` apparaît dans la réponse JSON.

### 3. Déployer la fonction (Supabase CLI)

```bash
# une fois, si pas déjà fait
pnpm dlx supabase login
pnpm dlx supabase link --project-ref <votre-ref-projet>

# déploie la fonction telle qu'écrite dans le repo
pnpm dlx supabase functions deploy notify-lead
```

### 4. Secrets de la fonction

```bash
pnpm dlx supabase secrets set \
  RESEND_API_KEY=re_xxx \
  NOTIFY_EMAIL_FROM="Studio Jannah <leads@votre-domaine>" \
  NOTIFY_EMAIL_TO=votre.email@perso.fr \
  TELEGRAM_BOT_TOKEN=123456:ABC-xxx \
  TELEGRAM_CHAT_ID=123456789 \
  LEAD_WEBHOOK_SECRET="$(openssl rand -hex 24)"
```

`LEAD_WEBHOOK_SECRET` : générez une chaîne aléatoire (la commande `openssl
rand -hex 24` ci-dessus en fait une) et gardez-la sous la main pour l'étape 5 —
c'est ce qui empêche n'importe qui d'appeler directement l'URL de la fonction
pour vous spammer.

### 5. Créer le déclencheur (Database Webhook, ou trigger SQL en repli)

D'abord activer l'extension **pg_net** : Dashboard → Database → Extensions →
chercher `pg_net` → activer. Requis dans les deux méthodes ci-dessous.

**Méthode A — Dashboard (à essayer en premier)**

Dashboard → **Integrations → Database Webhooks → Webhooks → Create a new hook**
- Table : `leads`
- Events : `INSERT` uniquement
- Type : **Supabase Edge Functions**
- Function : `notify-lead`
- HTTP Headers → ajouter `x-webhook-secret` = la même valeur qu'à l'étape 4

**Méthode B — trigger SQL (si erreur `3F000 schema supabase_functions does
not exist`)**

Ce schéma interne est absent sur certains projets ; le contournement est un
trigger qui appelle `net.http_post` directement (même effet, dépend
uniquement de `pg_net`). Le script est dans `supabase/leads.sql` (commenté,
en bas du fichier) — décommenter, remplacer `<PROJECT_REF>`,
`<SERVICE_ROLE_JWT>` (Project Settings → API) et `<LEAD_WEBHOOK_SECRET>`
(la valeur de l'étape 4), puis coller/exécuter dans SQL Editor.

### 6. Test

Soumettre le formulaire `/contact` en local ou en prod → vous devez recevoir
l'email ET le message Telegram en quelques secondes. Vérifier aussi
Dashboard → Edge Functions → notify-lead → Logs en cas de souci.

## Sécurité — pourquoi c'est fait comme ça

- **Aucun secret dans le repo git** ni dans `apps/web` (site statique = tout
  son JS est public).
- **`x-webhook-secret`** : défense en profondeur — même si l'URL de la
  fonction fuite, un appel sans le bon header est rejeté (401) avant tout
  envoi d'email/Telegram.
- **`reply_to` = email du lead** sur l'email envoyé : vous répondez direct
  depuis votre boîte, sans exposer votre adresse perso nulle part sur le site.
- Le honeypot du formulaire (`contact.astro`) bloque déjà les soumissions bot
  basiques *avant* l'INSERT — elles n'atteignent jamais cette fonction.
- Si vous changez d'avis sur un canal, supprimez juste ses variables (les
  secrets manquants désactivent proprement l'envoi correspondant, sans erreur
  côté fonction — `sendEmail`/`sendTelegram` sortent tôt si les secrets sont vides).
