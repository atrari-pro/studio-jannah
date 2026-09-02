// Studio Jannah — admin-leads
// Lecture / mise à jour des leads pour l'admin (/admin, voir docs/ADMIN_LEADS.md).
// Vérifie le JWT envoyé par le front (session Supabase de l'admin unique),
// puis agit avec le service_role (bypass RLS) — pas de policy RLS
// supplémentaire nécessaire, la protection est ici, dans la fonction.
//
// Pas de types TypeScript imbriqués ici — même raison que notify-lead
// (l'éditeur inline du Dashboard Supabase bute dessus). JS pur.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS",
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

  const rest = `${SUPABASE_URL}/rest/v1/leads`;
  const dbHeaders = {
    apikey: SERVICE_ROLE_KEY,
    authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
  };

  if (req.method === "GET") {
    const res = await fetch(`${rest}?select=*&order=created_at.desc`, { headers: dbHeaders });
    if (!res.ok) return new Response(await res.text(), { status: res.status, headers: CORS });
    const leads = await res.json();
    return new Response(JSON.stringify({ leads }), {
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  if (req.method === "PATCH") {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response("Bad request", { status: 400, headers: CORS });
    }
    const { id, status, notes } = body;
    if (!id) return new Response("Missing id", { status: 400, headers: CORS });

    const res = await fetch(`${rest}?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...dbHeaders, prefer: "return=minimal" },
      body: JSON.stringify({ status, notes, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) return new Response(await res.text(), { status: res.status, headers: CORS });
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  if (req.method === "DELETE") {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return new Response("Missing id", { status: 400, headers: CORS });

    const res = await fetch(`${rest}?id=eq.${id}`, {
      method: "DELETE",
      headers: { ...dbHeaders, prefer: "return=minimal" },
    });
    if (!res.ok) return new Response(await res.text(), { status: res.status, headers: CORS });
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405, headers: CORS });
});
