#!/usr/bin/env node
// Studio Jannah — pnpm expertise:generate
// Génère un ou plusieurs articles de la bibliothèque Expertises (Pipeline C,
// voir docs/CONTENT_EXPERTISE_TAXONOMY.md) via l'API Gemini, même clé que les
// Edge Functions admin (admin-generate-content, admin-veille-filter) et que
// scripts/veille-search.mjs — voir .env.example.
//
// Pourquoi ce script : le pipeline Pipeline C via agents Claude (Expertise
// Author → GEO/SEO → Measurement → Publish → QA) coûte ~60k tokens Claude
// par article publié. Gemini fait ici la rédaction (Author + GEO/SEO en un
// seul appel structuré) sans toucher au budget Claude ; la vérification
// (sources réelles, cohérence avec docs/TRACKING_DATALAYER.md, liens
// internes valides, QA de jugement) reste faite à la main / par Claude en
// direct après coup, PAS déléguée à Gemini — même leçon que
// scripts/veille-search.mjs : ne jamais faire confiance à une URL générée
// par le modèle sans vérification.
//
// Toujours status: draft en sortie — jamais publié directement par ce
// script. Chaque article reste vérifiable individuellement (sources, liens,
// contrat) avant publication manuelle.
//
// OPTIMISATION QUOTA (2026-09-07) : le palier gratuit Gemini limite à 20
// REQUÊTES/jour par modèle (generate_content_free_tier_requests, quotaId
// GenerateRequestsPerDayPerProjectPerModel-FreeTier) — pas un quota de
// tokens. Deux leviers activés ici :
// 1. Mode batch (--batch) : plusieurs articles d'une même catégorie générés
//    en UN seul appel (schéma JSON = tableau d'articles), au lieu d'un
//    appel par article. Une catégorie de 3-4 nœuds ne coûte plus qu'1
//    requête sur le quota du jour au lieu de 3-4.
// 2. Fallback multi-modèle : le quota est explicitement PAR MODÈLE
//    (confirmé par le nom du quotaId). Si le modèle principal renvoie 429,
//    on retente automatiquement avec le modèle suivant de MODEL_FALLBACKS,
//    qui a son propre quota séparé.
//
// Usage (mode simple, un article) :
//   node --env-file-if-exists=.env scripts/expertise-generate.mjs \
//     --domain tracking --category qa --category-label "QA & fiabilité" \
//     --slug methodologie-qa-tracking \
//     --title "Méthodologie de QA tracking : de la préprod à la prod" \
//     --type methodologie --level avance
//
// Usage (mode batch, une catégorie entière en un appel) :
//   node --env-file-if-exists=.env scripts/expertise-generate.mjs \
//     --batch scripts/batches/data-reporting.json
//
// Format du fichier batch :
//   {
//     "domain": "data",
//     "category": "reporting",
//     "categoryLabel": "Reporting & dashboards",
//     "nodes": [
//       { "slug": "kpis-vs-vanity-metrics", "title": "...", "type": "guide", "level": "fondamentaux" },
//       ...
//     ]
//   }

import { writeFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONTENT_DIR = join(ROOT, "apps/web/content/expertises");
const INSIGHTS_DIR = join(ROOT, "apps/web/content/insights");
const USECASES_DIR = join(ROOT, "apps/web/content/use-cases");

// Plusieurs clés Gemini optionnelles — GEMINI_API_KEY (obligatoire) +
// GEMINI_API_KEY_2..5 (facultatives, un second/troisième projet Google AI
// Studio ajouté à .env sans toucher à la première clé). Chaque clé a son
// propre quota gratuit journalier, totalement indépendant de la première —
// multiplie le débit dispo avant de tomber en erreur. Voir .env.example.
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
      "(même valeur que le secret Supabase GEMINI_API_KEY). Voir .env.example.",
  );
  process.exit(1);
}
if (GEMINI_API_KEYS.length > 1) {
  console.log(`  (${GEMINI_API_KEYS.length} clés Gemini détectées — bascule automatique si l'une est à quota)`);
}

// Ordre de bascule sur 429 — chacun a son propre quota gratuit journalier
// (vérifié empiriquement le 2026-09-07 : gemini-2.5-flash épuisé mais
// gemini-3.5-flash répond normalement avec la même clé). gemini-2.5-flash
// reste en tête : comportement le mieux connu/vérifié sur ce projet.
const MODEL_FALLBACKS = ["gemini-2.5-flash", "gemini-3.5-flash"];

function arg(name, required = true) {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  if (required && !v) {
    console.error(`Argument manquant : --${name}`);
    process.exit(1);
  }
  return v;
}

