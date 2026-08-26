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

    return new Response("Action inconnue", { status: 400, headers: CORS });
  } catch (err) {
    console.error("[admin-generate-content]", err);
    return new Response(String(err), { status: 500, headers: CORS });
  }
});
