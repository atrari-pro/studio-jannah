// Studio Jannah — admin-objectives
// CRUD sur les objectifs à cadence + pointages quotidiens (voir
// supabase/objectives.sql). Le score (% réalisé/attendu à une date) n'est
// JAMAIS calculé ni stocké ici — cette fonction renvoie les données brutes
// (objectifs + pointages), le calcul vit côté admin (Admin.tsx), pour rester
// ajustable sans redeploy. Même pattern d'auth que admin-leads/admin-tasks.
// JS pur — pas de types TypeScript imbriqués, éditable dans le Dashboard.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

function dbHeaders(extra) {
  return {
    apikey: SERVICE_ROLE_KEY,
    authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
    ...(extra || {}),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const user = await requireUser(req);
  if (!user) return new Response("Unauthorized", { status: 401, headers: CORS });

  const objectivesUrl = `${SUPABASE_URL}/rest/v1/objectives`;
  const checkinsUrl = `${SUPABASE_URL}/rest/v1/objective_checkins`;

  if (req.method === "GET") {
    const [objectivesRes, checkinsRes] = await Promise.all([
      fetch(`${objectivesUrl}?select=*&order=end_date.asc.nullslast`, { headers: dbHeaders() }),
      // Volume modeste attendu (usage perso) : tous les pointages en un
      // appel, regroupés par objectif côté client — évite un aller-retour
      // par objectif.
      fetch(`${checkinsUrl}?select=*&order=date.asc`, { headers: dbHeaders() }),
    ]);
    if (!objectivesRes.ok) return new Response(await objectivesRes.text(), { status: objectivesRes.status, headers: CORS });
    if (!checkinsRes.ok) return new Response(await checkinsRes.text(), { status: checkinsRes.status, headers: CORS });
    const objectives = await objectivesRes.json();
    const checkins = await checkinsRes.json();
    return new Response(JSON.stringify({ objectives, checkins }), {
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400, headers: CORS });
  }
  const { action } = body;

  if (action === "create-objective") {
    const { project, title, start_date, target_per_week, end_date } = body;
    if (!project || !title || !start_date) {
      return new Response("Missing project/title/start_date", { status: 400, headers: CORS });
    }
    const res = await fetch(objectivesUrl, {
      method: "POST",
      headers: dbHeaders({ prefer: "return=representation" }),
      body: JSON.stringify({
        project,
        title,
        start_date,
        end_date: end_date || null,
        target_per_week: target_per_week || 6,
      }),
    });
    if (!res.ok) return new Response(await res.text(), { status: res.status, headers: CORS });
    const [objective] = await res.json();
    return new Response(JSON.stringify({ objective }), { headers: { ...CORS, "content-type": "application/json" } });
  }

  if (action === "update-objective") {
    const { id, ...fields } = body;
    delete fields.action;
    if (!id) return new Response("Missing id", { status: 400, headers: CORS });
    const res = await fetch(`${objectivesUrl}?id=eq.${id}`, {
      method: "PATCH",
      headers: dbHeaders({ prefer: "return=representation" }),
      body: JSON.stringify(fields),
    });
    if (!res.ok) return new Response(await res.text(), { status: res.status, headers: CORS });
    const [objective] = await res.json();
    return new Response(JSON.stringify({ objective }), { headers: { ...CORS, "content-type": "application/json" } });
  }

  if (action === "delete-objective") {
    const { id } = body;
    if (!id) return new Response("Missing id", { status: 400, headers: CORS });
    // ON DELETE CASCADE (objectives.sql) supprime les pointages liés.
    const res = await fetch(`${objectivesUrl}?id=eq.${id}`, { method: "DELETE", headers: dbHeaders() });
    if (!res.ok) return new Response(await res.text(), { status: res.status, headers: CORS });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, "content-type": "application/json" } });
  }

  if (action === "checkin") {
    const { objective_id, date, note } = body;
    if (!objective_id || !date) return new Response("Missing objective_id/date", { status: 400, headers: CORS });
    // upsert : re-pointer le même jour met juste à jour la note au lieu
    // d'échouer sur la contrainte unique (objective_id, date).
    const res = await fetch(`${checkinsUrl}?on_conflict=objective_id,date`, {
      method: "POST",
      headers: dbHeaders({ prefer: "resolution=merge-duplicates,return=representation" }),
      body: JSON.stringify([{ objective_id, date, note: note || null }]),
    });
    if (!res.ok) return new Response(await res.text(), { status: res.status, headers: CORS });
    const [checkin] = await res.json();
    return new Response(JSON.stringify({ checkin }), { headers: { ...CORS, "content-type": "application/json" } });
  }

  if (action === "uncheckin") {
    const { objective_id, date } = body;
    if (!objective_id || !date) return new Response("Missing objective_id/date", { status: 400, headers: CORS });
    const res = await fetch(`${checkinsUrl}?objective_id=eq.${objective_id}&date=eq.${date}`, {
      method: "DELETE",
      headers: dbHeaders(),
    });
    if (!res.ok) return new Response(await res.text(), { status: res.status, headers: CORS });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, "content-type": "application/json" } });
  }

  return new Response("Unknown action", { status: 400, headers: CORS });
});