const VALID_TYPES = ["guide", "audit", "checklist", "glossaire", "comparatif", "methodologie"];
const VALID_LEVELS = ["fondamentaux", "avance", "expert"];

// --- Résolution des nœuds à générer (mode batch ou mode simple) -----------
const batchPath = arg("batch", false);
let domain, category, categoryLabel, nodes;

if (batchPath) {
  const raw = JSON.parse(readFileSync(batchPath, "utf-8"));
  domain = raw.domain;
  category = raw.category;
  categoryLabel = raw.categoryLabel;
  nodes = raw.nodes;
  if (!domain || !category || !categoryLabel || !Array.isArray(nodes) || nodes.length === 0) {
    console.error(`Fichier batch invalide (attend domain/category/categoryLabel/nodes[]) : ${batchPath}`);
    process.exit(1);
  }
} else {
  domain = arg("domain");
  category = arg("category");
  categoryLabel = arg("category-label");
  nodes = [
    {
      slug: arg("slug"),
      title: arg("title"),
      type: arg("type"),
      level: arg("level"),
    },
  ];
}

for (const n of nodes) {
  if (!VALID_TYPES.includes(n.type)) {
    console.error(`type invalide pour "${n.slug}" : ${n.type} (attendu : ${VALID_TYPES.join(", ")})`);
    process.exit(1);
  }
  if (!VALID_LEVELS.includes(n.level)) {
    console.error(`level invalide pour "${n.slug}" : ${n.level} (attendu : ${VALID_LEVELS.join(", ")})`);
    process.exit(1);
  }
}

// --- Inventaire réel des articles déjà présents (pour relatedExpertises) --
function listExistingSlugs() {
  const out = [];
  function walk(dir, prefix) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(dir, entry.name), `${prefix}${entry.name}/`);
      else if (entry.name.endsWith(".md")) out.push(`${prefix}${entry.name.replace(/\.md$/, "")}`);
    }
  }
  walk(CONTENT_DIR, "");
  return out;
}
const existingSlugs = listExistingSlugs();
const thisBatchSlugs = new Set(nodes.map((n) => `${domain}/${category}/${n.slug}`));

function listFlatSlugs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name.replace(/\.md$/, ""));
}
const insightSlugs = listFlatSlugs(INSIGHTS_DIR);
const useCaseSlugs = listFlatSlugs(USECASES_DIR);

// Corrige les liens internes générés en slug nu (ex. "tracking/x/y" ou
// "insight-slug") vers le chemin absolu réel du site — le modèle ne connaît
// pas le routing Astro, la consigne seule ne suffit pas toujours (vérifié).
function fixInternalLinks(body, thisSlug) {
  let out = body.replace(/\]\(([^)\s]+)\)/g, (match, target) => {
    if (/^https?:\/\//.test(target) || target.startsWith("#") || target.startsWith("mailto:")) {
      return match;
    }
    const bare = target.replace(/^\/+/, "").replace(/^expertises\//, "");
    if (existingSlugs.includes(bare) || thisBatchSlugs.has(bare) || bare === thisSlug) {
      return `](/expertises/${bare})`;
    }
    if (insightSlugs.includes(bare)) return `](/blog/${bare})`;
    if (useCaseSlugs.includes(bare)) return `](/use-cases/${bare})`;
    // Vu en pratique : le modèle omet parfois le segment domaine
    // ("/expertises/ga4/audit-ga4" au lieu de "/expertises/tracking/ga4/
    // audit-ga4") — y compris en cross-domaine (un nœud "data" qui référence
    // un slug "tracking/..." sans le préfixe). On cherche d'abord dans le
    // domaine courant, puis par correspondance de suffixe sur tous les
    // domaines (uniquement si le match est non-ambigu).
    const withDomain = `${domain}/${bare}`;
    if (existingSlugs.includes(withDomain) || thisBatchSlugs.has(withDomain)) {
      return `](/expertises/${withDomain})`;
    }
    const allKnown = [...existingSlugs, ...thisBatchSlugs];
    const suffixMatches = allKnown.filter((s) => s.endsWith(`/${bare}`));
    if (suffixMatches.length === 1) return `](/expertises/${suffixMatches[0]})`;
    return match; // lien externe/inconnu, ou ambigu : laissé tel quel, vérifié à la main ensuite
  });
  // Filet de sécurité : mentions "[texte /expertises/x/y]" sans parenthèses
  // (pas un lien Markdown valide, vu en pratique malgré la consigne) — les
  // transforme en vrai lien plutôt que de laisser du texte cassé publié.
  out = out.replace(/\[([^\]]*\/(?:expertises|blog|use-cases)\/[\w-]+(?:\/[\w-]+)*[^\]]*)\](?!\()/g, (match, inner) => {
    const pathMatch = inner.match(/\/(?:expertises|blog|use-cases)\/[\w-]+(?:\/[\w-]+)*/);
    if (!pathMatch) return match;
    return `[${inner.trim()}](${pathMatch[0]})`;
  });
  return out;
}

