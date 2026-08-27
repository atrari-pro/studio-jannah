// Studio Jannah — admin-generate-content
// Appelée par l'admin (/admin, voir docs/ADMIN_LEADS.md) pour transformer un
// texte brut en fichier de contenu conforme au schéma du site, puis ouvrir
// une PR GitHub. Deux actions :
//   - "preview" : appelle Gemini, retourne le JSON généré (rien n'est écrit)
//   - "publish" : reprend un résultat de preview, construit le fichier,
//     ouvre une branche + une PR via l'API GitHub (status: draft toujours)
//
// JS pur (pas de types imbriqués) — même raison que notify-lead : l'éditeur
// inline du Dashboard Supabase bute sur un objet avec une propriété "type".

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN") ?? "";

const GITHUB_OWNER = "atrari-pro";
const GITHUB_REPO = "studio-jannah";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function requireUser(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization: `Bearer ${token}`, apikey: SERVICE_ROLE_KEY },
  });
  if (!res.ok) return null;
  return res.json();
}

// --- Voix / règles du site (condensé de AGENTS.md + docs/agents/*.md) ----

const VOICE_RULES = `
Studio Jannah — vitrine expert data/marketing/tracking/IA de Mohamed Atrari.
Marque : Studio Jannah. Signature éditoriale : Mohamed Atrari.

Insight (Jannah Mag) :
- Réponse courte en ouverture (40-80 mots), puis structure H2 = questions/entités.
- Preuves et sources nommées avec liens, jamais inventées.
- Chute qui ramène à "et pour la mesure / le tracking ?".
- Pas de fluff marketing générique, blocs clairs, dates/chiffres sourcés.

Use case :
- Structure obligatoire en 6 sections : 1. Contexte (marque fictive OK,
  secteur réel) 2. Parcours utilisateur 3. Ce que l'analytics croit voir vs
  réalité 4. Leviers (iframe / S2S / postMessage / réconciliation CRM)
  5. Limites (consent, IT, PSP) 6. Ce que Studio Jannah apporte.
- Narratif + schéma texte, pas de fausse page paiement hors domaine en v1.

Règles communes :
- Jamais de dark pattern, jamais de promesse irréaliste.
- Distinction claire "illustration" vs "client réel" si des marques sont citées.
- Français direct, sans remplissage marketing.
- N'invente jamais de chiffre, statistique, client ou résultat absent du
  texte brut fourni par l'auteur.
- N'invente jamais de source : n'utilise que celles listées dans la requête.
- Évite le tiret cadratin (—) dans la prose ; préfère la virgule, le point,
  ou "deux points".
`.trim();

// Extrait d'un article publié réel (trafic-demain-mesure.md), légèrement
// adapté (tiret cadratin retiré) pour rester cohérent avec la règle
// ci-dessus. Calibrage de ton uniquement, ne pas copier le contenu.
const STYLE_EXAMPLE = `
Les moteurs et assistants IA synthétisent de plus en plus de réponses sans
clic. Une part du "trafic de demain" ne passera jamais par une session GA4
classique, ou y arrivera déjà convaincue, plus courte, plus exigeante.

## Ce qui change vraiment pour les équipes digitales

- Moins de volume organique "découverte", plus de visites à forte intention
  (ou aucune visite du tout).
- Des parcours multi-surfaces (LLM → site → tunnel) mal collés par le
  last-click.
- Des métiers qui basculent : moins "générer des sessions", plus
  fiabiliser le signal et convertir le trafic restant (CRO + mesure).

## Et pour la mesure / le tracking ?

1. Inventaire des points de contact : citations LLM, landings campagnes,
   tunnels, retours PSP.
`.trim();

