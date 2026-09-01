// Studio Jannah — admin-veille-filter
// Juge la pertinence des articles veille_rss en attente (status=nouveau,
// relevance pas encore jugée) via Gemini, au regard des critères éditoriaux
// versionnés dans .claude/agents/veille-filter.md — relus en brut sur
// GitHub à CHAQUE appel, jamais figés dans le code : éditer ce fichier et
// pousser sur main suffit à changer les critères, aucun redeploy requis.
// Ne publie rien, ne touche jamais content/insights/ : juste un pré-tri.
//
// Même pattern d'auth que admin-leads : JWT du front vérifié, puis
// service_role. Pas de types TypeScript imbriqués — même raison que les
// autres fonctions admin-* (éditeur inline du Dashboard Supabase).

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

// Le frontmatter --- ... --- (name/description) sert Claude Code / les
// humains qui parcourent .claude/agents/, pas Gemini — on ne garde que le
// corps éditorial.
function stripFrontmatter(md) {
  return md.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
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

  const dbHeaders = {
    apikey: SERVICE_ROLE_KEY,
    authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
  };
  const rest = `${SUPABASE_URL}/rest/v1/veille_rss`;

  // 1. Articles en attente de jugement (pas déjà filtrés)
  const pendingRes = await fetch(
    `${rest}?select=id,title,summary&status=eq.nouveau&relevance=is.null&order=fetched_at.desc`,
    { headers: dbHeaders },
  );
  if (!pendingRes.ok) return new Response(await pendingRes.text(), { status: pendingRes.status, headers: CORS });
  const pending = await pendingRes.json();

  if (pending.length === 0) {
    return new Response(JSON.stringify({ judged: 0, items: [] }), {
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  // 2. Critères éditoriaux — relus à chaque appel, jamais figés dans le code
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

  // 3. Jugement Gemini — un seul appel pour tout le lot, sortie JSON stricte
  const systemInstruction = `Tu es le filtre de pertinence éditoriale de Studio Jannah. Applique STRICTEMENT les critères ci-dessous à chaque article de la liste fournie, un verdict par article, jamais de texte hors du JSON demandé.\n\n${criteria}`;
  const userPrompt = `Articles à juger (id, titre, résumé RSS) :\n\n${pending
    .map(
      (a) =>
        `- id: ${a.id}\n  titre: ${a.title}\n  résumé: ${(a.summary || "(aucun résumé)")
          .replace(/<[^>]+>/g, "")
          .slice(0, 600)}`,
    )
    .join("\n\n")}`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              verdicts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    relevance: { type: "string", enum: ["pertinent", "hors_scope"] },
                    reason: { type: "string" },
                  },
                  required: ["id", "relevance", "reason"],
                },
              },
            },
            required: ["verdicts"],
          },
          temperature: 0.2,
        },
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
  const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return new Response(JSON.stringify({ error: "Réponse Gemini vide/inattendue." }), {
      status: 502,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  let verdicts;
  try {
    verdicts = JSON.parse(text).verdicts || [];
  } catch {
    return new Response(JSON.stringify({ error: "Réponse Gemini non parseable." }), {
      status: 502,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  // 4. Écrit chaque verdict en base — un PATCH par ligne (lots modestes en
  // usage personnel, pas besoin d'un bulk upsert ici).
  const results = [];
  for (const v of verdicts) {
    if (!v.id || !["pertinent", "hors_scope"].includes(v.relevance)) continue;
    const patchRes = await fetch(`${rest}?id=eq.${v.id}`, {
      method: "PATCH",
      headers: { ...dbHeaders, prefer: "return=representation" },
      body: JSON.stringify({ relevance: v.relevance, relevance_reason: v.reason || null }),
    });
    if (patchRes.ok) {
      const [row] = await patchRes.json();
      if (row) results.push(row);
    }
  }

  return new Response(JSON.stringify({ judged: results.length, items: results }), {
    headers: { ...CORS, "content-type": "application/json" },
  });
});
