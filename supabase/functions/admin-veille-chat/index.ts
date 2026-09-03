// Studio Jannah — admin-veille-chat
// Proxy Gemini (grounding Google Search) pour un chat conversationnel côté
// admin — pas un flux RSS, une conversation libre ("trouve-moi des flux
// RSS sur le tracking", puis rebondir dessus). Stateless : aucune table
// Supabase, aucune persistance côté serveur — le client renvoie
// l'historique complet à chaque tour, cette fonction ne fait qu'un
// aller-retour Gemini.
//
// Mêmes critères éditoriaux que admin-veille-filter, relus en brut sur
// GitHub à CHAQUE appel (jamais figés dans le code) : éditer
// .claude/agents/veille-filter.md et pousser sur main suffit à changer le
// cadrage, aucun redeploy requis.
//
// Même pattern d'auth que les autres fonctions admin-* : JWT du front
// vérifié, puis clé Gemini utilisée uniquement ici — jamais exposée au
// navigateur. Pas de types TypeScript imbriqués — JS pur, éditable dans
// le Dashboard.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const CRITERIA_URL =
  "https://raw.githubusercontent.com/atrari-pro/studio-jannah/main/.claude/agents/veille-filter.md";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Combien de sources vérifiées renvoyer par tour — un chat doit rester
// léger à chaque réponse, contrairement au digest ponctuel de
// pnpm veille:search (plafonné à 10 lui, un rapport, pas une conversation).
const MAX_SOURCES = 6;

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

// Le frontmatter --- ... --- sert Claude Code / les humains, pas Gemini.
function stripFrontmatter(md) {
  return md.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
}

// Résout chaque lien de redirection Google (vertexaisearch.cloud.google.com)
// vers l'URL finale réelle — plus lisible pour l'utilisateur. Si la
// résolution échoue, on garde quand même le lien de redirection : il
// fonctionne toujours au clic, juste moins lisible.
async function resolveUrl(redirectUrl) {
  try {
    const r = await fetch(redirectUrl, { method: "HEAD", redirect: "follow" });
    return r.url || redirectUrl;
  } catch {
    return redirectUrl;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  const user = await requireUser(req);
  if (!user) return new Response("Unauthorized", { status: 401, headers: CORS });

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY manquante côté fonction." }), {
      status: 500,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400, headers: CORS });
  }

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const valid = messages.every(
    (m) => m && (m.role === "user" || m.role === "model") && typeof m.text === "string" && m.text.trim(),
  );
  if (messages.length === 0 || !valid || messages[messages.length - 1].role !== "user") {
    return new Response("Body attendu : { messages: [{ role, text }, ...] }, dernier message = user", {
      status: 400,
      headers: CORS,
    });
  }

  // Critères éditoriaux — relus à chaque appel, jamais figés dans le code.
  let criteria;
  try {
    const criteriaRes = await fetch(CRITERIA_URL);
    if (!criteriaRes.ok) throw new Error(`GitHub ${criteriaRes.status}`);
    criteria = stripFrontmatter(await criteriaRes.text());
  } catch (e) {
    return new Response(JSON.stringify({ error: `Critères inaccessibles : ${String(e.message || e)}` }), {
      status: 502,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  const systemInstruction = `Tu es un assistant de veille pour Studio Jannah, qui aide à trouver des
signaux d'actualité, des flux RSS ou des sources pertinentes selon les
critères de scope ci-dessous. Réponds à la demande de l'utilisateur,
utilise la recherche web quand c'est utile pour vérifier ou trouver des
informations réelles et récentes — jamais inventées.

${criteria}

Ne mets JAMAIS d'URL toi-même dans ta réponse (les sources sont
récupérées séparément, automatiquement, depuis la recherche) — décris
seulement ce que tu trouves. Réponds en français, de façon concise et
directe, comme dans une conversation.`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0.4 },
      }),
    },
  );
  if (!geminiRes.ok) {
    return new Response(JSON.stringify({ error: `Gemini ${geminiRes.status}: ${await geminiRes.text()}` }), {
      status: 502,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  const geminiData = await geminiRes.json();
  const candidate = geminiData?.candidates?.[0];
  const text = (candidate?.content?.parts ?? []).map((p) => p.text || "").join("");
  if (!text.trim()) {
    return new Response(JSON.stringify({ error: "Réponse Gemini vide ou inattendue." }), {
      status: 502,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  // Sources vérifiées uniquement — jamais depuis le texte libre du modèle
  // (peut inventer/déformer un lien même avec le grounding actif, déjà
  // constaté et corrigé sur pnpm veille:search).
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

  return new Response(JSON.stringify({ text: text.trim(), sources }), {
    headers: { ...CORS, "content-type": "application/json" },
  });
});
