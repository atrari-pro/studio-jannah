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
 * Options : --logs <fichier> et --format json|md (json par défaut).
 * Les URLs restent obligatoires. JSON : objet pour une URL, tableau sinon.
 * Markdown : diagnostic français, priorités et statistiques des logs fournis.
 * Ajouts : checklist[].impact (high/medium/low), priorityFixList (fail et
 * non_determine avec recommendation), score pondéré 0-100 et scoreReason.
 * Score null si page inaccessible/challengée ; les indéterminés ne valent
 * aucun point et restent indéterminés. Le verdict historique est conservé.
 * --logs lit en streaming Apache/Nginx combined ou JSON Lines (user_agent
 * ou userAgent ; status/path/timestamp facultatifs). Échantillon : 100 lignes.
 * Format non reconnu ou erreur de lecture : avertissement stderr, option
 * ignorée, serverLogs null et serverLogsError explicite dans le rapport.
 * serverLogs : linesTotal/Parsed/Unparsed, byVendor (vendor, category, hits,
 * samplePaths max 5), topPaths (top 10 IA), statusBreakdown si disponible.
 * Les statistiques portent sur le fichier entier, pas sur chaque URL ; les
 * user-agents sont déclaratifs, sans authentification des bots. Métadonnées
 * inconnues : vendor = nom connu du bot, category = non_determine.
 * Sans --logs, serverLogs est null. Aucun message n'est envoyé à un prospect.
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

import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';

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

export async function auditUrl(url) {
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
    return scoreReport(report);
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

  return scoreReport(report);
}

// L'accès et les données transactionnelles bloquent une décision immédiate
// (3 points) ; identification/structure : 2 ; enrichissements : 1.
const PRIORITIES = new Map([
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
const WEIGHTS = { high: 3, medium: 2, low: 1 };

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
  return { ...report, checklist, priorityFixList, score, scoreReason, serverLogs: report.serverLogs ?? null };
}

export function parseLogLine(line) {
  try {
    const value = JSON.parse(line);
    const ua = value?.user_agent ?? value?.userAgent;
    if (typeof ua === 'string' && ua.trim()) {
      return { userAgent: ua, path: typeof value.path === 'string' ? value.path : undefined, status: value.status };
    }
  } catch { /* Essayer le format combined documenté. */ }
  const match = line.match(/^\S+ \S+ \S+ \[([^\]]+)\] "([^"\r\n]*)" (\d{3}) (?:\d+|-) "[^"\r\n]*" "([^"\r\n]+)"\s*$/);
  if (!match) return null;
  const request = match[2].match(/^\S+ (\S+) HTTP\/\d(?:\.\d)?$/);
  return { userAgent: match[4], status: match[3], path: request?.[1] };
}

const LOG_AGENTS = [...new Set([...AI_CRAWLER_USER_AGENTS, ...AGENT_TEST_USER_AGENTS.map((a) => a.name)])]
  .map((name) => ({ name, ...AGENT_TEST_USER_AGENTS.find((a) => a.name === name) }));

export async function analyzeLogLines(lines) {
  const result = { linesTotal: 0, linesParsed: 0, linesUnparsed: 0, byVendor: [], topPaths: [] };
  const vendors = new Map();
  const paths = new Map();
  const statuses = {};
  let hasStatus = false;
  for await (const line of lines) {
    result.linesTotal++;
    const entry = parseLogLine(line);
    if (!entry) result.linesUnparsed++;
    else {
      result.linesParsed++;
      const validStatus = /^[1-5]\d{2}$/.test(String(entry.status));
      if (validStatus) hasStatus = true;
      // Token boundaries avoid counting e.g. NotGPTBot as GPTBot.
      const tokens = entry.userAgent.toLowerCase().split(/[^a-z0-9-]+/);
      const agent = LOG_AGENTS.find((a) => tokens.includes(a.name.toLowerCase()));
      if (agent) {
        const vendor = agent.vendor ?? agent.name;
        const category = agent.category ?? 'non_determine';
        const key = `${vendor}:${category}`;
        if (!vendors.has(key)) vendors.set(key, { vendor, category, hits: 0, samplePaths: [] });
        const group = vendors.get(key);
        group.hits++;
        if (entry.path) {
          if (group.samplePaths.length < 5 && !group.samplePaths.includes(entry.path)) group.samplePaths.push(entry.path);
          paths.set(entry.path, (paths.get(entry.path) ?? 0) + 1);
        }
        if (validStatus) statuses[entry.status] = (statuses[entry.status] ?? 0) + 1;
      }
    }
    if (result.linesTotal === 100 && result.linesParsed === 0) {
      throw new Error('Format de logs non reconnu sur les 100 premières lignes : attendu combined Apache/Nginx ou JSON Lines avec user_agent/userAgent.');
    }
  }
  if (result.linesParsed === 0) throw new Error('Format de logs non reconnu ou fichier vide : attendu combined Apache/Nginx ou JSON Lines avec user_agent/userAgent.');
  result.byVendor = [...vendors.values()].sort((a, b) => b.hits - a.hits);
  result.topPaths = [...paths].map(([path, hits]) => ({ path, hits })).sort((a, b) => b.hits - a.hits).slice(0, 10);
  if (hasStatus) result.statusBreakdown = statuses;
  return result;
}

