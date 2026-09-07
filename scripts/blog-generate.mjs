#!/usr/bin/env node
// Studio Jannah — pnpm blog:generate
// Moteur d'auto-alimentation du Blog (Pipeline A), 100% Gemini gratuit — ne
// consomme AUCUN crédit Claude. Pensé pour tourner sans supervision via un
// cron GitHub Actions (.github/workflows/content-auto-feed.yml), cadence
// cible ~2 articles/semaine, toujours en status: draft (jamais publié tout
// seul — voir Publish/QA dans AGENTS.md, la fusion reste un geste humain).
//
// Deux appels Gemini distincts, jamais mélangés :
//
// 1. RECHERCHE (grounding Google Search, tools: [{googleSearch:{}}]) —
//    même technique que supabase/functions/admin-veille-chat/index.ts.
//    Cherche UN angle frais (actualité < ~14 jours) dans le scope Studio
//    Jannah, en évitant ce qui est déjà couvert (titres existants +
//    journal .claude/agents/research.notes.md, partagé avec la routine
//    Claude Code existante — mémoire commune, pas de doublon entre les
//    deux pipelines). Les seules URLs jamais utilisées ensuite sont celles
//    listées dans groundingMetadata.groundingChunks, résolues (HEAD +
//    follow redirect) vers l'URL réelle — JAMAIS une URL que le modèle
//    écrirait lui-même en texte libre : leçon déjà tirée sur ce projet
//    (voir commentaire dans admin-veille-chat/index.ts), un modèle peut
//    inventer/déformer un lien même avec le grounding actif.
//
// 2. RÉDACTION (JSON structuré, responseSchema, PAS de grounding — les
//    deux ne se combinent pas de façon fiable dans l'API Gemini) — reçoit
//    en contexte le compte-rendu de recherche + la liste EXACTE des URLs
//    vérifiées de l'étape 1 (le modèle choisit par index, ne peut pas en
//    inventer une autre) + l'inventaire complet des slugs Expertises
//    (pour relatedExpertises) + les titres déjà publiés (anti-doublon).
//
// Silence si rien de bon à publier cette semaine — pas de fichier écrit,
// pas de commit, pas de PR, pas de notification Telegram (même philosophie
// que docs/DRAFT_NOTIFICATIONS.md pour la routine existante).

import { writeFileSync, existsSync, readdirSync, readFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const INSIGHTS_DIR = join(ROOT, "apps/web/content/insights");
const EXPERTISES_DIR = join(ROOT, "apps/web/content/expertises");
const USECASES_DIR = join(ROOT, "apps/web/content/use-cases");
const NOTES_PATH = join(ROOT, ".claude/agents/research.notes.md");

// Plusieurs clés Gemini optionnelles — GEMINI_API_KEY (obligatoire) +
// GEMINI_API_KEY_2..5 (facultatives). Même mécanisme que
// scripts/expertise-generate.mjs (voir son commentaire équivalent) :
// chaque clé a son propre quota gratuit journalier indépendant.
function collectApiKeys() {
  const keys = [];
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  for (let i = 2; i <= 5; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`];
    if (k) keys.push(k);
  }
  return [...new Set(keys)];
}
const GEMINI_API_KEYS = collectApiKeys();
if (GEMINI_API_KEYS.length === 0) {
  console.error(
    "Manque GEMINI_API_KEY dans l'environnement — ajoute-la à ton .env local " +
      "(même valeur que le secret Supabase GEMINI_API_KEY) ou au secret GitHub Actions du même nom.",
  );
  process.exit(1);
}
if (GEMINI_API_KEYS.length > 1) {
  console.log(`  (${GEMINI_API_KEYS.length} clés Gemini détectées — bascule automatique si l'une est à quota)`);
}

const MODEL_FALLBACKS = ["gemini-2.5-flash", "gemini-3.5-flash"];
const DRY_RUN = process.argv.includes("--dry-run");

// --- Inventaire existant (anti-doublon + relatedExpertises) ---------------
function listFlatSlugs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name.replace(/\.md$/, ""));
}

function readFrontmatterField(filePath, field) {
  const raw = readFileSync(filePath, "utf-8");
  const m = raw.match(new RegExp(`^${field}:\\s*(.+)$`, "m"));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, "") : "";
}

