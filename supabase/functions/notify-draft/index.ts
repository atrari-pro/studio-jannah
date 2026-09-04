// Studio Jannah — notify-draft
// Alerte Telegram "nouveau brouillon prêt" — appelée par un simple POST
// HTTP, directement par la routine cloud qui vient d'ouvrir une PR de
// contenu (content/admin-*), pas par un trigger SQL comme notify-lead
// (pas d'INSERT en base à observer ici : le déclencheur est la routine
// elle-même, pas un tiers non fiable — donc pas besoin de pg_net/trigger
// Postgres, juste ce POST direct).
//
// Réutilise TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID, déjà posés côté Supabase
// pour notify-lead (même bot, même canal). Seul secret nouveau :
// DRAFT_WEBHOOK_SECRET (même rôle que LEAD_WEBHOOK_SECRET — défense en
// profondeur si l'URL fuite, distinct pour isoler les deux points d'entrée).
//
// Pas de types TypeScript imbriqués — JS pur, éditable dans le Dashboard.

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") ?? "";
const WEBHOOK_SECRET = Deno.env.get("DRAFT_WEBHOOK_SECRET") ?? "";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!WEBHOOK_SECRET || req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  if (!body.title || !body.prUrl) {
    return new Response("title/prUrl manquant", { status: 400 });
  }

  try {
    await sendTelegram(body.title, body.prUrl);
  } catch (e) {
    console.error("[notify-draft]", e);
    // Best-effort : une panne Telegram ne doit pas faire échouer la
    // routine appelante, le brouillon existe déjà (PR ouverte) — 200
    // quand même, le problème est loggé pour être vu dans le Dashboard.
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

async function sendTelegram(title, prUrl) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const text = ["📝 Nouveau brouillon prêt — Studio Jannah", "", title, "", prUrl].join("\n");

  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
  });

  if (!res.ok) {
    throw new Error(`Telegram ${res.status}: ${await res.text()}`);
  }
}
