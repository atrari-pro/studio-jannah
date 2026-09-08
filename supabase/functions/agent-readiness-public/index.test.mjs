import test from 'node:test';
import assert from 'node:assert/strict';
// Node 22.23 sait importer ce .ts qui contient exclusivement du JS.
// Si le runner isolé ne détaille que le fichier dans cet environnement :
// node --test --experimental-test-isolation=none supabase/functions/agent-readiness-public/index.test.mjs
import { validateTargetUrl, isRateLimited, scoreReport, auditUrl, fetchText,
  testAgentAccess, AGENT_TEST_USER_AGENTS, PRIORITIES, extractJsonLd, flattenGraph,
  findType, checkRobots, reserveRequest, handleRequest } from './index.ts';

const html = (body = '<h1>Page publique</h1>', status = 200) => new Response(body, { status, headers: { 'content-type': 'text/html' } });
const fixture = async (url) => url.endsWith('/robots.txt') ? new Response('User-agent: *\nAllow: /')
  : url.endsWith('/llms.txt') ? new Response('', { status: 404 }) : html();
const config = { supabaseUrl: 'https://project.supabase.co', serviceRoleKey: 'test-key', now: Date.parse('2026-09-08T12:00:00Z') };
const request = (url = 'https://example.com/') => new Request('https://edge.example.com', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.5, 1.1.1.1' }, body: JSON.stringify({ url }) });

for (const url of ['http://localhost', 'http://localhost.', 'http://sub.localhost', 'http://intranet', 'http://intranet.',
  'http://127.0.0.1', 'http://127.4.5.6', 'http://2130706433', 'http://0x7f000001', 'http://10.1.2.3',
  'http://172.16.0.1', 'http://172.31.255.255', 'http://192.168.1.1', 'http://169.254.169.254', 'http://0.0.0.0',
  'http://[::1]', 'http://[::]', 'http://[fc00::1]', 'http://[fd00::1]', 'http://[fe80::1]', 'http://[febf::1]',
  'http://[::ffff:127.0.0.1]', 'http://100.64.0.1', 'ftp://example.com', '/relative', 'https://user:pass@example.com',
  'https://example.com:8080', 'http://224.0.0.1', 'https://example.com/' + 'a'.repeat(2000)]) {
  test(`rejette ${url.slice(0, 80)}`, () => assert.throws(() => validateTargetUrl(url)));
}
test('accepte et normalise une URL publique', () => {
  assert.equal(validateTargetUrl('https://example.com/a#b'), 'https://example.com/a');
  assert.equal(validateTargetUrl('http://172.32.0.1'), 'http://172.32.0.1/');
  assert.equal(validateTargetUrl('https://[2606:4700:4700::1111]'), 'https://[2606:4700:4700::1111]/');
});
test('seuil 8 et compteur invalide', () => {
  for (const n of [0, 1, 7]) assert.equal(isRateLimited(n), false);
  for (const n of [8, 9, 100]) assert.equal(isRateLimited(n), true);
  assert.throws(() => isRateLimited(NaN));
});
test('REST compte la bonne IP dans la fenêtre puis insère', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return options.method === 'HEAD' ? new Response(null, { headers: { 'content-range': '0-6/7' } }) : new Response(null, { status: 201 });
  };
  assert.equal(await reserveRequest('203.0.113.5', 'https://example.com/', { ...config, fetchImpl }), true);
  assert.equal(calls.length, 2);
  const query = new URL(calls[0].url).searchParams;
  assert.equal(query.get('requester_ip'), 'eq.203.0.113.5');
  assert.equal(query.get('created_at'), 'gte.2026-09-08T11:50:00.000Z');
  assert.equal(calls[0].options.headers.authorization, 'Bearer test-key');
  assert.equal(calls[0].options.headers.apikey, 'test-key');
  assert.deepEqual(JSON.parse(calls[1].options.body), { requester_ip: '203.0.113.5', target_url: 'https://example.com/' });
});
test('429 sans insertion ni audit au seuil', async () => {
  let calls = 0;
  const res = await handleRequest(request(), { ...config, fetchImpl: async (_, opts) => {
    calls++; assert.equal(opts.method, 'HEAD');
    return new Response(null, { headers: { 'content-range': '*/8' } });
  }, auditFetch: () => assert.fail('audit interdit') });
  assert.equal(res.status, 429); assert.equal(calls, 1);
  assert.match((await res.json()).error, /Trop de tests/);
});
test('erreur compteur ou insertion ferme accès sans score', async () => {
  for (const mode of ['http', 'count', 'insert']) {
    const res = await handleRequest(request(), { ...config, fetchImpl: async (_, opts) => {
      if (mode === 'http' || opts.method === 'POST') return new Response(null, { status: 500 });
      return new Response(null, { headers: mode === 'count' ? {} : { 'content-range': '*/0' } });
    }, auditFetch: () => assert.fail('audit interdit') });
    assert.equal(res.status, 500);
    assert.equal((await res.json()).score, undefined);
  }
});
test('POST valide : première IP, insertion puis audit sans secrets dans résultat', async () => {
  let reserved = false;
  const res = await handleRequest(request(), { ...config, fetchImpl: async (url, opts) => {
    if (opts.method === 'HEAD') {
      assert.equal(new URL(url).searchParams.get('requester_ip'), 'eq.203.0.113.5');
      return new Response(null, { headers: { 'content-range': '*/0' } });
    }
    reserved = true; return new Response(null, { status: 201 });
  }, auditFetch: async (url, opts) => { assert.equal(reserved, true); assert.equal(opts.headers.apikey, undefined); return fixture(url); } });
  assert.equal(res.status, 200);
  const report = await res.json(); assert.equal(typeof report.score, 'number');
  assert.equal('serverLogs' in report, false); assert.equal('serverLogsError' in report, false);
});
test('CORS, méthodes et 400 avant tout fetch', async () => {
  const deps = { fetchImpl: () => assert.fail('réseau interdit') };
  const options = await handleRequest(new Request('https://edge.example.com', { method: 'OPTIONS' }), deps);
  assert.equal(options.status, 200); assert.equal(options.headers.get('access-control-allow-origin'), '*');
  assert.match(options.headers.get('access-control-allow-headers'), /apikey/);
  assert.equal((await handleRequest(new Request('https://edge.example.com'), deps)).status, 405);
  assert.equal((await handleRequest(request('http://localhost'), deps)).status, 400);
  assert.equal((await handleRequest(new Request('https://edge.example.com', { method: 'POST', body: '{' }), deps)).status, 400);
});
test('scoring exact pondéré et priorités triées', () => {
  const keys = [...PRIORITIES.keys()];
  const report = scoreReport({ fetch: { ok: true }, checklist: [
    { criterion: keys[7], status: 'fail' }, // low
    { criterion: keys[0], status: 'pass' }, // high
    { criterion: keys[4], status: 'non_determine' }, // medium
  ] });
  assert.equal(report.score, 50);
  assert.deepEqual(report.priorityFixList.map(c => c.impact), ['medium', 'low']);
  assert.equal(report.priorityFixList[0].status, 'non_determine');
});
test('pas de score si contenu inaccessible, vide, non HTML, challenge ou panne', async () => {
  for (const response of [() => html('', 403), () => html('Just a moment'), () => html(''),
    () => new Response('%PDF'), () => { throw new Error('network'); }]) {
    const report = await auditUrl('https://example.com', async () => response());
    assert.equal(report.score, null); assert.equal(report.verdict, 'non_determine');
    assert.equal(report.checklist[0].status, 'non_determine');
    assert.match(report.scoreReason, /non lu/);
  }
});
test('six agents démarrent en parallèle', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const agents = [];
  const pending = testAgentAccess('https://example.com', async (_, options) => {
    agents.push(options.headers['User-Agent']); await gate; return html();
  });
  assert.deepEqual(agents, AGENT_TEST_USER_AGENTS.map(a => a.ua));
  release(); assert.equal((await pending).length, 6);
});
test('redirection privée refusée sans fetch privé', async () => {
  let calls = 0;
  const result = await fetchText('https://example.com', {}, async (_, options) => {
    calls++; assert.equal(options.redirect, 'manual');
    return new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/latest' } });
  });
  assert.equal(calls, 1); assert.equal(result.ok, false);
});
test('redirections publiques et taille bornées', async () => {
  let calls = 0;
  const res = await fetchText('https://example.com', {}, async () => {
    calls++; return new Response(null, { status: 302, headers: { location: '/loop' } });
  });
  assert.equal(calls, 4); assert.equal(res.ok, false);
  assert.equal((await fetchText('https://example.com', {}, async () => html('a'.repeat(2_000_001)))).ok, false);
});
test('JSON-LD tableaux, graph, null et erreur de parsing', async () => {
  const blocks = extractJsonLd('<script type="application/ld+json">null</script><script type="application/ld+json">bad</script><script type="application/ld+json">[{"@type":"Product"}]</script>');
  assert.ok(findType(flattenGraph(blocks), 'Product'));
  assert.ok(findType(flattenGraph([{ '@graph': [{ '@type': ['Thing', 'Product'] }] }]), 'Product'));
  const report = await auditUrl('https://example.com', async url => url.endsWith('.txt') ? fixture(url) : html('<script type="application/ld+json">null</script>'));
  assert.equal(typeof report.score, 'number');
  assert.deepEqual(checkRobots('User-agent: GPTBot\nDisallow: /').blockedAiCrawlers, ['GPTBot']);
});
test('produit complet : score 100 et aucune action', async () => {
  const product = { '@type': 'Product', gtin13: '123', brand: 'Exemple fictif', aggregateRating: {}, offers: { price: '20', availability: 'https://schema.org/InStock', hasMerchantReturnPolicy: {} } };
  const report = await auditUrl('https://example.com', async url => url.endsWith('/robots.txt') ? new Response('User-agent: *\nAllow: /')
    : url.endsWith('/llms.txt') ? new Response('# Guide') : html(`<script type="application/ld+json">${JSON.stringify(product)}</script>`));
  assert.equal(report.score, 100); assert.equal(report.verdict, 'agent_ready'); assert.deepEqual(report.priorityFixList, []);
});
