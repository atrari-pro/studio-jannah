#!/usr/bin/env node
/**
 * Audit "agent-ready" : est-ce qu'une page produit (ou n'importe quelle
 * page) est lisible par un agent IA acheteur/chercheur (ChatGPT, Perplexity,
 * Claude, Google AI Mode) — pas par un humain.
 *
 * Volontairement PAS un scan headless (Playwright) : un simple fetch HTTP,
 * exactement ce qu'un crawler IA fait lui-même (GPTBot/ClaudeBot/
 * PerplexityBot n'exécutent pas le JavaScript). Ça évite le problème
 * rencontré sur apps/tracking-score : aucun anti-bot à contourner puisqu'on
 * lit la même chose qu'un crawler légitime recevrait.
 *
 * Usage : node scripts/agent-readiness-check.mjs <url> [url2 ...]
 * Sortie : rapport JSON sur stdout (un objet par URL).
 *
 * Contrôles effectués, tous basés sur ce que le HTML brut expose réellement :
 *  1. robots.txt — autorise-t-il les crawlers IA connus ?
 *  2. llms.txt — présent ?
 *  3. JSON-LD dans le HTML brut — présent, parseable, contient un type
 *     Product/Offer (ou au minimum un type reconnu par schema.org) ?
 *  4. Champs à forte valeur de décision sur un Product : GTIN/MPN, prix,
 *     disponibilité, politique de retour, note agrégée.
 *  5. Statut HTTP de la requête elle-même — un blocage explicite (403, page
 *     de challenge) est signalé tel quel, jamais transformé en faux score.
 *  6. Accès réel par user-agent : la même URL répond-elle différemment à un
 *     navigateur classique et à un agent IA identifié ? C'est le contrôle
 *     pertinent pour la bascule Cloudflare du 15/09/2026 (blocage par défaut
 *     des crawlers catégorie "Agent"/"Training" sur pages avec pub) — voir
 *     docs/GROWTH_ROADMAP.md, palier M1. Chaîne de user-agent complète et
 *     réelle (pas juste le nom du bot) : un WAF filtre souvent sur la
 *     chaîne entière, pas sur un mot-clé.
 */

const AI_CRAWLER_USER_AGENTS = [
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
const AGENT_TEST_USER_AGENTS = [
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

function extractJsonLd(html) {
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

function flattenGraph(blocks) {
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

function findType(nodes, type) {
  return nodes.find((n) => {
    const t = n && n['@type'];
    if (!t) return false;
    return Array.isArray(t) ? t.includes(type) : t === type;
  });
}

async function fetchText(url, opts = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': BASELINE_USER_AGENT },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
      ...opts,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (e) {
    return { ok: false, status: null, text: '', error: e.message };
  }
}

/**
 * Compare, sur la même URL, la réponse à un navigateur classique et à
 * chaque agent IA identifié. Séquentiel et volontairement modeste en
 * nombre de requêtes (une par agent testé) — un diagnostic, pas un scan
 * à volume, on n'a pas à marteler le site cible pour avoir la preuve.
 */
async function testAgentAccess(url) {
  const results = [];
  for (const agent of AGENT_TEST_USER_AGENTS) {
    // eslint-disable-next-line no-await-in-loop
    const res = await fetchText(url, { headers: { 'User-Agent': agent.ua } });
    const challengeDetected = res.text ? CHALLENGE_SIGNATURES.some((re) => re.test(res.text)) : false;
    results.push({
      name: agent.name,
      vendor: agent.vendor,
      category: agent.category,
      status: res.status,
      ok: res.ok,
      challengeDetected,
      blocked: !res.ok || challengeDetected,
    });
  }
  return results;
}

function checkRobots(robotsTxt) {
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

async function auditUrl(url) {
  const origin = new URL(url).origin;
  const [page, robots, llms, agentAccess] = await Promise.all([
    fetchText(url),
    fetchText(`${origin}/robots.txt`),
    fetchText(`${origin}/llms.txt`),
    testAgentAccess(url),
  ]);

  const baselineBlocked = false; // page fetch ci-dessus utilise déjà BASELINE_USER_AGENT
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
      status: page.ok && blockedTotal === 0 ? 'pass' : blockedAgentCat > 0 ? 'fail' : 'non_determine',
      reason:
        blockedTotal === 0
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
    return report;
  }

  const blocks = extractJsonLd(page.text);
  const parseErrors = blocks.filter((b) => b.__parseError).length;
  const validBlocks = blocks.filter((b) => !b.__parseError);
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

  return report;
}

async function main() {
  const urls = process.argv.slice(2);
  if (urls.length === 0) {
    console.error('Usage: node scripts/agent-readiness-check.mjs <url> [url2 ...]');
    process.exit(1);
  }
  const reports = [];
  for (const url of urls) {
    // eslint-disable-next-line no-await-in-loop
    reports.push(await auditUrl(url));
  }
  console.log(JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2));
}

main();