function schemaDescription(type, format) {
  if (type === "insight" && format === "vidéo") {
    return `Champs requis (JSON) :
- title: string (accrocheur, <= 70 caractères)
- description: string (<= 155 caractères, meta description)
- hook: string (1 phrase d'accroche éditoriale)
- rubrique: un seul parmi "mesure" | "trafic" | "metiers" | "produits" | "agents"
- tags: string[] (3 à 6 mots-clés)
- body: string (texte d'accompagnement COURT en Markdown, 2 à 4 paragraphes
  maximum : contexte de la vidéo et pourquoi la regarder. La vidéo porte le
  contenu, ce texte ne la remplace pas.)`;
  }
  if (type === "insight") {
    return `Champs requis (JSON) :
- title: string (accrocheur, <= 70 caractères)
- description: string (<= 155 caractères, meta description)
- hook: string (1 phrase d'accroche éditoriale)
- rubrique: un seul parmi "mesure" | "trafic" | "metiers" | "produits" | "agents"
- tags: string[] (3 à 6 mots-clés)
- body: string (corps en Markdown, structure H2 = questions/entités, chute
  "et pour la mesure / le tracking ?", pas de fluff)`;
  }
  return `Champs requis (JSON) :
- title: string (<= 70 caractères)
- description: string (<= 155 caractères)
- themes: string[] (3 à 6 mots-clés)
- body: string (corps en Markdown, structure obligatoire en 6 sections :
  1. Contexte 2. Parcours utilisateur 3. Ce que l'analytics croit voir vs
  réalité 4. Leviers 5. Limites 6. Ce que Studio Jannah apporte)`;
}

function responseSchemaFor(type) {
  if (type === "insight") {
    return {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        hook: { type: "string" },
        rubrique: { type: "string", enum: ["mesure", "trafic", "metiers", "produits", "agents"] },
        tags: { type: "array", items: { type: "string" } },
        body: { type: "string" },
      },
      required: ["title", "description", "hook", "rubrique", "tags", "body"],
    };
  }
  return {
    type: "object",
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      themes: { type: "array", items: { type: "string" } },
      body: { type: "string" },
    },
    required: ["title", "description", "themes", "body"],
  };
}

function parseSources(raw) {
  return (raw || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [label, url] = l.split("|").map((s) => (s || "").trim());
      return { label: label || "", url: url || "" };
    })
    .filter((s) => s.label && s.url);
}

async function callGemini(form) {
  const { type, format, rubrique, sector, complexity, content, sources } = form;
  const sourcesList = parseSources(sources);

  const systemInstruction = `Tu es l'agent de rédaction de Studio Jannah. Tu transformes un texte brut en contenu structuré, dans la voix du site.

Règles impératives :
${VOICE_RULES}

Exemple de ton attendu (extrait d'un article publié réel, pour calibrage du style uniquement, ne pas copier ni réutiliser son sujet) :
"""
${STYLE_EXAMPLE}
"""

${schemaDescription(type, format)}

Réponds uniquement avec le JSON demandé, rien d'autre.`;

  const userPrompt = `Type de contenu : ${type}
${
    type === "insight"
      ? `Rubrique souhaitée : ${rubrique || "à déduire du texte"}`
      : `Secteur : ${sector || "à déduire du texte"}\nComplexité : ${complexity || "à déduire du texte"}`
  }

Texte brut / notes fournies par l'auteur :
"""
${content}
"""

Sources fournies (n'en utiliser aucune autre) :
${sourcesList.length ? sourcesList.map((s) => `- ${s.label} : ${s.url}`).join("\n") : "(aucune fournie)"}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchemaFor(type),
        temperature: 0.4,
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Réponse Gemini vide/inattendue : ${JSON.stringify(data)}`);
  return JSON.parse(text);
}

// --- Auto-QA (condensé de docs/agents/qa.md) --------------------------
// Deuxième appel, séparé de la génération : relit le résultat au regard du
// checklist QA du site et remonte des points concrets à vérifier, plutôt
// que de laisser toute la relecture à l'humain. Best-effort : une erreur
// ici ne bloque jamais l'aperçu (voir l'appel dans le handler).

const QA_CHECKLIST = `
- Scope Studio Jannah respecté (data/marketing/tracking/IA, jamais hors-sujet)
- Sources présentes pour un insight, ou marques placeholder clairement
  indiquées pour un use case
- Aucun dark pattern, aucune promesse irréaliste
- Titres clairs, lisibles sur mobile (pas de titre trop long)
- Distinction claire "illustration" vs "client réel" si des marques sont
  citées
`.trim();

