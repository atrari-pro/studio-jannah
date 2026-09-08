// Studio Jannah — diagnostic externe public, à coller tel quel dans le Dashboard.
// JS pur : aucune dépendance ni annotation TypeScript (cf. notify-lead).
// Port du script de feat/agent-readiness-scoring-logs : mêmes bots et scoring.
// Aucun accès aux logs serveur. Les user-agents sont déclaratifs, pas authentifiés.

export const AI_CRAWLER_USER_AGENTS = [
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'anthropic-ai',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'Amazonbot',
  'Bytespider',
  'CCBot',
];

// Chaînes complètes réelles (pas de placeholder inventé) — utilisées pour le
// test d'accès différencié, distinctes de la simple liste de noms ci-dessus
// utilisée pour lire robots.txt. Catégorie alignée sur la classification
// Cloudflare (Search / Agent / Training) : "agent" = récupération en temps
// réel pour le compte d'un utilisateur (la catégorie bloquée par défaut au
// même titre que "training" à partir du 15/09/2026, et celle qui porte le
// trafic à conversion élevée mesuré par Adobe).
export const AGENT_TEST_USER_AGENTS = [
  {
    name: 'GPTBot',
    vendor: 'OpenAI',
    category: 'training',
    ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
  },
  {
    name: 'ChatGPT-User',
    vendor: 'OpenAI',
    category: 'agent',
    ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
  },
  {
    name: 'ClaudeBot',
    vendor: 'Anthropic',
    category: 'training',
    ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  },
  {
    name: 'Claude-User',
    vendor: 'Anthropic',
    category: 'agent',
    ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)',
  },
  {
    name: 'PerplexityBot',
    vendor: 'Perplexity',
    category: 'search',
    ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
  },
  {
    name: 'Perplexity-User',
    vendor: 'Perplexity',
    category: 'agent',
    ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)',
  },
];

const BASELINE_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const CHALLENGE_SIGNATURES = [
  /just a moment/i,
  /checking your browser/i,
  /captcha-delivery\.com/i,
  /cloudflare.*challenge/i,
  /accès bloqué/i,
  /access denied/i,
];

export function extractJsonLd(html) {
  const blocks = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      blocks.push(parsed);
    } catch {
      blocks.push({ __parseError: true, raw: m[1].slice(0, 200) });
    }
  }
  return blocks;
}

export function flattenGraph(blocks) {
  const out = [];
  for (const b of blocks) {
    // Un bloc JSON-LD peut être : un objet, un tableau d'objets au premier
    // niveau (courant quand plusieurs entités partagent un même <script>),
    // ou un objet avec @graph. Les trois formes sont valides.
    if (Array.isArray(b)) out.push(...b);
    else if (b && Array.isArray(b['@graph'])) out.push(...b['@graph']);
    else out.push(b);
  }
  return out;
}

export function findType(nodes, type) {
  return nodes.find((n) => {
    const t = n && n['@type'];
    if (!t) return false;
    return Array.isArray(t) ? t.includes(type) : t === type;
  });
}

// SSRF best-effort : aucune résolution DNS, donc pas de garantie contre le
// DNS rebinding. Validation aussi à chaque saut ; ports web uniquement.
export function validateTargetUrl(value) {
  if (typeof value !== 'string' || value.length > 2000 || !/^https?:\/\//i.test(value)) throw new Error('URL invalide.');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) throw new Error('URL invalide.');
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (host.startsWith('[')) {
    // Bloquer aussi IPv4 mappée, adresses non spécifiées et transitions IPv6.
    const ip = host.slice(1, -1);
    if (!/^[23][0-9a-f]{3}:/.test(ip) || ip.startsWith('2001:') || ip.startsWith('2002:')) throw new Error('Adresse non publique.');
  } else {
    if (!host.includes('.') || /(^|\.)(localhost|local|internal|lan|home|test|invalid)$/.test(host)) throw new Error('Adresse non publique.');
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const [a, b] = host.split('.').map(Number);
      if (a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && [18, 19].includes(b))) throw new Error('Adresse non publique.');
    }
  }
  url.hash = '';
  if (url.href.length > 2000) throw new Error('URL trop longue.');
  return url.href;
}

