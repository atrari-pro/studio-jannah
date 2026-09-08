import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scoreReport, parseLogLine, analyzeLogLines, analyzeLogFile, auditUrl, parseArgs, renderMarkdown, main } from './agent-readiness-check.mjs';

const item = (criterion, status) => ({ criterion, status, reason: 'Observation du test.' });
const fixture = () => ({ url: 'https://example.test/product', fetch: { ok: true }, challenge: { detected: false }, verdict: 'gaps_detected', checklist: [
  item('llms.txt présent', 'fail'),
  item('GTIN/MPN renseigné', 'non_determine'),
  item('Offer avec prix et disponibilité', 'fail'),
  item('JSON-LD présent dans le HTML brut', 'pass'),
] });
const combined = (ua, path = '/product', status = 200) => `127.0.0.1 - - [08/Sep/2026:12:00:00 +0200] "GET ${path} HTTP/1.1" ${status} 123 "-" "${ua}"`;

test('score pondéré et priorités, sans mutation ni validation des indéterminés', () => {
  const input = fixture();
  const result = scoreReport(input);
  assert.equal(result.score, 25); // 2 / (1+2+3+2), et non 1/3 connus
  assert.deepEqual(result.priorityFixList.map((c) => c.impact), ['high', 'medium', 'low']);
  assert.equal(result.priorityFixList[1].status, 'non_determine');
  assert.match(result.priorityFixList[1].recommendation, /Ajouter gtin13 ou mpn/);
  assert.equal(input.checklist[0].impact, undefined);
  assert.equal(result.verdict, input.verdict);
});

test('score null pour échec réseau, refus HTTP ou challenge', () => {
  for (const fields of [ { fetch: { ok: false, status: null } }, { fetch: { ok: false, status: 403 } }, { challenge: { detected: true } } ]) {
    const result = scoreReport({ ...fixture(), ...fields, verdict: 'non_determine' });
    assert.equal(result.score, null);
    assert.match(result.scoreReason, /contenu réel non lu/);
    assert.doesNotMatch(renderMarkdown(result), /\d+\/100/);
  }
});

test('scores bornés, checklist vide et indéterminée', () => {
  assert.equal(scoreReport({ ...fixture(), checklist: [] }).score, null);
  for (const [status, expected] of [['pass', 100], ['fail', 0], ['non_determine', 0]]) {
    assert.equal(scoreReport({ ...fixture(), checklist: [item('llms.txt présent', status)] }).score, expected);
  }
});

test('combined : bots, humains et ligne malformée', async () => {
  const result = await analyzeLogLines([combined('GPTBot/1.2'), combined('Mozilla/5.0'), 'invalide']);
  assert.equal(result.linesTotal, 3);
  assert.equal(result.linesParsed, 2);
  assert.equal(result.linesUnparsed, 1);
  assert.deepEqual(result.byVendor, [{ vendor: 'OpenAI', category: 'training', hits: 1, samplePaths: ['/product'] }]);
  assert.deepEqual(result.topPaths, [{ path: '/product', hits: 1 }]);
  assert.deepEqual(result.statusBreakdown, { 200: 1 });
});

test('JSON Lines : alias UA et champs facultatifs', async () => {
  const result = await analyzeLogLines([
    JSON.stringify({ user_agent: 'GPTBot/1.2', path: '/a', status: 403 }),
    JSON.stringify({ userAgent: 'ChatGPT-User/1.0' }),
    JSON.stringify({ user_agent: 'Mozilla/5.0' }),
    '{}', '{',
  ]);
  assert.equal(result.linesParsed, 3);
  assert.equal(result.linesUnparsed, 2);
  assert.equal(result.byVendor.length, 2);
  assert.equal(result.byVendor[1].category, 'agent');
  assert.deepEqual(result.byVendor[1].samplePaths, []);
  assert.deepEqual(result.statusBreakdown, { 403: 1 });
  const missing = await analyzeLogLines(['{"userAgent":"Claude-User/1.0","path":42,"status":"bad"}']);
  assert.equal(missing.byVendor[0].vendor, 'Anthropic');
  assert.equal('statusBreakdown' in missing, false);
});

test('reconnaît la liste existante sans inventer les métadonnées ni matcher les sous-chaînes', async () => {
  const result = await analyzeLogLines(['{"userAgent":"Amazonbot/1.0"}', '{"userAgent":"NotGPTBot/1.0"}']);
  assert.deepEqual(result.byVendor, [{ vendor: 'Amazonbot', category: 'non_determine', hits: 1, samplePaths: [] }]);
  assert.equal(parseLogLine('null'), null);
});