export async function analyzeLogFile(path) {
  const stream = createReadStream(path, { encoding: 'utf8' });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  try {
    return await analyzeLogLines(lines);
  } finally {
    lines.close();
    stream.destroy();
  }
}

const mdEscape = (value) => String(value).replace(/[\r\n]+/g, ' ').replace(/[\\`*_{}[\]()<>#!|]/g, '\\$&');

export function renderMarkdown(report) {
  const verdicts = {
    agent_ready: 'Tous les contrôles effectués sont satisfaits.',
    gaps_detected: 'Des écarts ont été détectés sur les contrôles effectués.',
    non_determine: 'Le diagnostic ne permet pas de conclure sur la préparation aux agents IA.',
  };
  const out = ['# Diagnostic d’accès aux agents IA', '', `URL : ${mdEscape(report.url)}`, '', verdicts[report.verdict], '',
    ...(report.score === null ? [] : [`Score : **${report.score}/100**`, '']), report.scoreReason, '', '## Actions prioritaires', ''];
  const labels = { high: 'Impact élevé', medium: 'Impact moyen', low: 'Impact faible' };
  for (const impact of Object.keys(labels)) {
    const fixes = report.priorityFixList.filter((c) => c.impact === impact);
    if (!fixes.length) continue;
    out.push(`### ${labels[impact]}`, '');
    for (const fix of fixes) out.push(`- **${mdEscape(fix.criterion)}** (${fix.status === 'fail' ? 'écart constaté' : 'non déterminé'}) : ${mdEscape(fix.recommendation)} Constat : ${mdEscape(fix.reason)}`);
    out.push('');
  }
  if (!report.priorityFixList.length) out.push('Aucune action issue des contrôles effectués.', '');
  if (report.serverLogsError) out.push('## Logs serveur', '', `Analyse indisponible — --logs ignoré : ${mdEscape(report.serverLogsError)}`, '');
  if (report.serverLogs) {
    const logs = report.serverLogs;
    out.push('## Logs serveur', '', 'Périmètre : fichier fourni entier, sans attribution à cette URL. User-agents déclarés, identité des bots non vérifiée.', '',
      `${logs.linesTotal} lignes ; ${logs.linesParsed} parsées ; ${logs.linesUnparsed} non parsées.`, '', '### Trafic IA par fournisseur et catégorie', '');
    for (const group of logs.byVendor) out.push(`- ${mdEscape(group.vendor)} / ${mdEscape(group.category)} : ${group.hits} requêtes ; chemins exemples : ${group.samplePaths.map(mdEscape).join(', ') || 'non renseignés'}.`);
    if (!logs.byVendor.length) out.push('Aucun user-agent IA connu trouvé dans les lignes parsées.');
    out.push('', '### Chemins les plus demandés par les bots IA', '');
    for (const entry of logs.topPaths) out.push(`- ${mdEscape(entry.path)} : ${entry.hits}`);
    if (!logs.topPaths.length) out.push('Aucun chemin IA disponible.');
    out.push('', '### Statuts HTTP des requêtes IA', '');
    if (logs.statusBreakdown) {
      for (const [status, hits] of Object.entries(logs.statusBreakdown)) out.push(`- ${status} : ${hits}`);
      if (!Object.keys(logs.statusBreakdown).length) out.push('Aucun statut disponible pour les requêtes IA reconnues.');
    } else out.push('Statuts non renseignés dans les lignes parsées.');
  }
  return out.join('\n');
}

export function parseArgs(args) {
  const options = { urls: [], format: 'json', logs: null };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--logs' || arg === '--format') {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error(`Valeur manquante pour ${arg}.`);
      options[arg.slice(2)] = value;
    } else if (arg.startsWith('-')) throw new Error(`Option inconnue : ${arg}`);
    else {
      const url = new URL(arg);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('URL HTTP(S) obligatoire.');
      options.urls.push(arg);
    }
  }
  if (!['json', 'md'].includes(options.format)) throw new Error('--format doit être json ou md.');
  if (!options.urls.length) throw new Error('Usage: node scripts/agent-readiness-check.mjs <url> [url2 ...] [--logs fichier] [--format json|md]');
  return options;
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  let serverLogs = null;
  let serverLogsError;
  if (options.logs) {
    try { serverLogs = await analyzeLogFile(options.logs); }
    catch (error) {
      serverLogsError = error.message;
      console.error(`--logs ignoré : ${serverLogsError}`);
    }
  }
  const reports = [];
  for (const url of options.urls) {
    const report = await auditUrl(url);
    report.serverLogs = serverLogs;
    if (serverLogsError) report.serverLogsError = serverLogsError;
    reports.push(report);
  }
  console.log(options.format === 'md'
    ? reports.map(renderMarkdown).join('\n\n---\n\n')
    : JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