export async function readLimitedText(response, limit = 2_000_000) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0, text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      size += value.byteLength;
      if (size > limit) throw new Error('Réponse trop volumineuse pour ce diagnostic.');
      text += decoder.decode(value, { stream: true });
    }
  } finally { await reader.cancel(); }
}

export async function fetchText(url, opts = {}, fetchImpl = fetch) {
  try {
    const signal = AbortSignal.timeout(15000);
    for (let hop = 0; hop <= 3; hop++) {
      url = validateTargetUrl(url);
      const res = await fetchImpl(url, {
        ...opts, headers: opts.headers ?? { 'User-Agent': BASELINE_USER_AGENT },
        redirect: 'manual', signal,
      });
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        await res.body?.cancel();
        const location = res.headers.get('location');
        if (!location || hop === 3) throw new Error('Redirection impossible ou trop nombreuse.');
        url = validateTargetUrl(new URL(location, url).href);
        continue;
      }
      const text = await readLimitedText(res);
      const contentType = res.headers.get('content-type') || '';
      return { ok: res.ok, status: res.status, text, contentType };
    }
  } catch (e) {
    return { ok: false, status: null, text: '', error: e.message };
  }
}

export async function testAgentAccess(url, fetchImpl = fetch) {
  // Six requêtes parallèles, contrairement au CLI : latence web réduite,
  // volume borné à une requête par agent (hors redirections limitées).
  return Promise.all(AGENT_TEST_USER_AGENTS.map(async (agent) => {
    const res = await fetchText(url, { headers: { 'User-Agent': agent.ua } }, fetchImpl);
    const challengeDetected = CHALLENGE_SIGNATURES.some((re) => re.test(res.text));
    return { name: agent.name, vendor: agent.vendor, category: agent.category,
      status: res.status, ok: res.ok, challengeDetected,
      blocked: !res.ok || challengeDetected };
  }));
}

export function checkRobots(robotsTxt) {
  if (!robotsTxt) return { present: false, blockedAiCrawlers: [] };
  const lines = robotsTxt.split('\n').map((l) => l.trim());
  const blocked = [];
  let currentAgents = [];
  for (const line of lines) {
    const uaMatch = line.match(/^user-agent:\s*(.+)$/i);
    const disallowMatch = line.match(/^disallow:\s*(.*)$/i);
    if (uaMatch) {
      currentAgents = [uaMatch[1].trim()];
    } else if (disallowMatch && disallowMatch[1].trim() === '/') {
      for (const agent of currentAgents) {
        const known = AI_CRAWLER_USER_AGENTS.find(
          (a) => a.toLowerCase() === agent.toLowerCase() || agent === '*',
        );
        if (known && !blocked.includes(known)) blocked.push(known);
        if (agent === '*') {
          // bloque tout par défaut, sauf règle spécifique plus permissive
          // trouvée ailleurs — on le signale tel quel, sans sur-interpréter.
          if (!blocked.includes('*')) blocked.push('*');
        }
      }
    }
  }
  return { present: true, blockedAiCrawlers: blocked };
}