const insightSlugs = listFlatSlugs(INSIGHTS_DIR);
const existingTitles = insightSlugs
  .map((s) => readFrontmatterField(join(INSIGHTS_DIR, `${s}.md`), "title"))
  .filter(Boolean);

function listExpertiseSlugs() {
  const out = [];
  function walk(dir, prefix) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(dir, entry.name), `${prefix}${entry.name}/`);
      else if (entry.name.endsWith(".md")) out.push(`${prefix}${entry.name.replace(/\.md$/, "")}`);
    }
  }
  walk(EXPERTISES_DIR, "");
  return out;
}
const expertiseSlugs = listExpertiseSlugs();
const expertiseTitlesBySlug = Object.fromEntries(
  expertiseSlugs.map((s) => [s, readFrontmatterField(join(EXPERTISES_DIR, `${s}.md`), "title")]),
);
const useCaseSlugs = listFlatSlugs(USECASES_DIR);

// Journal partagé avec la routine Claude Code existante — lu pour éviter
// de reproposer un angle déjà écarté/couvert, jamais réécrit ni condensé
// (append-only, voir l'en-tête du fichier lui-même).
const researchNotes = existsSync(NOTES_PATH) ? readFileSync(NOTES_PATH, "utf-8") : "";

// --- Corrige les liens internes (même logique que expertise-generate.mjs,
// dupliquée volontairement plutôt que factorisée sous contrainte de temps —
// voir commentaire équivalent dans ce fichier) --------------------------
function fixInternalLinks(body) {
  let out = body.replace(/\]\(([^)\s]+)\)/g, (match, target) => {
    if (/^https?:\/\//.test(target) || target.startsWith("#") || target.startsWith("mailto:")) {
      return match;
    }
    const bare = target.replace(/^\/+/, "").replace(/^(blog|expertises|use-cases)\//, "");
    if (insightSlugs.includes(bare)) return `](/blog/${bare})`;
    if (expertiseSlugs.includes(bare)) return `](/expertises/${bare})`;
    if (useCaseSlugs.includes(bare)) return `](/use-cases/${bare})`;
    const suffixMatches = expertiseSlugs.filter((s) => s.endsWith(`/${bare}`));
    if (suffixMatches.length === 1) return `](/expertises/${suffixMatches[0]})`;
    return match;
  });
  out = out.replace(/\[([^\]]*\/(?:expertises|blog|use-cases)\/[\w-]+(?:\/[\w-]+)*[^\]]*)\](?!\()/g, (match, inner) => {
    const pathMatch = inner.match(/\/(?:expertises|blog|use-cases)\/[\w-]+(?:\/[\w-]+)*/);
    if (!pathMatch) return match;
    return `[${inner.trim()}](${pathMatch[0]})`;
  });
  return out;
}