async function callGeminiQaCheck(form, result) {
  const systemInstruction = `Tu es le relecteur QA de Studio Jannah. Tu vérifies un contenu déjà généré au regard de ce checklist, tu ne le réécris pas et tu ne juges pas la qualité littéraire.

Checklist :
${QA_CHECKLIST}

Réponds uniquement avec un JSON : { "issues": string[] } — une liste de points précis et actionnables à vérifier ou corriger. Liste vide si rien à signaler.`;

  const userPrompt = `Type : ${form.type}
Titre : ${result.title}
Description : ${result.description}
${
    form.type === "insight"
      ? `Sources fournies par l'auteur : ${
          parseSources(form.sources).length
            ? parseSources(form.sources).map((s) => s.label).join(", ")
            : "aucune"
        }`
      : ""
  }

Corps généré :
"""
${result.body}
"""`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: { issues: { type: "array", items: { type: "string" } } },
          required: ["issues"],
        },
        temperature: 0.2,
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini QA ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Réponse QA vide/inattendue");
  return JSON.parse(text).issues ?? [];
}

// --- Fichier + GitHub ------------------------------------------------

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function yamlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

function buildFile(form, result) {
  const today = new Date().toISOString().slice(0, 10);
  const slug = slugify(result.title);

  if (form.type === "insight") {
    const sources = parseSources(form.sources);
    const sourcesYaml = sources.length
      ? `sources:\n${sources.map((s) => `  - label: ${yamlStr(s.label)}\n    url: ${yamlStr(s.url)}`).join("\n")}`
      : "sources: []";
    const format = form.format === "vidéo" ? "video" : "text";
    const videoYaml =
      format === "video"
        ? `\nvideo:\n  src: ${yamlStr(form.videoSrc)}${form.videoCaption ? `\n  caption: ${yamlStr(form.videoCaption)}` : ""}`
        : "";
    const frontmatter = `---
title: ${yamlStr(result.title)}
description: ${yamlStr(result.description)}
publishedAt: ${today}
status: draft
rubrique: ${result.rubrique}
format: ${format}
featured: ${form.featured ? "true" : "false"}
hook: ${yamlStr(result.hook)}
tags: [${result.tags.map((t) => yamlStr(t)).join(", ")}]
${sourcesYaml}${videoYaml}
---`;
    return { path: `apps/web/content/insights/${slug}.md`, content: `${frontmatter}\n\n${result.body.trim()}\n` };
  }

  const frontmatter = `---
title: ${yamlStr(result.title)}
description: ${yamlStr(result.description)}
publishedAt: ${today}
status: draft
sector: ${yamlStr(form.sector)}
complexity: ${form.complexity}
themes: [${result.themes.map((t) => yamlStr(t)).join(", ")}]
placeholderBrand: true
---`;
  return { path: `apps/web/content/use-cases/${slug}.md`, content: `${frontmatter}\n\n${result.body.trim()}\n` };
}

async function gh(path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

function toBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function fromBase64(b64) {
  return decodeURIComponent(escape(atob(b64.replace(/\s/g, ""))));
}

async function openPullRequest(file, title) {
  const repoBase = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
  const baseRef = await gh(`${repoBase}/git/ref/heads/main`);
  const baseSha = baseRef.object.sha;

  const branch = `content/admin-${Date.now()}`;
  await gh(`${repoBase}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
  });

  await gh(`${repoBase}/contents/${file.path}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `content(draft): généré depuis l'admin`,
      content: toBase64(file.content),
      branch,
    }),
  });

  const pr = await gh(`${repoBase}/pulls`, {
    method: "POST",
    body: JSON.stringify({
      title: `Draft contenu — ${title}`,
      head: branch,
      base: "main",
      body: "Généré depuis l'admin (/admin). Toujours en `status: draft` — relire, ajuster, passer `review`/`published` selon `docs/agents/qa.md`, puis merger.",
    }),
  });

  return pr.html_url;
}

// --- Drafts en attente (PR ouvertes générées depuis l'admin) ----------
// Lecture seule, pour relire un draft déjà proposé sans repasser par le
// wizard de génération. Réservé à l'admin (requireUser côté handler).

async function listOpenDraftPRs() {
  const repoBase = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
  const prs = await gh(`${repoBase}/pulls?state=open&per_page=50&sort=created&direction=desc`);
  return prs
    .filter((pr) => pr.head.ref.startsWith("content/admin-"))
    .map((pr) => ({
      number: pr.number,
      title: pr.title,
      htmlUrl: pr.html_url,
      createdAt: pr.created_at,
      headRef: pr.head.ref,
    }));
}

