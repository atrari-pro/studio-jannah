// Studio Jannah — notify-lead
// Déclenchée par un trigger SQL sur INSERT dans public.leads (voir
// supabase/leads.sql — le Database Webhook via Dashboard a échoué sur ce
// projet, schéma `supabase_functions` absent ; contournement : trigger SQL
// qui appelle net.http_post directement, même effet).
// Envoie une notif email (Resend) + Telegram. Tous les secrets viennent de
// Deno.env (Supabase Function secrets) — rien de sensible n'est en dur ici,
// rien ne transite jamais par le site statique (apps/web).
//
// Déploiement : voir docs/LEAD_NOTIFICATIONS.md
//
// NB : pas de types TypeScript ici (interfaces/annotations) — l'éditeur
// inline du Dashboard Supabase (utilisé pour déployer ce projet) bute sur
// les types imbriqués avec une propriété nommée `type`. JS pur pour rester
// déployable tel quel depuis le Dashboard.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const NOTIFY_EMAIL_FROM = Deno.env.get("NOTIFY_EMAIL_FROM") ?? "";
const NOTIFY_EMAIL_TO = Deno.env.get("NOTIFY_EMAIL_TO") ?? "";
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") ?? "";
// Secret partagé vérifié sur chaque appel — sans lui, un appel direct sur
// l'URL de la fonction (si quelqu'un la devine) est rejeté avant tout envoi.
const WEBHOOK_SECRET = Deno.env.get("LEAD_WEBHOOK_SECRET") ?? "";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!WEBHOOK_SECRET || req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  if (payload.table !== "leads" || payload.type !== "INSERT" || !payload.record) {
    return new Response("Ignored", { status: 200 });
  }

  const lead = payload.record;

  const outcomes = await Promise.allSettled([sendEmail(lead), sendTelegram(lead)]);
  for (const outcome of outcomes) {
    if (outcome.status === "rejected") console.error("[notify-lead]", outcome.reason);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

async function sendEmail(lead) {
  if (!RESEND_API_KEY || !NOTIFY_EMAIL_FROM || !NOTIFY_EMAIL_TO) return;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: NOTIFY_EMAIL_FROM,
      to: [NOTIFY_EMAIL_TO],
      reply_to: lead.email,
      subject: `Nouveau lead — ${lead.name}`,
      text: [
        `Nom : ${lead.name}`,
        `Email : ${lead.email}`,
        `Page : ${lead.page_path ?? "/contact"}`,
        `Reçu : ${lead.created_at}`,
        "",
        lead.message,
      ].join("\n"),
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }
}

async function sendTelegram(lead) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const text = [
    "🟡 Nouveau lead Studio Jannah",
    "",
    `${lead.name} — ${lead.email}`,
    "",
    lead.message,
    "",
    `(${lead.page_path ?? "/contact"})`,
  ].join("\n");

  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
  });

  if (!res.ok) {
    throw new Error(`Telegram ${res.status}: ${await res.text()}`);
  }
}
