#!/usr/bin/env node
// Studio Jannah — pnpm veille:search
// Cherche des URLs candidates (mesure/tracking/CRO/data-IA) via l'API Gemini
// (grounding Google Search), mêmes critères de scope que
// .claude/agents/veille-filter.md — pour rester cohérent avec ce que
// l'admin juge déjà pertinent.
//
// Local uniquement : la clé GEMINI_API_KEY ne quitte jamais cette machine,
// même trust boundary que SUPABASE_SERVICE_ROLE_KEY dans pnpm veille:list.
//
// Relancer ce script élargit plutôt que de répéter : il relit la mémoire
// déjà accumulée (docs/veille-gemini-suggestions.md) et demande
// explicitement à Gemini des angles non déjà proposés.

import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error(
    "Manque GEMINI_API_KEY dans l'environnement — ajoute-la à ton .env local " +
      "(même valeur que le secret Supabase GEMINI_API_KEY utilisé par admin-veille-filter). " +
      "Voir .env.example.",
  );
  process.exit(1);
}

const CRITERIA_PATH = join(ROOT, ".claude/agents/veille-filter.md");
const MEMORY_PATH = join(ROOT, "docs/veille-gemini-suggestions.md");

const criteria = readFileSync(CRITERIA_PATH, "utf8").replace(/^---[\s\S]*?---\n/, "");
const already = existsSync(MEMORY_PATH) ? readFileSync(MEMORY_PATH, "utf8") : "";
const today = new Date().toISOString().slice(0, 10);

const systemInstruction = `Tu cherches des signaux d'actualité récents (mesure/tracking/CRO/data-IA
marketing) pour Studio Jannah, selon les critères exacts ci-dessous. Utilise
la recherche web pour trouver des articles réels et récents (quelques
semaines maximum), jamais inventés — chaque URL doit être vérifiable.

${criteria}

Format de sortie STRICT, markdown, rien d'autre avant/après :

## ${today}
- [Titre de l'article](URL) — 1 phrase pourquoi c'est pertinent pour Studio Jannah + piste d'angle courte
- (3 à 6 entrées, uniquement des articles réellement trouvés par la recherche, avec une vraie URL)

Si tu ne trouves rien de nouveau et pertinent, réponds exactement :
## ${today}
(rien de nouveau et pertinent cette fois)`;

const userPrompt = already.trim()
  ? `Voici ce qui a déjà été proposé lors des recherches précédentes (ne répète aucune de ces URLs, évite un sujet quasi identique) :\n\n${already}\n\nCherche maintenant de nouveaux articles, différents de ceux-ci.`
  : "Première recherche — aucun historique. Cherche des articles pertinents.";

const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: { temperature: 0.4 },
    }),
  },
);

if (!res.ok) {
  console.error(`Erreur Gemini (${res.status}) :`, await res.text());
  process.exit(1);
}

const data = await res.json();
const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text || "").join("");

if (!text.trim()) {
  console.error("Réponse Gemini vide ou inattendue :", JSON.stringify(data, null, 2));
  process.exit(1);
}

console.log(text.trim());
console.log("");

if (!existsSync(MEMORY_PATH)) {
  appendFileSync(
    MEMORY_PATH,
    `# Veille Gemini — suggestions (mémoire append-only)

Journal des URLs déjà proposées par \`pnpm veille:search\` — pour que
relancer la recherche élargisse plutôt que de répéter les mêmes résultats.
Jamais réécrit, seulement complété en fin de fichier. Pas un pipeline de
publication — juste une liste à trier manuellement, comme le fait
\`pnpm veille:list\` pour le flux RSS.

`,
  );
}
appendFileSync(MEMORY_PATH, `${text.trim()}\n\n`);

console.log(`→ Ajouté à docs/veille-gemini-suggestions.md`);