// Alerte (pas de blocage) : toute URL externe citée dans le corps qui ne
// figure pas dans les sources déclarées — signe que le modèle a inventé un
// lien "answer/xxxxx" à la volée au lieu de rester sur les sources fournies.
// Cas inverse aussi signalé : source déclarée jamais citée en lien Markdown.
function warnUrlIssues(slug, body, sources) {
  const declared = new Set((sources || []).map((s) => s.url));
  const used = new Set();
  for (const m of body.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) used.add(m[1]);
  const undeclared = [...used].filter((u) => !declared.has(u));
  if (undeclared.length > 0) {
    console.warn(`  [${slug}] ⚠ URLs citées mais absentes des sources déclarées :`);
    for (const u of undeclared) console.warn(`    - ${u}`);
  }
  const uncited = [...declared].filter((u) => !used.has(u));
  if (uncited.length > 0) {
    console.warn(`  [${slug}] ⚠ Sources déclarées jamais citées en lien [texte](url) :`);
    for (const u of uncited) console.warn(`    - ${u}`);
  }
}

// --- Contrat dataLayer (condensé, pour éviter toute contradiction) --------
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

const STRUCTURE_BY_TYPE = {
  guide: "Contexte du problème → mécanique concrète (comment ça marche) → pièges connus → ce que Studio Jannah recommande.",
  audit:
    "Liste de contrôle vérifiable en sections H2, un critère = une ligne au format Markdown `- [ ] **Le critère au présent** : détail.` (case à cocher réelle, pas une puce classique), pas de généralité vague.",
  checklist:
    "Identique à audit : liste de contrôle vérifiable, format `- [ ] **critère** : détail` pour chaque ligne, pas de puce `*`/`-` simple sans case.",
  methodologie:
    "Étapes numérotées en H2, dans l'ordre d'exécution réel, chaque étape porte son \"Attendu\" (le livrable concret de l'étape).",
  comparatif:
    "Tableau ou sections qui comparent des options selon des critères explicites, puis TRANCHE clairement plutôt que de rester neutre.",
  glossaire: "Entrées courtes en H2 ou H3, une définition = 2 à 4 phrases maximum, pas d'essai.",
};

const nodesBlock = nodes
  .map(
    (n, i) => `### Article ${i + 1} — slug "${n.slug}"
Titre imposé (ne pas le changer) : "${n.title}"
Type : ${n.type}
Niveau : ${n.level}
Structure imposée pour ce type : ${STRUCTURE_BY_TYPE[n.type]}`,
  )
  .join("\n\n");