function checkTruncation(body) {
  const boldMarkers = (body.match(/\*\*/g) || []).length;
  const endsCleanly = /[.!?:)]["']?$/.test(body) || /\*\*$/.test(body);
  const h2Count = (body.match(/^## /gm) || []).length;
  const longEnough = body.length >= 2000;
  return boldMarkers % 2 === 0 && endsCleanly && h2Count >= 3 && longEnough;
}

async function callGemini(apiKey, model, { systemInstruction, userPrompt, tools, responseSchema, maxOutputTokens }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const generationConfig = { temperature: 0.5, maxOutputTokens };
  if (responseSchema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = responseSchema;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      ...(tools ? { tools } : {}),
      generationConfig,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`Gemini ${res.status} (${model}): ${errText}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Bascule automatique de clé PUIS de modèle sur 429/503 — même logique que
// scripts/expertise-generate.mjs (quota par clé ET par modèle, 503 =
// surcharge momentanée avec retry+backoff avant de changer de modèle/clé).
async function callGeminiWithFallback(opts) {
  let lastErr;
  for (const [keyIndex, apiKey] of GEMINI_API_KEYS.entries()) {
    for (const model of MODEL_FALLBACKS) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          return { model, data: await callGemini(apiKey, model, opts) };
        } catch (e) {
          lastErr = e;
          if (e.status === 429) {
            console.warn(
              `  ⚠ Quota épuisé sur ${model} (clé #${keyIndex + 1}), bascule sur le modèle/clé suivant...`,
            );
            break;
          }
          if (e.status === 503 && attempt < 3) {
            const delay = attempt * 15000;
            console.warn(`  ⚠ ${model} surchargé (503), nouvel essai dans ${delay / 1000}s (${attempt}/3)...`);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          if (e.status === 503) {
            console.warn(`  ⚠ ${model} toujours surchargé après 3 essais, bascule sur le modèle/clé suivant...`);
            break;
          }
          throw e;
        }
      }
    }
  }
  throw lastErr;
}

async function resolveUrl(redirectUrl) {
  try {
    const r = await fetch(redirectUrl, { method: "HEAD", redirect: "follow" });
    return r.ok ? r.url || redirectUrl : null; // null = source morte, écartée
  } catch {
    return null;
  }
}

// === Phase 1 — Recherche (grounding) =======================================

const researchSystemInstruction = `
Tu es l'agent "Research" de Studio Jannah — vitrine expert data/marketing/tracking/IA de Mohamed Atrari. Scope strict : tracking, data, marketing/ads, IA appliquée — TOUJOURS ramené à une chute mesure/tracking/CRO/data-IA (jamais un article générique "actu tech" sans ce lien).

Ta mission : trouver UN SEUL angle d'article magazine, basé sur une actualité ou un signal RÉCENT (idéalement moins de 14 jours), que Studio Jannah n'a pas encore traité.

Articles déjà publiés (titres, à ne JAMAIS reproposer ou dupliquer) :
${existingTitles.map((t) => `- ${t}`).join("\n") || "(aucun pour l'instant)"}

Journal des angles déjà traités ou écartés par le passé (ne reproposer aucun angle "Retenu" listé ici, et évite les angles "Écartés" sauf s'il y a un signal réellement nouveau depuis) :
${researchNotes || "(journal vide)"}

Utilise la recherche web pour trouver un signal réel et vérifiable — jamais inventé. Si tu ne trouves rien d'assez frais, différenciant et sourcé, dis-le clairement plutôt que de forcer un angle faible.

Réponds en français, texte libre structuré ainsi (une seule proposition, ou "AUCUN ANGLE VALABLE" si rien de solide) :

DECISION: <OUI ou NON>
TITRE: <titre de l'article, percutant, pas putaclic>
HOOK: <une phrase d'accroche — la promesse concrète, ce qu'on repart pouvoir faire>
RUBRIQUE: <une seule valeur parmi mesure, trafic, metiers, produits, agents>
POURQUOI_MAINTENANT: <pourquoi ce signal est frais et pertinent, avec dates/chiffres si possible>
ANGLE_MESURE: <comment l'article boucle sur tracking/mesure/CRO/data-IA>
RESUME_RECHERCHE: <ce que tu as trouvé, factuel, avec les points clés à développer dans l'article — 150-300 mots>

Ne mets JAMAIS d'URL toi-même dans ta réponse (les sources sont récupérées séparément depuis la recherche, pas depuis ton texte).
`.trim();

console.log("→ Phase 1 : recherche d'un angle frais (Gemini + grounding Google Search)...");
const { model: researchModel, data: researchData } = await callGeminiWithFallback({
  systemInstruction: researchSystemInstruction,
  userPrompt: "Trouve un angle, en respectant strictement le format demandé.",
  tools: [{ googleSearch: {} }],
  maxOutputTokens: 4000,
});

