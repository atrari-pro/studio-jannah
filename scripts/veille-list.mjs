#!/usr/bin/env node
// Studio Jannah — pnpm veille:list
// Interroge veille_rss (status=nouveau) en local avec le service_role, pour
// relire/résumer/publier ensuite via le pipeline éditorial (AGENTS.md).
// Le fetch/stockage se fait côté admin (apps/app, Edge Function admin-veille) —
// ce script est en lecture seule, une seule requête REST, pas de dépendance
// Supabase nécessaire ici.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Manque SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY dans l'environnement — voir .env.example à la racine.",
  );
  process.exit(1);
}

const res = await fetch(`${SUPABASE_URL}/rest/v1/veille_rss?select=*&status=eq.nouveau&order=fetched_at.desc`, {
  headers: {
    apikey: SERVICE_ROLE_KEY,
    authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  },
});

if (!res.ok) {
  console.error(`Erreur Supabase (${res.status}) :`, await res.text());
  process.exit(1);
}

const items = await res.json();

if (items.length === 0) {
  console.log("Aucun article en attente (status=nouveau).");
  process.exit(0);
}

// pertinent d'abord (ce qui mérite d'être passé au pipeline éditorial),
// puis non jugé (pas encore passé par "Filtrer (IA)" dans l'admin), puis
// hors_scope en dernier — même ordre que la liste dans l'admin.
const RELEVANCE_ORDER = { pertinent: 0, hors_scope: 2 };
const rank = (item) => (item.relevance in RELEVANCE_ORDER ? RELEVANCE_ORDER[item.relevance] : 1);
items.sort((a, b) => rank(a) - rank(b));

const RELEVANCE_LABEL = { pertinent: "✅ pertinent", hors_scope: "❌ hors scope" };

console.log(`${items.length} article${items.length > 1 ? "s" : ""} en attente :\n`);
for (const item of items) {
  const plainSummary = (item.summary || "").replace(/<[^>]+>/g, "").trim();
  const relevanceLabel = RELEVANCE_LABEL[item.relevance] || "⬜ non jugé";
  console.log(`— [${relevanceLabel}] ${item.title}`);
  console.log(`  ${item.link}`);
  if (plainSummary) {
    console.log(`  ${plainSummary.slice(0, 200)}${plainSummary.length > 200 ? "…" : ""}`);
  }
  if (item.relevance_reason) {
    console.log(`  → ${item.relevance_reason}`);
  }
  console.log("");
}
