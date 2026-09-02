// Studio Jannah — admin-projects
// CRUD sur les projets (statut de premier niveau — voir supabase/projects.sql).
// Un projet n'est pas créé uniquement ici : admin-tasks / admin-objectives /
// admin-leads en upsertent aussi automatiquement (par nom) dès qu'un projet
// est utilisé ailleurs, pour qu'il n'y ait jamais de double saisie. Même
// pattern JS pur que les autres fonctions admin-*.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const user = await requireUser(req);
  if (!user) return new Response("Unauthorized", { status: 401, headers: CORS });

  const rest = `${SUPABASE_URL}/rest/v1/projects`;
  const dbHeaders = {
    apikey: SERVICE_ROLE_KEY,
    authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
  };

  if (req.method === "GET") {
    const res = await fetch(`${rest}?select=*&order=name.asc`, { headers: dbHeaders });
    if (!res.ok) return new Response(await res.text(), { status: res.status, headers: CORS });
    const projects = await res.json();
    return new Response(JSON.stringify({ projects }), { headers: { ...CORS, "content-type": "application/json" } });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response("Bad request", { status: 400, headers: CORS });
    }
    const { name, status, notes } = body;
    if (!name) return new Response("Missing name", { status: 400, headers: CORS });
    // Upsert par nom, insensible à la casse (index unique lower(name) en
    // filet de sécurité côté DB) — même appel que la création manuelle
    // depuis Projets ou l'auto-création silencieuse déclenchée par
    // admin-tasks/admin-objectives/admin-leads. Select-then-insert plutôt
    // que ?on_conflict= : PostgREST ne sait cibler qu'un index sur des
    // colonnes littérales, pas sur une expression comme lower(name).
    const existingRes = await fetch(`${rest}?select=*&name=ilike.${encodeURIComponent(name)}&limit=1`, {
      headers: dbHeaders,
    });
    if (!existingRes.ok) return new Response(await existingRes.text(), { status: existingRes.status, headers: CORS });
    const [existing] = await existingRes.json();
    if (existing) {
      return new Response(JSON.stringify({ project: existing }), { headers: { ...CORS, "content-type": "application/json" } });
    }
    const res = await fetch(rest, {
      method: "POST",
      headers: { ...dbHeaders, prefer: "return=representation" },
      body: JSON.stringify({ name, status: status || "actif", notes: notes || null }),
    });
    if (!res.ok) return new Response(await res.text(), { status: res.status, headers: CORS });
    const [project] = await res.json();
    return new Response(JSON.stringify({ project }), { headers: { ...CORS, "content-type": "application/json" } });
  }

  if (req.method === "PATCH") {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response("Bad request", { status: 400, headers: CORS });
    }
    const { id, ...fields } = body;
    if (!id) return new Response("Missing id", { status: 400, headers: CORS });
    const res = await fetch(`${rest}?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...dbHeaders, prefer: "return=representation" },
      body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) return new Response(await res.text(), { status: res.status, headers: CORS });
    const [project] = await res.json();
    return new Response(JSON.stringify({ project }), { headers: { ...CORS, "content-type": "application/json" } });
  }

  if (req.method === "DELETE") {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return new Response("Missing id", { status: 400, headers: CORS });
    const res = await fetch(`${rest}?id=eq.${id}`, { method: "DELETE", headers: dbHeaders });
    if (!res.ok) return new Response(await res.text(), { status: res.status, headers: CORS });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, "content-type": "application/json" } });
  }

  return new Response("Method not allowed", { status: 405, headers: CORS });
});
