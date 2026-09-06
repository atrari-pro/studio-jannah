#!/usr/bin/env node
// Studio Jannah — pnpm expertise:generate
// Génère UN article de la bibliothèque Expertises (Pipeline C, voir
// docs/CONTENT_EXPERTISE_TAXONOMY.md) via l'API Gemini, même clé que les
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
// script. Un appel = un article (génération volontairement progressive,
// pas de boucle sur toute la taxonomie, pour rester vérifiable pas à pas
// et ne pas cramer un quota Gemini sur une série ininterrompue).
//
// Usage :
//   node --env-file-if-exists=.env scripts/expertise-generate.mjs \
//     --domain tracking --category qa --category-label "QA & fiabilité" \
//     --slug methodologie-qa-tracking \
//     --title "Méthodologie de QA tracking : de la préprod à la prod" \
//     --type methodologie --level avance \
//     --related tracking/gtm/qa-de-tags,tracking/datalayer/audit-datalayer

import { writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONTENT_DIR = join(ROOT, "apps/web/content/expertises");
const INSIGHTS_DIR = join(ROOT, "apps/web/content/insights");
const USECASES_DIR = join(ROOT, "apps/web/content/use-cases");
const CONTRACT_PATH = join(ROOT, "docs/TRACKING_DATALAYER.md");
const TAXONOMY_PATH = join(ROOT, "docs/CONTENT_EXPERTISE_TAXONOMY.md");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error(
    "Manque GEMINI_API_KEY dans l'environnement — ajoute-la à ton .env local " +
      "(même valeur que le secret Supabase GEMINI_API_KEY). Voir .env.example.",
  );
  process.exit(1);
}

function arg(name, required = true) {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  if (required && !v) {
    console.error(`Argument manquant : --${name}`);
    process.exit(1);
  }
  return v;
}

const domain = arg("domain");
const category = arg("category");
const categoryLabel = arg("category-label");
const slug = arg("slug");
const title = arg("title");
const type = arg("type"); // guide|audit|checklist|glossaire|comparatif|methodologie
const level = arg("level"); // fondamentaux|avance|expert
const relatedArg = arg("related", false) || "";