export async function auditUrl(url, fetchImpl = fetch) {
  url = validateTargetUrl(url);
  const origin = new URL(url).origin;
  const [page, robots, llms, agentAccess] = await Promise.all([
    fetchText(url, {}, fetchImpl),
    fetchText(`${origin}/robots.txt`, {}, fetchImpl),
    fetchText(`${origin}/llms.txt`, {}, fetchImpl),
    testAgentAccess(url, fetchImpl),
  ]);

  // Un document vide ou non HTML ne permet pas d'évaluer son balisage.
  if (page.ok && (!page.text.trim() || !/(text\/html|application\/xhtml\+xml)/i.test(page.contentType))) {
    page.ok = false;
    page.error = 'Contenu HTML exploitable non reçu.';
  }
  const baselineBlocked = !page.ok || CHALLENGE_SIGNATURES.some((re) => re.test(page.text));
  const agentOnlyBlocked = agentAccess.filter((a) => a.blocked && !baselineBlocked);

  const report = {
    url,
    fetch: { status: page.status, ok: page.ok, error: page.error ?? null },
    challenge: {
      detected: page.text ? CHALLENGE_SIGNATURES.some((re) => re.test(page.text)) : false,
    },
    robotsTxt: { present: robots.ok, ...(robots.ok ? checkRobots(robots.text) : {}) },
    llmsTxt: { present: llms.ok },
    agentAccess: {
      baseline: { status: page.status, ok: page.ok },
      perAgent: agentAccess,
      blockedAgentCount: agentOnlyBlocked.length,
      blockedAgentCategoryCount: agentOnlyBlocked.filter((a) => a.category === 'agent').length,
    },
    jsonLd: { present: false, blocks: 0, parseErrors: 0, types: [] },
    product: null,
    checklist: [],
    verdict: null,
  };

  {
    const blockedAgentCat = report.agentAccess.blockedAgentCategoryCount;
    const blockedTotal = report.agentAccess.blockedAgentCount;
    report.checklist.push({
      criterion: "Accès identique pour un navigateur et un agent IA (catégorie 'agent' temps réel)",
      status: baselineBlocked ? 'non_determine' : blockedTotal === 0 ? 'pass' : blockedAgentCat > 0 ? 'fail' : 'non_determine',
      reason:
        baselineBlocked ? 'Comparaison impossible : contenu navigateur non accessible.' : blockedTotal === 0
          ? 'Aucune différence de traitement détectée entre navigateur et agents IA testés.'
          : `${blockedTotal}/${agentAccess.length} agent(s) testé(s) bloqué(s) ou challengé(s) alors que le navigateur passe — dont ${blockedAgentCat} en catégorie "agent" temps réel (${agentAccess.filter((a) => a.blocked).map((a) => a.name).join(', ')}).`,
    });
  }

  if (!page.ok || report.challenge.detected) {
    report.verdict = 'non_determine';
    report.checklist.push({
      criterion: 'Page accessible sans JavaScript',
      status: 'non_determine',
      reason: report.challenge.detected
        ? 'Page de challenge anti-bot détectée — contenu réel non reçu, audit impossible dans cet état.'
        : `Requête HTTP en échec (statut ${page.status ?? 'inconnu'}) — audit impossible.`,
    });
    return scoreReport(report);
  }

  const blocks = extractJsonLd(page.text);
  const parseErrors = blocks.filter((b) => b?.__parseError).length;
  const validBlocks = blocks.filter((b) => !b?.__parseError);
  const nodes = flattenGraph(validBlocks);
  const types = [...new Set(nodes.map((n) => n && n['@type']).filter(Boolean).flat())];

  report.jsonLd = {
    present: validBlocks.length > 0,
    blocks: validBlocks.length,
    parseErrors,
    types,
  };

  const product = findType(nodes, 'Product');
  if (product) {
    const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
    report.product = {
      hasGtinOrMpn: Boolean(product.gtin13 || product.gtin || product.gtin8 || product.gtin12 || product.mpn),
      hasBrand: Boolean(product.brand),
      hasAggregateRating: Boolean(product.aggregateRating),
      hasOffer: Boolean(offer),
      offerHasPrice: Boolean(offer && (offer.price || offer.priceSpecification)),
      offerHasAvailability: Boolean(offer && offer.availability),
      hasReturnPolicy: Boolean(product.hasMerchantReturnPolicy || (offer && offer.hasMerchantReturnPolicy)),
    };
  }

  const push = (criterion, status, reason) => report.checklist.push({ criterion, status, reason });

  push(
    'robots.txt autorise les crawlers IA connus',
    report.robotsTxt.present
      ? report.robotsTxt.blockedAiCrawlers.length === 0
        ? 'pass'
        : 'fail'
      : 'non_determine',
    report.robotsTxt.present
      ? report.robotsTxt.blockedAiCrawlers.length === 0
        ? 'Aucun crawler IA connu explicitement bloqué.'
        : `Bloqués explicitement : ${report.robotsTxt.blockedAiCrawlers.join(', ')}.`
      : "Pas de robots.txt trouvé — comportement par défaut du crawler, non déterminable ici.",
  );

  push(
    'llms.txt présent',
    report.llmsTxt.present ? 'pass' : 'fail',
    report.llmsTxt.present
      ? 'Fichier de découverte pour agents/LLM trouvé.'
      : "Aucun llms.txt — les agents doivent inférer le contenu du site sans guide dédié.",
  );

  push(
    'JSON-LD présent dans le HTML brut',
    report.jsonLd.present ? 'pass' : 'fail',
    report.jsonLd.present
      ? `${report.jsonLd.blocks} bloc(s) valide(s), type(s) : ${types.join(', ') || 'non identifié'}.`
      : 'Aucun JSON-LD détecté dans le HTML reçu sans exécution JS — invisible pour un crawler IA.',
  );

  if (product) {
    const p = report.product;
    push(
      'Type Product détecté',
      'pass',
      `Product trouvé${p.hasBrand ? ' avec marque' : ' sans marque déclarée'}.`,
    );
    push(
      'GTIN/MPN renseigné',
      p.hasGtinOrMpn ? 'pass' : 'fail',
      p.hasGtinOrMpn ? 'Identifiant produit standard présent.' : 'Ni GTIN ni MPN — champ à forte valeur de décision absent.',
    );
    push(
      'Offer avec prix et disponibilité',
      p.offerHasPrice && p.offerHasAvailability ? 'pass' : 'fail',
      `Prix : ${p.offerHasPrice ? 'présent' : 'absent'} — Disponibilité : ${p.offerHasAvailability ? 'présente' : 'absente'}.`,
    );
    push(
      'Avis agrégés (aggregateRating)',
      p.hasAggregateRating ? 'pass' : 'fail',
      p.hasAggregateRating ? 'Note agrégée présente.' : 'Pas de note agrégée dans le balisage.',
    );
    push(
      'Politique de retour balisée',
      p.hasReturnPolicy ? 'pass' : 'fail',
      p.hasReturnPolicy ? 'hasMerchantReturnPolicy présent.' : 'Pas de politique de retour structurée.',
    );
  } else if (report.jsonLd.present) {
    push(
      'Type Product détecté',
      'fail',
      `JSON-LD présent mais aucun type Product — type(s) trouvé(s) : ${types.join(', ') || 'aucun'}.`,
    );
  }

  const failed = report.checklist.filter((c) => c.status === 'fail').length;
  const nonDet = report.checklist.filter((c) => c.status === 'non_determine').length;
  report.verdict = failed === 0 && nonDet === 0 ? 'agent_ready' : failed > 0 ? 'gaps_detected' : 'non_determine';

  return scoreReport(report);
}