test('limites des chemins, classement et agrégation', async () => {
  const lines = Array.from({ length: 12 }, (_, i) => combined('GPTBot/1.2', `/p${i}`));
  lines.push(combined('Claude-User/1.0', '/p11'), combined('GPTBot/1.2', '/p11'));
  const result = await analyzeLogLines(lines);
  assert.equal(result.byVendor[0].samplePaths.length, 5);
  assert.equal(result.topPaths.length, 10);
  assert.deepEqual(result.topPaths[0], { path: '/p11', hits: 3 });
});

test('streaming fichier combined, JSONL, inconnu, vide et introuvable', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'agent-readiness-'));
  try {
    const path = join(dir, 'access.log');
    for (const content of [combined('GPTBot/1.2') + '\r\n', '{"user_agent":"GPTBot/1.2"}\n']) {
      await writeFile(path, content);
      assert.equal((await analyzeLogFile(path)).linesParsed, 1);
    }
    for (const content of ['format inconnu\nencore inconnu', '']) {
      await writeFile(path, content);
      await assert.rejects(analyzeLogFile(path), /Format de logs non reconnu/);
    }
    await assert.rejects(analyzeLogFile(join(dir, 'absent')), /ENOENT/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('format inconnu sur échantillon : arrêt après 100 lignes', async () => {
  let count = 0;
  async function* lines() { while (count < 101) { count++; yield 'invalide'; } }
  await assert.rejects(analyzeLogLines(lines()), /100 premières lignes/);
  assert.equal(count, 100);
});

test('rapport réel construit avec fetch simulé : clés historiques et JSON par défaut', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url) => new Response(String(url).endsWith('robots.txt') ? 'User-agent: *\nAllow: /' : '<html><script type="application/ld+json">{"@type":"Product","offers":{"price":10,"availability":"InStock"}}</script></html>'));
  const report = await auditUrl('https://example.test/product');
  for (const key of ['url', 'fetch', 'challenge', 'robotsTxt', 'llmsTxt', 'agentAccess', 'jsonLd', 'product', 'checklist', 'verdict']) assert.ok(key in report, key);
  assert.equal(report.serverLogs, null);
  assert.equal(report.verdict, 'gaps_detected');
  assert.ok(report.checklist.every((c) => c.impact));
  const output = [];
  t.mock.method(console, 'log', (value) => output.push(value));
  await main(['https://example.test/product']);
  assert.deepEqual(JSON.parse(output[0]), report);
  await main(['https://example.test/product', 'https://example.test/second']);
  assert.equal(JSON.parse(output[1]).length, 2);
});

test('CLI logs invalides : avertissement et absence explicite de mesure', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('Just a moment'));
  const errors = [], output = [];
  t.mock.method(console, 'error', (value) => errors.push(value));
  t.mock.method(console, 'log', (value) => output.push(value));
  await main(['https://example.test', '--logs', '/dev/null']);
  const report = JSON.parse(output[0]);
  assert.match(errors[0], /--logs ignoré/);
  assert.equal(report.serverLogs, null);
  assert.match(report.serverLogsError, /Format de logs non reconnu/);
  assert.equal(report.score, null);
  assert.equal(report.verdict, 'non_determine');
});

test('CLI : URLs obligatoires, flags validés, JSON par défaut', () => {
  assert.deepEqual(parseArgs(['https://example.test']), { urls: ['https://example.test'], format: 'json', logs: null });
  assert.equal(parseArgs(['--logs', 'access.log', 'https://example.test', '--format', 'md']).format, 'md');
  for (const args of [[], ['--logs', 'access.log'], ['https://example.test', '--format', 'csv'], ['https://example.test', '--logs'], ['https://example.test', '--bad'], ['file:///etc/passwd']]) assert.throws(() => parseArgs(args));
});

test('Markdown français, priorités, logs et échappement des valeurs externes', async () => {
  const report = scoreReport(fixture());
  report.serverLogs = await analyzeLogLines([combined('GPTBot/1.2', '/<script>')]);
  const md = renderMarkdown(report);
  assert.match(md, /Score : \*\*25\/100/);
  assert.ok(md.indexOf('### Impact élevé') < md.indexOf('### Impact moyen'));
  assert.match(md, /non déterminé/);
  assert.match(md, /1 lignes ; 1 parsées ; 0 non parsées/);
  assert.match(md, /OpenAI \/ training : 1/);
  assert.ok(!md.includes('/<script>'));
});