const VALID_TYPES = ["guide", "audit", "checklist", "glossaire", "comparatif", "methodologie"];
const VALID_LEVELS = ["fondamentaux", "avance", "expert"];
if (!VALID_TYPES.includes(type)) {
  console.error(`--type invalide : ${type} (attendu : ${VALID_TYPES.join(", ")})`);
  process.exit(1);
}
if (!VALID_LEVELS.includes(level)) {
  console.error(`--level invalide : ${level} (attendu : ${VALID_LEVELS.join(", ")})`);
  process.exit(1);
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
const thisSlug = `${domain}/${category}/${slug}`;

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
function fixInternalLinks(body) {
  let out = body.replace(/\]\(([^)\s]+)\)/g, (match, target) => {
    if (/^https?:\/\//.test(target) || target.startsWith("#") || target.startsWith("mailto:")) {
      return match;
    }
    const bare = target.replace(/^\/+/, "").replace(/^expertises\//, "");
    if (existingSlugs.includes(bare) || bare === thisSlug) return `](/expertises/${bare})`;
    if (insightSlugs.includes(bare)) return `](/blog/${bare})`;
    if (useCaseSlugs.includes(bare)) return `](/use-cases/${bare})`;
    return match; // lien externe/inconnu : laissé tel quel, vérifié à la main ensuite
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
function warnUndeclaredUrls(body, sources) {
  const declared = new Set((sources || []).map((s) => s.url));
  const used = new Set();
  for (const m of body.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) used.add(m[1]);
  const undeclared = [...used].filter((u) => !declared.has(u));
  if (undeclared.length > 0) {
    console.warn(`  ⚠ URLs citées dans le corps mais absentes des sources déclarées (à vérifier à la main) :`);
    for (const u of undeclared) console.warn(`    - ${u}`);
  }
}

// --- Contrat dataLayer (condensé, pour éviter toute contradiction) --------
// Best-effort : le fichier peut évoluer, on en tire juste les faits utiles
// pour un article éditorial généraliste (pas besoin de tout le doc).
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

const systemInstruction = `
Tu es l'agent "Expertise Author" de Studio Jannah — vitrine expert data/marketing/tracking/IA de Mohamed Atrari (signature éditoriale).

Tu rédiges un article de référence pour la bibliothèque Expertises (silo pilier/cluster, distincte du blog magazine) : un guide de fond fini, pas un angle court. Contrairement à un article magazine, le ton est expert et factuel, pas putaclic.

Structure imposée selon le type "${type}" :
${STRUCTURE_BY_TYPE[type]}

Contraintes strictes :
- Réponse courte en ouverture du corps (40 à 80 mots), puis structure H2 (##) cohérente avec le type ci-dessus.
- Sources obligatoires : documentation officielle reconnue (Google, MDN, W3C, CNIL...) ou référence reconnue de l'écosystème (ex. Simo Ahava pour GTM/GA4). Si tu n'es pas sûr qu'une URL existe réellement, NE L'INVENTE PAS — omets-la plutôt qu'une URL fausse. 3 à 5 sources suffisent, pas plus.
- RÈGLE ABSOLUE sur les liens externes : le corps ne doit utiliser AUCUNE URL externe qui ne soit pas déjà listée dans le tableau JSON "sources" que tu renvoies. Chaque entrée de "sources" doit être citée en lien Markdown [label](url) au moins une fois dans le corps, en reprenant l'URL EXACTEMENT identique à celle du tableau — jamais une autre URL "answer/xxxxx" inventée à la volée pour un point de détail. Un point qui n'a pas de source vérifiée dans ton tableau reste en texte simple, sans lien.
- RÈGLE ABSOLUE sur les liens internes : toute mention d'un autre article Expertises, insight ou use case DOIT être un vrai lien Markdown complet [texte descriptif](/expertises/<slug>) — JAMAIS une mention entre crochets sans parenthèses comme "[Voir notre expertise sur /expertises/x]" (ça ne produit PAS un lien cliquable, c'est cassé). Le texte du lien est une phrase normale, l'URL ne doit apparaître que dans la partie (...).
- Terminologie technique (GTM, GA4, SGTM, dataLayer, server-side, Cloud Run, Consent Mode, BigQuery, noms de paramètres...) reste en anglais tel quel, jamais traduite, jamais de casse altérée.
- Jamais de client réel nommé. Marque fictive OK si explicitement marquée comme exemple/placeholder.
- Le corps est du Markdown pur, commence directement par le premier paragraphe de réponse courte (PAS de titre H1, il est géré ailleurs), utilise des listes à puces avec **gras** pour les points clés dans les checklists/audits.
- Termine par une section "## Ce que Studio Jannah recommande".
- Lien interne vers un autre article Expertises : utilise le chemin absolu exact "/expertises/<slug>" (slash de tête, chemin complet tel que listé ci-dessous), jamais le slug seul ni un chemin relatif.
- description ≤ 155 caractères (meta description).
- hook : une phrase d'accroche qui dit la promesse concrète de l'article (ce qu'on repart pouvoir faire), pas un putaclic.

${CONTRACT_FACTS}

relatedExpertises : jusqu'à 4 slugs, UNIQUEMENT parmi cette liste réelle (n'invente aucun autre slug) :
${existingSlugs.filter((s) => s !== thisSlug).join(", ") || "(aucun autre article existant pour l'instant)"}

Réponds uniquement avec le JSON demandé par le schéma, rien d'autre autour.
`.trim();

const userPrompt = `Domaine : ${domain}
Catégorie : ${categoryLabel} (${category})
Titre imposé (ne pas le changer) : "${title}"
Type : ${type}
Niveau : ${level}

Rédige l'article complet correspondant à ce titre et à ce type, en respectant strictement les contraintes du system prompt.`;

const responseSchema = {
  type: "object",
  properties: {
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
  required: ["description", "hook", "tags", "sources", "body"],
};

async function callGemini() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
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
        maxOutputTokens: 16384,
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Réponse Gemini vide/inattendue : ${JSON.stringify(data)}`);
  // finishReason "MAX_TOKENS" = réponse tronquée en plein milieu du JSON —
  // vu en pratique (article coupé à mi-phrase, sans que JSON.parse échoue
  // toujours). Échouer bruyamment plutôt qu'écrire un fichier incomplet.
  if (candidate?.finishReason && candidate.finishReason !== "STOP") {
    throw new Error(
      `Réponse Gemini tronquée (finishReason: ${candidate.finishReason}) — relance avec un sujet plus étroit ou vérifie maxOutputTokens.`,
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`JSON Gemini invalide/tronqué (échec de parsing) : ${e.message}`);
  }
  // Filet de sécurité en plus de finishReason : vu en pratique un corps
  // coupé en pleine phrase avec quand même finishReason "STOP" — heuristique
  // simple plutôt que de faire confiance à ce seul champ.
  const body = (parsed.body || "").trim();
  const boldMarkers = (body.match(/\*\*/g) || []).length;
  const endsCleanly = /[.!?:)]["']?$/.test(body) || /\*\*$/.test(body);
  if (boldMarkers % 2 !== 0 || !endsCleanly) {
    throw new Error(
      `Corps généré probablement tronqué (marqueurs ** non appariés ou fin de texte suspecte : "...${body.slice(-80)}"). Relance la commande.`,
    );
  }
  return parsed;
}

function toYamlList(items) {
  if (!items || items.length === 0) return "[]";
  return `\n${items.map((i) => `  - ${typeof i === "string" ? `"${i.replace(/"/g, '\\"')}"` : i}`).join("\n")}`;
}

function frontmatter(result) {
  // relatedExpertises : ne garder que des slugs réellement existants (filet
  // de sécurité en plus de la consigne dans le prompt).
  const related = (result.relatedExpertises || []).filter((s) => existingSlugs.includes(s));
  const sourcesYaml =
    (result.sources || []).length === 0
      ? "[]"
      : `\n${result.sources.map((s) => `  - label: "${s.label.replace(/"/g, '\\"')}"\n    url: "${s.url}"`).join("\n")}`;

  return `---
title: "${title.replace(/"/g, '\\"')}"
description: "${result.description.replace(/"/g, '\\"')}"
publishedAt: ${new Date().toISOString().slice(0, 10)}
status: draft
categoryLabel: "${categoryLabel.replace(/"/g, '\\"')}"
type: "${type}"
level: "${level}"
tags: [${(result.tags || []).map((t) => `"${t.replace(/"/g, '\\"')}"`).join(", ")}]
hook: "${result.hook.replace(/"/g, '\\"')}"
sources:${sourcesYaml}
relatedInsights: ${toYamlList(result.relatedInsights)}
relatedUseCases: ${toYamlList(result.relatedUseCases)}
relatedExpertises: ${toYamlList(related)}
---

${fixInternalLinks(result.body.trim())}
`;
}

const result = await callGemini();
warnUndeclaredUrls(result.body, result.sources);
const dir = join(CONTENT_DIR, domain, category);
mkdirSync(dir, { recursive: true });
const filePath = join(dir, `${slug}.md`);
writeFileSync(filePath, frontmatter(result), "utf-8");

console.log(`✓ Généré : ${filePath}`);
console.log(`  sources (${(result.sources || []).length}) : ${(result.sources || []).map((s) => s.url).join(", ") || "aucune"}`);
console.log(`  relatedExpertises retenus : ${(result.relatedExpertises || []).filter((s) => existingSlugs.includes(s)).join(", ") || "aucun"}`);
console.log(`  status: draft — vérification manuelle des sources + QA avant publication.`);