// Parseur volontairement restreint au format produit par buildFile() ci-dessus
// (pas une lib YAML générale) : scalaires 'entre quotes', tableaux [ 'a', 'b' ],
// blocs imbriqués (sources:, video:) ignorés ici (préservés tels quels par
// updateDraftFile, qui ne touche jamais leurs lignes).
function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n\r?\n?([\s\S]*)$/);
  if (!m) return { frontmatter: {}, body: raw.trim() };
  const lines = m[1].split(/\r?\n/);
  const fm = {};
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let value = kv[2];
    if (value === "") {
      // bloc imbriqué (sources:, video:) : on saute les lignes indentées qui suivent
      let j = i + 1;
      while (j < lines.length && /^\s/.test(lines[j])) j++;
      i = j - 1;
      continue;
    }
    if (/^'.*'$/.test(value)) {
      value = value.slice(1, -1).replace(/''/g, "'");
    } else if (/^\[.*\]$/.test(value)) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^'|'$/g, "").replace(/''/g, "'"))
        .filter(Boolean);
    }
    fm[key] = value;
  }
  return { frontmatter: fm, body: m[2].trim() };
}

async function readDraftFile(prNumber) {
  const repoBase = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
  const pr = await gh(`${repoBase}/pulls/${prNumber}`);
  const files = await gh(`${repoBase}/pulls/${prNumber}/files`);
  const file = files.find((f) => f.filename.startsWith("apps/web/content/"));
  if (!file) throw new Error("Fichier de contenu introuvable dans cette PR");
  const contentRes = await gh(`${repoBase}/contents/${file.filename}?ref=${pr.head.ref}`);
  const raw = fromBase64(contentRes.content);
  const { frontmatter, body } = parseFrontmatter(raw);
  return {
    prNumber,
    headRef: pr.head.ref,
    path: file.filename,
    prUrl: pr.html_url,
    fields: {
      title: frontmatter.title || "",
      description: frontmatter.description || "",
      status: frontmatter.status || "draft",
      hook: frontmatter.hook || "",
      rubrique: frontmatter.rubrique || "",
      sector: frontmatter.sector || "",
      complexity: frontmatter.complexity || "",
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
      themes: Array.isArray(frontmatter.themes) ? frontmatter.themes : [],
    },
    body,
  };
}