// L'accès et les données transactionnelles bloquent une décision immédiate
// (3 points) ; identification/structure : 2 ; enrichissements : 1.
export const PRIORITIES = new Map([
  ["Accès identique pour un navigateur et un agent IA (catégorie 'agent' temps réel)", ['high', 'Vérifier les réponses et les règles WAF avec le propriétaire, puis retester les agents temps réel autorisés.']],
  ['Page accessible sans JavaScript', ['high', 'Faire vérifier l’accès HTTP et les éventuels challenges par le propriétaire, puis relancer le diagnostic sans contournement.']],
  ['Offer avec prix et disponibilité', ['high', 'Renseigner price, priceCurrency et availability dans le bloc Offer du Product avec les valeurs réelles.']],
  ['robots.txt autorise les crawlers IA connus', ['medium', 'Examiner les règles robots.txt et autoriser les crawlers souhaités selon la politique du propriétaire.']],
  ['JSON-LD présent dans le HTML brut', ['medium', 'Ajouter un bloc JSON-LD valide adapté au contenu dans le HTML servi sans JavaScript.']],
  ['Type Product détecté', ['medium', 'Si cette page décrit un produit, ajouter un bloc Product JSON-LD ; sinon faire confirmer la non-applicabilité de ce contrôle.']],
  ['GTIN/MPN renseigné', ['medium', 'Ajouter gtin13 ou mpn au bloc Product JSON-LD à partir des références réelles du catalogue.']],
  ['llms.txt présent', ['low', 'Envisager un llms.txt listant les pages utiles, puis vérifier sa disponibilité HTTP sans présumer de son adoption par les agents.']],
  ['Avis agrégés (aggregateRating)', ['low', 'Baliser avec aggregateRating les avis authentiques affichés sur la page, uniquement si de tels avis existent.']],
  ['Politique de retour balisée', ['low', 'Ajouter hasMerchantReturnPolicy au Product ou à son Offer en reprenant la politique de retour réelle.']],
]);
export const WEIGHTS = { high: 3, medium: 2, low: 1 };

