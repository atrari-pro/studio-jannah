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

console.log(`${items.length} article${items.length > 1 ? "s" : ""} en attente :\n`);
for (const item of items) {
  const plainSummary = (item.summary || "").replace(/<[^>]+>/g, "").trim();
  console.log(`— ${item.title}`);
  console.log(`  ${item.link}`);
  if (plainSummary) {
    console.log(`  ${plainSummary.slice(0, 200)}${plainSummary.length > 200 ? "…" : ""}`);
  }
  console.log("");
}