// Édition : ne touche que title/description/status (remplacement de ligne
// ciblé) et le corps (remplacement intégral après le frontmatter) — tout le
// reste (tags, sources, video, rubrique...) reste intact tel que généré.
// Partagé entre l'édition d'un draft (branche déjà liée à une PR) et
// l'édition d'un article déjà publié (branche créée à la volée, voir
// startEditFromPublished / saveEditedPublished plus bas).
async function commitFieldEdits(path, branch, edits) {
  const repoBase = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
  const existing = await gh(`${repoBase}/contents/${path}?ref=${branch}`);
  const raw = fromBase64(existing.content);

  const m = raw.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n\r?\n?)([\s\S]*)$/);
  if (!m) throw new Error("Frontmatter illisible, édition impossible");
  let frontmatterBlock = m[1];
  let body = m[2];

  function setField(key, value) {
    const re = new RegExp(`^${key}:.*$`, "m");
    if (re.test(frontmatterBlock)) frontmatterBlock = frontmatterBlock.replace(re, `${key}: ${value}`);
  }

  if (edits.title != null) setField("title", yamlStr(edits.title));
  if (edits.description != null) setField("description", yamlStr(edits.description));
  if (edits.status != null) setField("status", edits.status);
  if (edits.body != null) body = `${edits.body.trim()}\n`;

  const newContent = `${frontmatterBlock}${body}`;

  await gh(`${repoBase}/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({
      message: "content(draft): édité depuis l'admin",
      content: toBase64(newContent),
      sha: existing.sha,
      branch,
    }),
  });
}

async function updateDraftFile(prNumber, edits) {
  const repoBase = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
  const pr = await gh(`${repoBase}/pulls/${prNumber}`);
  const files = await gh(`${repoBase}/pulls/${prNumber}/files`);
  const file = files.find((f) => f.filename.startsWith("apps/web/content/"));
  if (!file) throw new Error("Fichier de contenu introuvable dans cette PR");
  await commitFieldEdits(file.filename, pr.head.ref, edits);
  return readDraftFile(prNumber);
}

// Dernier maillon (merge PR + suppression de la branche) — plus de garde-fou
// "toujours manuel sur GitHub" côté Studio Jannah : décision explicite prise
// avec l'utilisateur pour que l'admin couvre le cycle complet jusqu'à prod.
async function mergeDraftPR(prNumber) {
  const repoBase = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
  const pr = await gh(`${repoBase}/pulls/${prNumber}`);
  const merge = await gh(`${repoBase}/pulls/${prNumber}/merge`, {
    method: "PUT",
    body: JSON.stringify({ merge_method: "squash" }),
  });
  await gh(`${repoBase}/git/refs/heads/${pr.head.ref}`, { method: "DELETE" }).catch(() => {});
  return { merged: !!merge.merged };
}

// --- Images (upload manuel uniquement — pas de génération LLM, voir
// docs/ADMIN_LEADS.md) -------------------------------------------------
// Committées sur la même branche que l'article, à côté du texte : elles
// arrivent dans la même PR, review et merge ensemble, cohérent avec le
// reste du flux (pas de stockage séparé à gérer).

function slugFromContentPath(path) {
  const base = path.split("/").pop() || "image";
  return base.replace(/\.md$/, "");
}

function safeFileName(name) {
  const dot = name.lastIndexOf(".");
  const ext = (dot > -1 ? name.slice(dot + 1) : "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const base = (dot > -1 ? name.slice(0, dot) : name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return `${base || "image"}.${ext}`;
}

// dataBase64 : contenu déjà encodé en base64 côté client (sans le préfixe
// data:...;base64,), envoyé tel quel à l'API Contents de GitHub.
//
// Prend directement une branche (pas besoin qu'une PR existe déjà dessus) —
// utile pour l'édition d'un article publié, où la PR n'est ouverte qu'au
// premier "Enregistrer" (voir saveEditedPublished) : sans ça, il aurait
// fallu enregistrer une fois avant de pouvoir insérer une image.
async function uploadImageToBranch(branch, contentPath, filename, dataBase64) {
  const repoBase = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
  const slug = slugFromContentPath(contentPath);
  const fileName = `${Date.now()}-${safeFileName(filename)}`;
  const repoPath = `apps/web/public/mag/${slug}/${fileName}`;

  await gh(`${repoBase}/contents/${repoPath}`, {
    method: "PUT",
    body: JSON.stringify({
      message: "content: image ajoutée depuis l'admin",
      content: dataBase64,
      branch,
    }),
  });

  return {
    // Chemin SITE-relatif (sans base path GitHub Pages) : c'est ce qu'il
    // faut mettre dans le Markdown (![alt](sitePath)). Le préfixe base
    // (/studio-jannah en CI) est ajouté au build par rehype-article-images.mjs
    // (apps/web/astro.config.mjs) — ne jamais le coder en dur ici.
    sitePath: `/mag/${slug}/${fileName}`,
    // URL brute GitHub pour afficher l'image dans la preview admin avant
    // merge (le site déployé ne la sert pas encore) — voir renderArticleBody
    // dans apps/app/src/Admin.tsx.
    rawUrl: `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${branch}/${repoPath}`,
  };
}

async function uploadDraftImage(prNumber, filename, dataBase64) {
  const repoBase = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
  const pr = await gh(`${repoBase}/pulls/${prNumber}`);
  const files = await gh(`${repoBase}/pulls/${prNumber}/files`);
  const contentFile = files.find((f) => f.filename.startsWith("apps/web/content/"));
  if (!contentFile) throw new Error("Fichier de contenu introuvable dans cette PR");
  return uploadImageToBranch(pr.head.ref, contentFile.filename, filename, dataBase64);
}

// --- Articles déjà publiés (sur main) ----------------------------------
// Reprendre la main sur du contenu déjà en ligne : lister, relire, éditer
// (via une PR, même garde-fou de revue que les drafts), dépublier ou
// supprimer (direct sur main, sans PR — ce sont des actions qui réduisent
// l'exposition, la vitesse prime sur la revue dans ce sens-là).

async function listPublishedContent() {
  const repoBase = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
  const dirs = [
    { type: "insight", path: "apps/web/content/insights" },
    { type: "use-case", path: "apps/web/content/use-cases" },
  ];
  const items = [];
  for (const dir of dirs) {
    const files = await gh(`${repoBase}/contents/${dir.path}?ref=main`).catch(() => []);
    for (const f of files) {
      if (!f.name.endsWith(".md")) continue;
      const path = `${dir.path}/${f.name}`;
      const contentRes = await gh(`${repoBase}/contents/${path}?ref=main`);
      const { frontmatter } = parseFrontmatter(fromBase64(contentRes.content));
      items.push({
        path,
        type: dir.type,
        title: frontmatter.title || f.name,
        status: frontmatter.status || "draft",
      });
    }
  }
  return items;
}

async function readPublishedFile(path) {
  const repoBase = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
  const contentRes = await gh(`${repoBase}/contents/${path}?ref=main`);
  const { frontmatter, body } = parseFrontmatter(fromBase64(contentRes.content));
  return {
    path,
    headRef: "main",
    prUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/blob/main/${path}`,
    fields: {
      title: frontmatter.title || "",
      description: frontmatter.description || "",
      status: frontmatter.status || "draft",
      hook: frontmatter.hook || "",
      rubrique: frontmatter.rubrique || "",
      sector: frontmatter.sector || "",
      complexity: frontmatter.complexity || "",
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
      themes: Array.isArray(frontmatter.themes) ? frontmatter.themes : [],
    },
    body,
  };
}