const researchCandidate = researchData?.candidates?.[0];
const researchText = (researchCandidate?.content?.parts ?? []).map((p) => p.text || "").join("").trim();
if (!researchText) {
  console.log("Réponse de recherche vide — rien à publier cette semaine (silence).");
  process.exit(0);
}

if (/^DECISION:\s*NON/im.test(researchText) || /AUCUN ANGLE VALABLE/i.test(researchText)) {
  // Pas d'écriture disque ici (ni fichier ni journal) : rien de réel à
  // committer, on évite tout commit "vide" côté cron — voir workflow
  // GitHub Actions appelant, qui ne commit/PR/notifie que si un fichier
  // insights a effectivement été écrit.
  console.log("Aucun angle frais/différenciant trouvé — rien à publier cette semaine (silence).");
  process.exit(0);
}

function extractField(text, field) {
  const m = text.match(new RegExp(`^${field}:\\s*(.+?)(?=\\n[A-Z_]+:|$)`, "ims"));
  return m ? m[1].trim() : "";
}

const angle = {
  title: extractField(researchText, "TITRE"),
  hook: extractField(researchText, "HOOK"),
  rubrique: extractField(researchText, "RUBRIQUE").toLowerCase(),
  pourquoi: extractField(researchText, "POURQUOI_MAINTENANT"),
  angleMesure: extractField(researchText, "ANGLE_MESURE"),
  resume: extractField(researchText, "RESUME_RECHERCHE"),
};

const VALID_RUBRIQUES = ["mesure", "trafic", "metiers", "produits", "agents"];
if (!angle.title || !VALID_RUBRIQUES.includes(angle.rubrique)) {
  console.error("Réponse de recherche mal formée (titre ou rubrique manquant/invalide) — abandon cette semaine.");
  console.error(researchText);
  process.exit(1);
}

// Sources vérifiées uniquement — jamais depuis le texte libre du modèle
// (voir en-tête de fichier). Chaque URL est HEAD-résolue ; les sources
// mortes sont écartées silencieusement plutôt que publiées cassées.
const chunks = researchCandidate?.groundingMetadata?.groundingChunks ?? [];
const seen = new Set();
const verifiedSources = [];
for (const c of chunks) {
  const uri = c?.web?.uri;
  if (!uri || seen.has(uri)) continue;
  seen.add(uri);
  const resolved = await resolveUrl(uri);
  if (!resolved) continue;
  verifiedSources.push({ label: c.web?.title || resolved, url: resolved });
}

console.log(`  Angle trouvé : "${angle.title}" (${verifiedSources.length} source(s) vérifiée(s))`);

if (verifiedSources.length === 0) {
  console.log("Aucune source vérifiable n'a survécu à la résolution HEAD — abandon plutôt que publier sans preuve.");
  process.exit(0);
}

if (DRY_RUN) {
  console.log("\n--dry-run : arrêt avant la phase de rédaction.\n");
  console.log(JSON.stringify({ angle, verifiedSources }, null, 2));
  process.exit(0);
}

// === Phase 2 — Rédaction (JSON structuré, sans grounding) =================

const CONTRACT_FACTS = `
Faits du contrat dataLayer v1.3.0 de Studio Jannah (ne JAMAIS affirmer le
contraire si l'article mentionne explicitement le contrat interne SJ ;
sinon rester générique sur les pratiques dataLayer standards) :
- Hit de base : event_id (unique), event_ts (epoch ms), schema_version
- "page_view" reste le nom standard GA4, jamais renommé sj_page_view
- Events métier custom namespacés sj_*
- Consentement : consent_status_<categorie> par catégorie CMP (pas un flag
  analytics unique), consent_trigger ∈ {first_choice, revisit, panel_update}
- Champs RETIRÉS en v1.3.0, ne jamais les réintroduire : brand, surface,
  content_group, consent_analytics
- CTA : convention zone_objet_action via data-track-cta
`.trim();

const sourcesListBlock = verifiedSources.map((s, i) => `[${i}] ${s.label} — ${s.url}`).join("\n");
const expertiseInventoryBlock = expertiseSlugs
  .map((s) => `${s} — ${expertiseTitlesBySlug[s]}`)
  .join("\n");