export function scoreReport(report) {
  const checklist = report.checklist.map((item) => {
    const config = PRIORITIES.get(item.criterion);
    if (!config) throw new Error(`Critère sans priorité définie : ${item.criterion}`);
    return { ...item, impact: config[0] };
  });
  const priorityFixList = checklist
    .filter((item) => item.status === 'fail' || item.status === 'non_determine')
    .map((item) => ({ ...item, recommendation: PRIORITIES.get(item.criterion)[1] }))
    .sort((a, b) => WEIGHTS[b.impact] - WEIGHTS[a.impact]);
  // Score de conformité observée = arrondi(100 × poids des pass / poids de
  // TOUS les critères présents). fail et non_determine = 0 point, sans
  // convertir un statut indéterminé en échec ni exclure son poids du total.
  // Ce score ne prédit ni conversion ni trafic et n'est pas comparable entre
  // pages dont les contrôles applicables diffèrent. Aucun score sans contenu.
  const total = checklist.reduce((sum, c) => sum + WEIGHTS[c.impact], 0);
  const passed = checklist.reduce((sum, c) => sum + (c.status === 'pass' ? WEIGHTS[c.impact] : 0), 0);
  const unreadable = report.fetch?.ok === false || report.challenge?.detected;
  const score = unreadable || !total ? null : Math.round(100 * passed / total);
  const scoreReason = unreadable
    ? 'Score indisponible : page inaccessible ou challenge anti-bot, contenu réel non lu.'
    : !total ? 'Score indisponible : aucun critère évalué.'
      : 'Conformité observée pondérée (high=3, medium=2, low=1) ; les critères indéterminés ne rapportent aucun point, sans être validés.';
  return { ...report, checklist, priorityFixList, score, scoreReason };
}

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function isRateLimited(count) {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Compteur indisponible.');
  return count >= 8;
}

export async function reserveRequest(ip, url, { supabaseUrl, serviceRoleKey, fetchImpl = fetch, now = Date.now() }) {
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Configuration indisponible.');
  const rest = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/agent_readiness_requests`;
  const dbHeaders = { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, 'content-type': 'application/json' };
  const query = new URLSearchParams({ select: 'id', requester_ip: `eq.${ip}`, created_at: `gte.${new Date(now - 600_000).toISOString()}` });
  const response = await fetchImpl(`${rest}?${query}`, {
    method: 'HEAD', headers: { ...dbHeaders, prefer: 'count=exact' }, signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Compteur indisponible.');
  const count = response.headers.get('content-range')?.match(/\/(\d+)$/)?.[1];
  if (count === undefined) throw new Error('Compteur indisponible.');
  if (isRateLimited(Number(count))) return false;
  // Lecture puis insertion REST conformément au brief : non atomique entre
  // plusieurs instances simultanées. L'IP dépend du header fourni par la gateway.
  // En cas de panne, on ferme l'accès au lieu de lancer un audit non comptabilisé.
  const inserted = await fetchImpl(rest, {
    method: 'POST', headers: { ...dbHeaders, prefer: 'return=minimal' },
    body: JSON.stringify({ requester_ip: ip, target_url: url }), signal: AbortSignal.timeout(10000),
  });
  if (!inserted.ok) throw new Error('Compteur indisponible.');
  return true;
}

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export async function handleRequest(req, deps = {}) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return jsonResponse({ error: 'Méthode non autorisée.' }, 405);
  let url;
  try {
    const body = JSON.parse(await readLimitedText(req, 8192));
    url = validateTargetUrl(body?.url);
  } catch { return jsonResponse({ error: 'URL invalide : indiquez une URL publique HTTP ou HTTPS.' }, 400); }
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    if (!await reserveRequest(ip, url, deps)) return jsonResponse({ error: 'Trop de tests, réessayez dans quelques minutes.' }, 429);
    return jsonResponse(await auditUrl(url, deps.auditFetch ?? deps.fetchImpl ?? fetch));
  } catch {
    return jsonResponse({ error: 'Diagnostic indisponible pour le moment. Réessayez dans quelques minutes.' }, 500);
  }
}

// Seul point d'entrée Deno ; importer ce fichier depuis Node ne lance rien.
if (typeof Deno !== 'undefined') {
  Deno.serve((req) => handleRequest(req, {
    supabaseUrl: Deno.env.get('SUPABASE_URL') ?? '',
    serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  }));
}