const systemInstruction = `
Tu es l'agent "Expertise Author" de Studio Jannah — vitrine expert data/marketing/tracking/IA de Mohamed Atrari (signature éditoriale).

Tu rédiges ${nodes.length > 1 ? `${nodes.length} articles` : "un article"} de référence pour la bibliothèque Expertises (silo pilier/cluster, distincte du blog magazine) : des guides de fond finis, pas des angles courts. Contrairement à un article magazine, le ton est expert et factuel, pas putaclic.

Domaine : ${domain}
Catégorie : ${categoryLabel} (${category})

${nodesBlock}

Contraintes strictes, pour CHAQUE article :
- Réponse courte en ouverture du corps (40 à 80 mots), puis structure H2 (##) cohérente avec son type.
- Sources obligatoires : documentation officielle reconnue (Google, MDN, W3C, CNIL...) ou référence reconnue de l'écosystème (ex. Simo Ahava pour GTM/GA4). Si tu n'es pas sûr qu'une URL existe réellement, NE L'INVENTE PAS — omets-la plutôt qu'une URL fausse. 3 à 5 sources suffisent par article, pas plus.
- RÈGLE ABSOLUE sur les liens externes : le corps ne doit utiliser AUCUNE URL externe qui ne soit pas déjà listée dans le tableau JSON "sources" de CE MÊME article. Chaque entrée de "sources" doit être citée en lien Markdown [label](url) au moins une fois dans le corps, en reprenant l'URL EXACTEMENT identique à celle du tableau — jamais une autre URL "answer/xxxxx" inventée à la volée. Un point qui n'a pas de source vérifiée reste en texte simple, sans lien.
- RÈGLE ABSOLUE sur les liens internes : toute mention d'un autre article Expertises, insight ou use case DOIT être un vrai lien Markdown complet [texte descriptif](/expertises/<slug>) — JAMAIS une mention entre crochets sans parenthèses. Le texte du lien est une phrase normale, l'URL n'apparaît que dans la partie (...). Chemin absolu complet, jamais le slug seul.
- Terminologie technique (GTM, GA4, SGTM, dataLayer, server-side, Cloud Run, Consent Mode, BigQuery, noms de paramètres...) reste en anglais tel quel, jamais traduite, jamais de casse altérée.
- Jamais de client réel nommé. Marque fictive OK si explicitement marquée comme exemple/placeholder.
- Le corps est du Markdown pur, commence directement par le premier paragraphe de réponse courte (PAS de titre H1, il est géré ailleurs), utilise des listes à puces avec **gras** pour les points clés.
- Termine par une section "## Ce que Studio Jannah recommande".
- description ≤ 155 caractères (meta description).
- hook : une phrase d'accroche qui dit la promesse concrète de l'article (ce qu'on repart pouvoir faire), pas un putaclic.
- Les articles de ce lot peuvent se référencer entre eux (relatedExpertises) via leur slug complet "${domain}/${category}/<slug>".

${CONTRACT_FACTS}

relatedExpertises : jusqu'à 4 slugs par article, UNIQUEMENT parmi cette liste réelle (n'invente aucun autre slug) + les autres slugs de ce lot :
${existingSlugs.join(", ") || "(aucun autre article existant pour l'instant)"}

Réponds uniquement avec le JSON demandé par le schéma (un objet par article de la liste ci-dessus, dans le même ordre, avec le champ "slug" repris exactement), rien d'autre autour.
`.trim();

const userPrompt = `Rédige les ${nodes.length} article(s) ci-dessus, chacun complet, en respectant strictement les contraintes du system prompt.`;

const responseSchema = {
  type: "object",
  properties: {
    articles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          slug: { type: "string" },
          description: { type: "string" },
          hook: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          sources: {
            type: "array",
            items: {
              type: "object",
              properties: { label: { type: "string" }, url: { type: "string" } },
              required: ["label", "url"],
            },
          },
          relatedExpertises: { type: "array", items: { type: "string" } },
          relatedInsights: { type: "array", items: { type: "string" } },
          relatedUseCases: { type: "array", items: { type: "string" } },
          body: { type: "string" },
        },
        required: ["slug", "description", "hook", "tags", "sources", "body"],
      },
    },
  },
  required: ["articles"],
};

function checkTruncation(body) {
  const boldMarkers = (body.match(/\*\*/g) || []).length;
  const endsCleanly = /[.!?:)]["']?$/.test(body) || /\*\*$/.test(body);
  // Vu en pratique : un article peut se terminer "proprement" (bold apparié,
  // ponctuation finale correcte) après le seul paragraphe d'ouverture — le
  // modèle a simplement conclu trop tôt, sans aucune section H2. Ni
  // finishReason ni la propreté de fin ne détectent ce cas ; on exige donc
  // aussi une longueur minimale et au moins 2 titres H2 (## ).
  const h2Count = (body.match(/^## /gm) || []).length;
  const longEnough = body.length >= 1500;
  return boldMarkers % 2 === 0 && endsCleanly && h2Count >= 2 && longEnough;
}

async function callGeminiModel(apiKey, model, maxOutputTokens) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.4,
        maxOutputTokens,
      },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`Gemini ${res.status} (${model}): ${errText}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!text) throw new Error(`Réponse Gemini vide/inattendue (${model}) : ${JSON.stringify(data)}`);
  if (candidate?.finishReason && candidate.finishReason !== "STOP") {
    throw new Error(
      `Réponse Gemini tronquée (${model}, finishReason: ${candidate.finishReason}) — relance, réduis le nombre d'articles du batch, ou augmente maxOutputTokens.`,
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`JSON Gemini invalide/tronqué (${model}) : ${e.message}`);
  }
  const articles = parsed.articles || [];
  for (const a of articles) {
    // Filet de sécurité en plus de finishReason : vu en pratique un corps
    // coupé en pleine phrase avec quand même finishReason "STOP".
    if (!checkTruncation((a.body || "").trim())) {
      throw new Error(
        `Article "${a.slug}" probablement tronqué (${model}) : "...${(a.body || "").trim().slice(-80)}". Relance.`,
      );
    }
  }
  console.log(`  (généré via ${model}, usage: ${JSON.stringify(data.usageMetadata)})`);
  return articles;
}