const draftSystemInstruction = `
Tu es l'agent "GEO/SEO" de Studio Jannah (vitrine expert data/marketing/tracking/IA de Mohamed Atrari), à l'étape rédaction du pipeline Blog magazine — voir AGENTS.md Pipeline A. Ton court, factuel, jamais putaclic, toujours ramené à une chute mesure/tracking/CRO/data-IA.

Angle validé par Research :
- Titre imposé (peux l'affiner légèrement, garde l'esprit) : "${angle.title}"
- Hook : "${angle.hook}"
- Rubrique : ${angle.rubrique}
- Pourquoi maintenant : ${angle.pourquoi}
- Angle mesure/tracking à développer : ${angle.angleMesure}
- Résumé de la recherche à exploiter :
${angle.resume}

RÈGLE ABSOLUE sur les sources : voici la liste EXACTE et COMPLÈTE des sources vérifiées disponibles pour cet article — tu ne peux utiliser AUCUNE autre URL, tu ne peux RIEN inventer. Choisis parmi cette liste (3 à 5 suffisent, pas la peine de toutes les utiliser si certaines sont hors-sujet) :
${sourcesListBlock}

Dans le champ JSON "sourceIndices", donne les index (nombres, ex. [0, 2]) des sources de cette liste effectivement citées dans le corps — CHAQUE index cité doit correspondre à un vrai lien Markdown [texte](url) dans le corps, avec l'URL EXACTEMENT identique à celle listée ci-dessus.

Contraintes strictes sur le corps :
- Réponse courte en ouverture (40 à 80 mots), qui donne directement la réponse/le point clé — pas d'intro qui tourne autour.
- Structure H2 (##) = questions ou entités concrètes, au moins 3 sections H2.
- Chaque section H2 doit ouvrir sur un bloc de 2 à 4 phrases qui répond directement, seul et sans contexte externe, à la question que pose le titre de la section — un moteur IA doit pouvoir extraire ce seul bloc et l'utiliser tel quel comme réponse. Le développement/les détails/les exemples viennent APRÈS ce bloc, jamais avant.
- Preuves et chiffres datés, sourcés (via les liens ci-dessus).
- Termine sur l'angle mesure/tracking/CRO/data-IA (voir "Angle mesure" ci-dessus) — jamais un article generic sans cette chute.
- Terminologie technique (GTM, GA4, SGTM, dataLayer, server-side, Cloud Run, Consent Mode, BigQuery, noms de paramètres...) reste en anglais tel quel, jamais traduite, jamais de casse altérée.
- Jamais de client réel nommé. Marque fictive OK si explicitement marquée comme exemple/placeholder.
- Markdown pur, PAS de titre H1 (géré ailleurs), listes à puces avec **gras** pour les points clés.
- RÈGLE ABSOLUE sur les liens internes : toute mention d'un autre article DOIT être un vrai lien Markdown complet [texte](/blog/<slug>) ou [texte](/expertises/<slug>) — jamais une mention entre crochets sans parenthèses, jamais le slug seul.
- description ≤ 155 caractères (meta description).
- title ≤ 60 caractères si possible (sinon reste concis, jamais un pavé).

${CONTRACT_FACTS}

relatedExpertises : jusqu'à 3 slugs, UNIQUEMENT parmi cet inventaire réel (n'invente aucun autre slug), seulement s'ils sont vraiment pertinents pour CET angle précis (pas de lien forcé) :
${expertiseInventoryBlock}

Réponds uniquement avec le JSON demandé par le schéma, rien d'autre autour.
`.trim();

