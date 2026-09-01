// Studio Jannah — admin-veille
// Récupère un flux RSS et upsert les N derniers articles dans veille_rss
// (voir supabase/veille_rss.sql), pour alimenter le pipeline éditorial
// (AGENTS.md) — étape amont, avant Research/GEO-SEO/Publish.
//
// Même pattern que admin-leads : vérifie le JWT envoyé par le front (session
// Supabase de l'admin unique), puis agit avec le service_role (bypass RLS) —
// pas de policy RLS supplémentaire nécessaire, la protection est ici.
//
// Pas de types TypeScript imbriqués ici — même raison que admin-leads
// (l'éditeur inline du Dashboard Supabase bute dessus). JS pur.

import { XMLParser } from "npm:fast-xml-parser@4.5.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
// searchengineland.com/feed bloque en 403 l'IP des Supabase Edge Functions
// (Cloudflare) — testé sans issue via headers/proxies, voir docs/VEILLE_RSS.md.
// searchenginejournal.com passe sans souci et couvre le même sujet.
const DEFAULT_FEED_URL = "https://www.searchenginejournal.com/feed/";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// htmlEntities: true — beaucoup de flux WordPress (dont searchenginejournal)
// posent des entités numériques (&#038;, &#8220;) dans les titres ; sans ce
// flag, fast-xml-parser ne décode que les 5 entités XML de base et les
// laisse telles quelles.
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  htmlEntities: true,
});

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

// Un flux peut poser un titre/résumé en texte brut, en CDATA, ou avec du
// balisage mixte — fast-xml-parser expose alors { "#text": "..." } au lieu
// d'une string simple.
function textOf(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object" && typeof value["#text"] === "string") return value["#text"];
  return "";
}

// RSS 2.0 : <link>https://...</link> (string). Atom : un ou plusieurs
// <link href="..." rel="..."/> (objet ou tableau) — on préfère rel=alternate
// (ou le premier lien) et son attribut href.
function linkOf(raw) {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    const preferred = raw.find((l) => !l["@_rel"] || l["@_rel"] === "alternate") || raw[0];
    return preferred ? String(preferred["@_href"] || "") : "";
  }
  if (raw && typeof raw === "object") return String(raw["@_href"] || textOf(raw) || "");
  return "";
}

function sourceLabelFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").split(".")[0] || "rss";
  } catch {
    return "rss";
  }
}

function parseFeed(xml, sourceLabel) {
  const doc = xmlParser.parse(xml);
  const channel = doc.rss?.channel ?? doc.feed; // RSS 2.0 vs Atom
  const raw = channel?.item ?? channel?.entry ?? [];
  const rawItems = Array.isArray(raw) ? raw : [raw].filter(Boolean);

  return rawItems
    .map((item) => {
      const title = textOf(item.title);
      const link = linkOf(item.link);
      const summary = textOf(item.description ?? item.summary ?? item["content:encoded"] ?? item.content);
      const pub = textOf(item.pubDate ?? item.published ?? item.updated);
      const publishedAt = pub ? new Date(pub) : null;
      return {
        source: sourceLabel,
        title,
        link,
        summary: summary ? summary.slice(0, 2000) : null,
        published_at: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt.toISOString() : null,
      };
    })
    .filter((item) => item.title && item.link);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const user = await requireUser(req);
  if (!user) return new Response("Unauthorized", { status: 401, headers: CORS });

  const rest = `${SUPABASE_URL}/rest/v1/veille_rss`;
  const dbHeaders = {
    apikey: SERVICE_ROLE_KEY,
    authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
  };

  if (req.method === "GET") {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const filter = status ? `&status=eq.${encodeURIComponent(status)}` : "";
    const res = await fetch(`${rest}?select=*&order=fetched_at.desc${filter}`, { headers: dbHeaders });
    if (!res.ok) return new Response(await res.text(), { status: res.status, headers: CORS });
    const items = await res.json();
    return new Response(JSON.stringify({ items }), { headers: { ...CORS, "content-type": "application/json" } });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const feedUrl = typeof body.source === "string" && body.source ? body.source : DEFAULT_FEED_URL;
    const count = Math.min(Math.max(parseInt(body.count, 10) || 10, 1), 50);

    let xml;
    try {
      // Un User-Agent trop générique (ou absent) se fait bloquer (403) par
      // certains flux (WAF/anti-bot) — celui d'un navigateur courant passe
      // partout testé jusqu'ici, y compris depuis l'IP des Edge Functions.
      // Un User-Agent générique se fait bloquer par certains flux (WAF/
      // anti-bot) — celui-ci passe partout testé sauf les flux avec une
      // protection Cloudflare avancée qui bloque l'IP des edge functions
      // elle-même, indépendamment du header (voir docs/VEILLE_RSS.md).
      const feedRes = await fetch(feedUrl, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          accept: "application/rss+xml, application/xml, text/xml, */*",
        },
      });
      if (!feedRes.ok) throw new Error(`Flux inaccessible (${feedRes.status})`);
      xml = await feedRes.text();
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e.message || e) }), {
        status: 502,
        headers: { ...CORS, "content-type": "application/json" },
      });
    }

    const items = parseFeed(xml, sourceLabelFromUrl(feedUrl)).slice(0, count);
    if (items.length === 0) {
      return new Response(JSON.stringify({ error: "Aucun article trouvé dans ce flux." }), {
        status: 422,
        headers: { ...CORS, "content-type": "application/json" },
      });
    }

    // Upsert dédupliqué sur `link` (contrainte unique de veille_rss) :
    // resolution=ignore-duplicates laisse intact un article déjà connu (son
    // status traite/ignore n'est jamais écrasé) et ne renvoie que les
    // lignes réellement insérées.
    const res = await fetch(`${rest}?on_conflict=link`, {
      method: "POST",
      headers: { ...dbHeaders, prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify(items),
    });
    if (!res.ok) return new Response(await res.text(), { status: res.status, headers: CORS });
    const inserted = await res.json();

    return new Response(JSON.stringify({ fetched: items.length, inserted: inserted.length }), {
      headers: { ...CORS, "content-type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405, headers: CORS });
});
