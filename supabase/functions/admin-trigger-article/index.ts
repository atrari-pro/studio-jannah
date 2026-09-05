// Studio Jannah — admin-trigger-article
// Appelée depuis l'admin (/admin, onglet "Chat veille (IA)") quand
// l'utilisateur soumet une idée d'article à traiter par le pipeline
// éditorial complet (Research → GEO/SEO → QA → Publish), et pas par le
// wizard admin-generate-content (plus léger, un seul passage Gemini).
//
// Ne fait AUCUN appel Gemini ni de recherche ici — cette fonction ne fait
// que déposer la demande sous forme d'issue GitHub labellisée
// `blog-on-demand`. C'est la routine cloud Claude Code ("Blog quotidien
// Studio Jannah", voir docs/ON_DEMAND_ARTICLE.md) qui, réveillée par un
// webhook sur l'ouverture de cette issue, fait le vrai travail (même
// rigueur que le run quotidien automatique) puis commente/ferme l'issue.
//
// Réutilise GITHUB_TOKEN (déjà posé pour admin-generate-content, scope
// repo classique qui couvre déjà les Issues) — aucun nouveau secret.
//
// Pas de types TypeScript imbriqués — JS pur, éditable dans le Dashboard.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN") ?? "";

const GITHUB_OWNER = "atrari-pro";
const GITHUB_REPO = "studio-jannah";
const LABEL = "blog-on-demand";
const MAX_IDEA_LENGTH = 2000;

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
  if (!res.ok) {
    const err = new Error(`GitHub ${path} ${res.status}: ${await res.text()}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  const user = await requireUser(req);
  if (!user) return new Response("Unauthorized", { status: 401, headers: CORS });

  if (!GITHUB_TOKEN) {
    return new Response(JSON.stringify({ error: "GITHUB_TOKEN manquant côté fonction." }), {
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

  const idea = typeof body?.idea === "string" ? body.idea.trim() : "";
  if (!idea) {
    return new Response(JSON.stringify({ error: "L'idée est vide." }), {
      status: 400,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }
  if (idea.length > MAX_IDEA_LENGTH) {
    return new Response(JSON.stringify({ error: `Idée trop longue (max ${MAX_IDEA_LENGTH} caractères).` }), {
      status: 400,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  const title = `[Article] ${idea.length > 80 ? idea.slice(0, 77) + "…" : idea}`;
  const issueBody = [
    idea,
    "",
    "---",
    "Demande manuelle via l'admin Studio Jannah — déclenche automatiquement",
    "le pipeline éditorial (Research → GEO/SEO → QA → Publish) via la",
    "routine cloud « Blog quotidien Studio Jannah ». Cette issue sera",
    "commentée puis fermée automatiquement une fois traitée.",
  ].join("\n");

  let issue;
  try {
    issue = await gh(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`, {
      method: "POST",
      body: JSON.stringify({ title, body: issueBody, labels: [LABEL] }),
    });
  } catch (e) {
    console.error("[admin-trigger-article]", e);
    return new Response(JSON.stringify({ error: `Échec de création de l'issue : ${String(e.message || e)}` }), {
      status: 502,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ issueUrl: issue.html_url, issueNumber: issue.number }), {
    status: 200,
    headers: { ...CORS, "content-type": "application/json" },
  });
});