console.log("→ Phase 2 : rédaction structurée...");
const { model: draftModel, data: draftData } = await callGeminiWithFallback({
  systemInstruction: draftSystemInstruction,
  userPrompt: "Rédige l'article complet, en respectant strictement les contraintes du system prompt.",
  responseSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      hook: { type: "string" },
      rubrique: { type: "string", enum: VALID_RUBRIQUES },
      tags: { type: "array", items: { type: "string" } },
      sourceIndices: { type: "array", items: { type: "integer" } },
      relatedExpertises: { type: "array", items: { type: "string" } },
      body: { type: "string" },
    },
    required: ["title", "description", "hook", "rubrique", "tags", "sourceIndices", "body"],
  },
  maxOutputTokens: 30000,
});

const draftCandidate = draftData?.candidates?.[0];
const draftText = (draftCandidate?.content?.parts ?? []).map((p) => p.text || "").join("");
if (draftCandidate?.finishReason && draftCandidate.finishReason !== "STOP") {
  console.error(`Réponse de rédaction tronquée (finishReason: ${draftCandidate.finishReason}) — relance le script.`);
  process.exit(1);
}
let result;
try {
  result = JSON.parse(draftText);
} catch (e) {
  console.error(`JSON de rédaction invalide : ${e.message}`);
  process.exit(1);
}

const body = (result.body || "").trim();
if (!checkTruncation(body)) {
  console.error(`Article probablement tronqué : "...${body.slice(-80)}". Relance le script.`);
  process.exit(1);
}

const usedSources = [...new Set(result.sourceIndices || [])]
  .filter((i) => i >= 0 && i < verifiedSources.length)
  .map((i) => verifiedSources[i]);

if (usedSources.length === 0) {
  console.error("Aucune source valide citée par le modèle — abandon plutôt que publier sans preuve.");
  process.exit(1);
}

const related = (result.relatedExpertises || []).filter((s) => expertiseSlugs.includes(s));

// Slug FR simple depuis le titre — cohérent avec les slugs existants du repo.
function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
let slug = slugify(result.title || angle.title);
if (insightSlugs.includes(slug)) slug = `${slug}-${new Date().toISOString().slice(0, 10)}`;

function toYamlList(items) {
  if (!items || items.length === 0) return "[]";
  return `\n${items.map((i) => `  - "${String(i).replace(/"/g, '\\"')}"`).join("\n")}`;
}

const sourcesYaml =
  usedSources.length === 0
    ? "[]"
    : `\n${usedSources.map((s) => `  - label: "${s.label.replace(/"/g, '\\"')}"\n    url: "${s.url}"`).join("\n")}`;

const content = `---
title: "${(result.title || angle.title).replace(/"/g, '\\"')}"
description: "${(result.description || "").replace(/"/g, '\\"')}"
publishedAt: ${new Date().toISOString().slice(0, 10)}
status: draft
tags: [${(result.tags || []).map((t) => `"${t.replace(/"/g, '\\"')}"`).join(", ")}]
hook: "${(result.hook || angle.hook).replace(/"/g, '\\"')}"
rubrique: ${VALID_RUBRIQUES.includes(result.rubrique) ? result.rubrique : angle.rubrique}
format: text
featured: false
sources:${sourcesYaml}
relatedExpertises: ${toYamlList(related)}
---

${fixInternalLinks(body)}
`;

const filePath = join(INSIGHTS_DIR, `${slug}.md`);
writeFileSync(filePath, content, "utf-8");
console.log(`✓ Généré : ${filePath}`);
console.log(`  sources (${usedSources.length}) : ${usedSources.map((s) => s.url).join(", ")}`);
console.log(`  relatedExpertises retenus : ${related.join(", ") || "aucun"}`);
console.log("status: draft — vérification manuelle des sources + QA avant publication.");

appendFileSync(
  NOTES_PATH,
  `\n## ${new Date().toISOString().slice(0, 10)} — ${slug} (auto, ${researchModel}/${draftModel})\n- Retenu : ${slug} — "${result.title || angle.title}", ${angle.pourquoi}\n`,
);

// Sortie machine-lisible pour le workflow GitHub Actions appelant (titre +
// chemin du fichier, pour construire le message Telegram et la PR).
console.log(`::set-output-title::${result.title || angle.title}`);
console.log(`::set-output-slug::${slug}`);