// Bascule automatique de clé PUIS de modèle sur 429 (quota épuisé) —
// chaque (clé, modèle) a son propre quota gratuit journalier séparé.
// Ordre : toutes les combinaisons de la 1ère clé (tous modèles), puis
// toutes celles de la 2e clé, etc. — épuise une clé avant de passer à la
// suivante plutôt que de zigzaguer.
async function callGeminiWithFallback(maxOutputTokens) {
  let lastErr;
  for (const [keyIndex, apiKey] of GEMINI_API_KEYS.entries()) {
    for (const model of MODEL_FALLBACKS) {
      // 503 = surcharge momentanée du modèle côté Google (pas un problème de quota) ;
      // on retente ce même modèle quelques fois avec backoff avant de basculer.
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          return await callGeminiModel(apiKey, model, maxOutputTokens);
        } catch (e) {
          lastErr = e;
          if (e.status === 429) {
            console.warn(
              `  ⚠ Quota épuisé sur ${model} (clé #${keyIndex + 1}), bascule sur le modèle/clé suivant...`,
            );
            break; // pas la peine de réessayer ce modèle, on change de modèle (ou de clé)
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
          throw e; // erreur non liée au quota/à la charge : pas la peine d'essayer une autre clé/modèle
        }
      }
    }
  }
  throw lastErr;
}

function toYamlList(items) {
  if (!items || items.length === 0) return "[]";
  return `\n${items.map((i) => `  - ${typeof i === "string" ? `"${i.replace(/"/g, '\\"')}"` : i}`).join("\n")}`;
}

function writeArticle(node, result) {
  const thisSlug = `${domain}/${category}/${node.slug}`;
  const related = (result.relatedExpertises || []).filter(
    (s) => existingSlugs.includes(s) || thisBatchSlugs.has(s),
  );
  const sourcesYaml =
    (result.sources || []).length === 0
      ? "[]"
      : `\n${result.sources.map((s) => `  - label: "${s.label.replace(/"/g, '\\"')}"\n    url: "${s.url}"`).join("\n")}`;

  const content = `---
title: "${node.title.replace(/"/g, '\\"')}"
description: "${result.description.replace(/"/g, '\\"')}"
publishedAt: ${new Date().toISOString().slice(0, 10)}
status: draft
categoryLabel: "${categoryLabel.replace(/"/g, '\\"')}"
type: "${node.type}"
level: "${node.level}"
tags: [${(result.tags || []).map((t) => `"${t.replace(/"/g, '\\"')}"`).join(", ")}]
hook: "${result.hook.replace(/"/g, '\\"')}"
sources:${sourcesYaml}
relatedInsights: ${toYamlList(result.relatedInsights)}
relatedUseCases: ${toYamlList(result.relatedUseCases)}
relatedExpertises: ${toYamlList(related)}
---

${fixInternalLinks(result.body.trim(), thisSlug)}
`;

  const dir = join(CONTENT_DIR, domain, category);
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, `${node.slug}.md`);
  writeFileSync(filePath, content, "utf-8");
  return filePath;
}

// Budget de sortie généré à la volée selon la taille du lot — headroom très
// généreux car TOUS les modèles Gemini testés ("thinking": true, y compris
// gemini-2.5-flash) consomment une part significative et imprévisible du
// budget en tokens de raisonnement internes avant de produire le texte
// final (vérifié empiriquement : un batch de 2 articles a été tronqué avec
// 24k de budget). outputTokenLimit du modèle = 65536, on vise ce plafond
// dès que le lot dépasse 2 articles plutôt que de sous-estimer.
const maxOutputTokens = Math.min(20000 * nodes.length + 10000, 65536);

const articles = await callGeminiWithFallback(maxOutputTokens);
if (articles.length !== nodes.length) {
  console.warn(
    `⚠ ${articles.length} article(s) reçus pour ${nodes.length} nœud(s) demandés — vérifie le résultat attentivement.`,
  );
}

for (const node of nodes) {
  const result = articles.find((a) => a.slug === node.slug) || articles[nodes.indexOf(node)];
  if (!result) {
    console.error(`✗ Aucun article reçu pour "${node.slug}"`);
    continue;
  }
  warnUrlIssues(node.slug, result.body, result.sources);
  const filePath = writeArticle(node, result);
  console.log(`✓ Généré : ${filePath}`);
  console.log(`  sources (${(result.sources || []).length}) : ${(result.sources || []).map((s) => s.url).join(", ") || "aucune"}`);
  console.log(`  relatedExpertises retenus : ${(result.relatedExpertises || []).join(", ") || "aucun"}`);
}
console.log(`status: draft sur tous — vérification manuelle des sources + QA avant publication.`);
