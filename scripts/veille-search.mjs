#!/usr/bin/env node
// Studio Jannah — pnpm veille:search
// Cherche des signaux récents (mesure/tracking/CRO/data-IA) via l'API Gemini
// (grounding Google Search), mêmes critères de scope que
// .claude/agents/veille-filter.md — pour rester cohérent avec ce que
// l'admin juge déjà pertinent.
//
// Local uniquement : la clé GEMINI_API_KEY ne quitte jamais cette machine,
// même trust boundary que SUPABASE_SERVICE_ROLE_KEY dans pnpm veille:list.
//
// Important : les URLs ne viennent JAMAIS du texte libre généré par le
// modèle (qui peut inventer/déformer un lien même avec le grounding actif —
// vérifié en pratique, deux liens cassés/inventés sur un premier essai).
// Elles viennent uniquement de `groundingMetadata.groundingChunks`, la
// liste de sources réellement trouvées par la recherche — chaque URL est
// donc garantie réelle, jamais une invention du modèle.
//
// Relancer ce script élargit plutôt que de répéter : docs/veille-gemini-
// suggestions.md (créé au premier run) est une mémoire append-only — même
// pattern que .claude/agents/research.notes.md — relue à chaque appel et
// jamais réécrite, pour éviter de reproposer les mêmes sources.

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
marketing) pour Studio Jannah, selon les critères exacts ci-dessous.

${criteria}

Utilise la recherche web pour trouver des informations réelles et récentes
(quelques semaines maximum). Ne mets JAMAIS d'URL toi-même dans ta réponse
(les sources sont récupérées séparément, automatiquement, depuis la
recherche) — décris seulement ce que tu trouves : un point distinct par
sujet pertinent (3 à 6 points), en français, chacun avec de quoi ça parle,
pourquoi c'est pertinent pour Studio Jannah, une piste d'angle courte. Si
rien de pertinent, dis-le en une phrase.`;

const userPrompt = already.trim()
  ? `Sujets déjà proposés lors des recherches précédentes (ne répète pas ces mêmes sujets/sources, cherche autre chose) :\n\n${already}\n\nCherche maintenant des signaux différents de ceux-ci.`
  : "Première recherche — aucun historique. Cherche des signaux pertinents.";

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
const candidate = data.candidates?.[0];
const text = (candidate?.content?.parts ?? []).map((p) => p.text || "").join("");

if (!text.trim()) {
  console.error("Réponse Gemini vide ou inattendue :", JSON.stringify(data, null, 2));
  process.exit(1);
}

// Sources vérifiées uniquement — jamais depuis le texte libre du modèle.
const chunks = candidate?.groundingMetadata?.groundingChunks ?? [];
const supports = candidate?.groundingMetadata?.groundingSupports ?? [];

const excerptsByChunk = new Map();
for (const s of supports) {
  for (const idx of s.groundingChunkIndices ?? []) {
    const arr = excerptsByChunk.get(idx) ?? [];
    if (s.segment?.text) arr.push(s.segment.text);
    excerptsByChunk.set(idx, arr);
  }
}

// Résout chaque lien de redirection Google vers l'URL finale réelle — plus
// lisible qu'un lien vertexaisearch.cloud.google.com opaque. Si la
// résolution échoue (site down, timeout...), on garde quand même le lien
// de redirection : il fonctionne toujours au clic, juste moins lisible.
async function resolveUrl(redirectUrl) {
  try {
    const r = await fetch(redirectUrl, { method: "HEAD", redirect: "follow" });
    return r.url || redirectUrl;
  } catch {
    return redirectUrl;
  }
}

// Plafonné à 10 : le grounding peut citer une dizaine de sources pour
// étayer 3-6 points de discussion (plusieurs sources par affirmation) —
// au-delà, la liste devient plus dure à parcourir que ce qu'elle apporte.
const MAX_SOURCES = 10;
const seen = new Set();
const sources = [];
for (let i = 0; i < chunks.length && sources.length < MAX_SOURCES; i++) {
  const uri = chunks[i]?.web?.uri;
  if (!uri || seen.has(uri)) continue;
  seen.add(uri);
  const resolved = await resolveUrl(uri);
  const excerpt = (excerptsByChunk.get(i) ?? [])[0] ?? "";
  sources.push({ domain: chunks[i].web?.title || "source", url: resolved, excerpt });
}

let output = `## ${today}\n\n${text.trim()}\n`;
if (sources.length > 0) {
  output += `\n### Sources vérifiées\n`;
  for (const s of sources) {
    output += `- [${s.domain}](${s.url})${s.excerpt ? ` — ${s.excerpt}` : ""}\n`;
  }
} else {
  output += `\n(aucune source vérifiée retournée par la recherche cette fois)\n`;
}

console.log(output.trim());
console.log("");

if (!existsSync(MEMORY_PATH)) {
  appendFileSync(
    MEMORY_PATH,
    `# Veille Gemini — suggestions (mémoire append-only)

Journal des sujets/sources déjà proposés par \`pnpm veille:search\` — pour
que relancer la recherche élargisse plutôt que de répéter les mêmes
résultats. Jamais réécrit, seulement complété en fin de fichier. Pas un
pipeline de publication — juste une liste à trier manuellement, comme le
fait \`pnpm veille:list\` pour le flux RSS. Les URLs listées ici viennent
uniquement du grounding vérifié (jamais du texte libre du modèle).

`,
  );
}
appendFileSync(MEMORY_PATH, `${output.trim()}\n\n`);

console.log(`→ Ajouté à docs/veille-gemini-suggestions.md`);