// Crée juste une branche (pas de PR — GitHub refuse une PR sans diff). La
// PR est ouverte au premier "Enregistrer" (saveEditedPublished), une fois
// qu'il y a vraiment quelque chose à review.
async function startEditFromPublished(path) {
  const repoBase = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
  const baseRef = await gh(`${repoBase}/git/ref/heads/main`);
  const branch = `content/edit-${Date.now()}`;
  await gh(`${repoBase}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseRef.object.sha }),
  });
  const read = await readPublishedFile(path);
  return { path, branch, prNumber: null, prUrl: null, fields: read.fields, body: read.body };
}

async function saveEditedPublished(path, branch, prNumber, edits) {
  await commitFieldEdits(path, branch, edits);
  const repoBase = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
  let pr;
  if (prNumber) {
    pr = await gh(`${repoBase}/pulls/${prNumber}`);
  } else {
    pr = await gh(`${repoBase}/pulls`, {
      method: "POST",
      body: JSON.stringify({
        title: `Édition — ${edits.title || path}`,
        head: branch,
        base: "main",
        body: "Édition d'un article déjà publié, ouverte depuis l'admin. Merger republie le correctif.",
      }),
    });
  }
  return { path, branch, prNumber: pr.number, prUrl: pr.html_url };
}

async function unpublishFile(path) {
  const repoBase = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
  const existing = await gh(`${repoBase}/contents/${path}?ref=main`);
  const raw = fromBase64(existing.content);
  const updated = raw.replace(/^status:.*$/m, "status: draft");
  await gh(`${repoBase}/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `content(draft): dépublié depuis l'admin (${path})`,
      content: toBase64(updated),
      sha: existing.sha,
      branch: "main",
    }),
  });
  return { ok: true };
}

// Supprime le fichier + toutes les images associées (best-effort — une
// image déjà absente ou déjà supprimée ne bloque pas le reste).
async function deletePublishedFile(path) {
  const repoBase = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
  const existing = await gh(`${repoBase}/contents/${path}?ref=main`);
  await gh(`${repoBase}/contents/${path}`, {
    method: "DELETE",
    body: JSON.stringify({
      message: `content: supprime ${path} depuis l'admin`,
      sha: existing.sha,
      branch: "main",
    }),
  });

  const slug = slugFromContentPath(path);
  const imgDirPath = `apps/web/public/mag/${slug}`;
  const imgFiles = await gh(`${repoBase}/contents/${imgDirPath}?ref=main`).catch(() => []);
  for (const f of imgFiles) {
    await gh(`${repoBase}/contents/${imgDirPath}/${f.name}`, {
      method: "DELETE",
      body: JSON.stringify({
        message: `content: supprime image orpheline ${f.name}`,
        sha: f.sha,
        branch: "main",
      }),
    }).catch(() => {});
  }
  return { ok: true };
}

