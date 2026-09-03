// Studio Jannah — admin-tasks
// CRUD sur les tâches ponctuelles (voir supabase/tasks.sql). Même pattern
// que admin-leads : JWT du front vérifié, puis service_role (bypass RLS).
// Pas de types TypeScript imbriqués — JS pur, éditable dans le Dashboard.

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

// Auto-enregistrement du projet (voir supabase/projects.sql, admin-projects) —
// best-effort : une panne ici ne doit jamais empêcher de créer/modifier une
// tâche, c'est un à-côté, pas l'opération demandée par l'utilisateur.
async function ensureProject(name) {
  if (!name) return;
  try {
    const rest = `${SUPABASE_URL}/rest/v1/projects`;
    const dbHeaders = {
      apikey: SERVICE_ROLE_KEY,
      authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
    };
    const existing = await fetch(`${rest}?select=id&name=ilike.${encodeURIComponent(name)}&limit=1`, { headers: dbHeaders });
    if (!existing.ok) return;
    const [row] = await existing.json();
    if (row) return;
    await fetch(rest, {
      method: "POST",
      headers: { ...dbHeaders, prefer: "return=minimal" },
      body: JSON.stringify({ name, status: "actif" }),
    });
  } catch {
    // best-effort, voir commentaire ci-dessus
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const user = await requireUser(req);
  if (!user) return new Response("Unauthorized", { status: 401, headers: CORS });

  const rest = `${SUPABASE_URL}/rest/v1/tasks`;
  const dbHeaders = {
    apikey: SERVICE_ROLE_KEY,
    authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
  };

  if (req.method === "GET") {
    const res = await fetch(`${rest}?select=*&order=end_date.asc`, { headers: dbHeaders });
    if (!res.ok) return new Response(await res.text(), { status: res.status, headers: CORS });
    const tasks = await res.json();
    return new Response(JSON.stringify({ tasks }), { headers: { ...CORS, "content-type": "application/json" } });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response("Bad request", { status: 400, headers: CORS });
    }
    const { project, title, start_date, end_date, status, notes, category } = body;
    if (!project || !title || !start_date || !end_date) {
      return new Response("Missing project/title/start_date/end_date", { status: 400, headers: CORS });
    }
    const res = await fetch(rest, {
      method: "POST",
      headers: { ...dbHeaders, prefer: "return=representation" },
      body: JSON.stringify({
        project,
        title,
        start_date,
        end_date,
        status: status || "a_faire",
        notes: notes || null,
        category: category || null,
      }),
    });
    if (!res.ok) return new Response(await res.text(), { status: res.status, headers: CORS });
    const [task] = await res.json();
    await ensureProject(project);
    return new Response(JSON.stringify({ task }), { headers: { ...CORS, "content-type": "application/json" } });
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
      body: JSON.stringify(fields),
    });
    if (!res.ok) return new Response(await res.text(), { status: res.status, headers: CORS });
    const [task] = await res.json();
    if (fields.project) await ensureProject(fields.project);
    return new Response(JSON.stringify({ task }), { headers: { ...CORS, "content-type": "application/json" } });
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