// --- Handler -----------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  const user = await requireUser(req);
  if (!user) return new Response("Unauthorized", { status: 401, headers: CORS });

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400, headers: CORS });
  }

  const { action, form, result } = body;

  try {
    if (action === "preview") {
      if (!form?.content) return new Response("Texte brut manquant", { status: 400, headers: CORS });
      const generated = await callGemini(form);
      const qaIssues = await callGeminiQaCheck(form, generated).catch((err) => {
        console.error("[admin-generate-content] QA check failed, non-bloquant", err);
        return [];
      });
      return new Response(JSON.stringify({ result: generated, qaIssues }), {
        headers: { ...CORS, "content-type": "application/json" },
      });
    }

    if (action === "publish") {
      if (!form || !result) return new Response("form/result manquants", { status: 400, headers: CORS });
      const file = buildFile(form, result);
      const prUrl = await openPullRequest(file, result.title);
      return new Response(JSON.stringify({ prUrl }), {
        headers: { ...CORS, "content-type": "application/json" },
      });
    }

    if (action === "list-drafts") {
      const drafts = await listOpenDraftPRs();
      return new Response(JSON.stringify({ drafts }), {
        headers: { ...CORS, "content-type": "application/json" },
      });
    }

    if (action === "read-draft") {
      if (!body.prNumber) return new Response("prNumber manquant", { status: 400, headers: CORS });
      const draft = await readDraftFile(body.prNumber);
      return new Response(JSON.stringify(draft), {
        headers: { ...CORS, "content-type": "application/json" },
      });
    }

    if (action === "update-draft") {
      if (!body.prNumber) return new Response("prNumber manquant", { status: 400, headers: CORS });
      const draft = await updateDraftFile(body.prNumber, {
        title: body.title,
        description: body.description,
        status: body.status,
        body: body.body,
      });
      return new Response(JSON.stringify(draft), {
        headers: { ...CORS, "content-type": "application/json" },
      });
    }

    if (action === "merge-draft") {
      if (!body.prNumber) return new Response("prNumber manquant", { status: 400, headers: CORS });
      const res = await mergeDraftPR(body.prNumber);
      return new Response(JSON.stringify(res), {
        headers: { ...CORS, "content-type": "application/json" },
      });
    }

    if (action === "upload-draft-image") {
      if (!body.prNumber || !body.filename || !body.dataBase64) {
        return new Response("prNumber/filename/dataBase64 manquant", { status: 400, headers: CORS });
      }
      const res = await uploadDraftImage(body.prNumber, body.filename, body.dataBase64);
      return new Response(JSON.stringify(res), {
        headers: { ...CORS, "content-type": "application/json" },
      });
    }

    if (action === "upload-image-to-branch") {
      if (!body.branch || !body.path || !body.filename || !body.dataBase64) {
        return new Response("branch/path/filename/dataBase64 manquant", { status: 400, headers: CORS });
      }
      const res = await uploadImageToBranch(body.branch, body.path, body.filename, body.dataBase64);
      return new Response(JSON.stringify(res), {
        headers: { ...CORS, "content-type": "application/json" },
      });
    }

    if (action === "list-published") {
      const items = await listPublishedContent();
      return new Response(JSON.stringify({ items }), {
        headers: { ...CORS, "content-type": "application/json" },
      });
    }

    if (action === "read-published") {
      if (!body.path) return new Response("path manquant", { status: 400, headers: CORS });
      const res = await readPublishedFile(body.path);
      return new Response(JSON.stringify(res), {
        headers: { ...CORS, "content-type": "application/json" },
      });
    }

    if (action === "start-edit") {
      if (!body.path) return new Response("path manquant", { status: 400, headers: CORS });
      const res = await startEditFromPublished(body.path);
      return new Response(JSON.stringify(res), {
        headers: { ...CORS, "content-type": "application/json" },
      });
    }

    if (action === "save-edit") {
      if (!body.path || !body.branch) return new Response("path/branch manquant", { status: 400, headers: CORS });
      const res = await saveEditedPublished(body.path, body.branch, body.prNumber ?? null, {
        title: body.title,
        description: body.description,
        status: body.status,
        body: body.body,
      });
      return new Response(JSON.stringify(res), {
        headers: { ...CORS, "content-type": "application/json" },
      });
    }

    if (action === "unpublish") {
      if (!body.path) return new Response("path manquant", { status: 400, headers: CORS });
      const res = await unpublishFile(body.path);
      return new Response(JSON.stringify(res), {
        headers: { ...CORS, "content-type": "application/json" },
      });
    }

    if (action === "delete-published") {
      if (!body.path) return new Response("path manquant", { status: 400, headers: CORS });
      const res = await deletePublishedFile(body.path);
      return new Response(JSON.stringify(res), {
        headers: { ...CORS, "content-type": "application/json" },
      });
    }

    return new Response("Action inconnue", { status: 400, headers: CORS });
  } catch (err) {
    console.error("[admin-generate-content]", err);
    return new Response(String(err), { status: 500, headers: CORS });
  }
});
