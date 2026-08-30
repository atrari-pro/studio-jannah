#!/usr/bin/env node
/**
 * Génère electron/data/consent-o-matic-rules.json à partir des règles
 * open-source Consent-O-Matic (github.com/cavi-au/Consent-O-Matic, MIT).
 *
 * On ne reprend PAS le moteur d'automatisation complet (méthodes DO_CONSENT
 * procédurales) : seulement de quoi (a) détecter la présence d'une CMP
 * reconnue et (b) localiser son bouton "ouvrir les options" quand il existe,
 * pour que notre propre mesure Playwright (parité CTA, catégories, blocage)
 * s'exécute sur la bonne zone du DOM. Voir docs/tracking-score/CAHIER-DES-CHARGES.md
 * (section Module A) pour le détail de cette décision.
 *
 * Usage : node scripts/build-cmp-rules.mjs
 * Nécessite un accès réseau (télécharge l'archive du repo GitHub).
 */

import { mkdtemp, rm, readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const REPO_TARBALL = 'https://github.com/cavi-au/Consent-O-Matic/archive/refs/heads/master.tar.gz';
const OUT_FILE = path.join(import.meta.dirname, '../electron/data/consent-o-matic-rules.json');
const ATTRIBUTION_FILE = path.join(import.meta.dirname, '../electron/data/CONSENT-O-MATIC-ATTRIBUTION.md');

function collectCssSelectors(matchers) {
  if (!Array.isArray(matchers)) return [];
  const selectors = [];
  for (const m of matchers) {
    if (m?.type === 'css' && typeof m?.target?.selector === 'string') {
      selectors.push(m.target.selector);
    }
  }
  return selectors;
}

function findOpenOptionsSelector(methods) {
  if (!Array.isArray(methods)) return null;
  const openOptions = methods.find((m) => m?.name === 'OPEN_OPTIONS');
  if (!openOptions) return null;
  const action = openOptions.action;
  // On ne gère que le cas simple : un click direct sur un sélecteur.
  // Les arbres d'actions imbriqués (list/ifcss/foreach) sont ignorés —
  // couverture partielle assumée et documentée.
  if (action?.type === 'click' && typeof action?.target?.selector === 'string') {
    return action.target.selector;
  }
  return null;
}

async function main() {
  const tmp = await mkdtemp(path.join(tmpdir(), 'com-rules-'));
  try {
    console.log(`[build-cmp-rules] Téléchargement de ${REPO_TARBALL}...`);
    const tarPath = path.join(tmp, 'repo.tar.gz');
    await run('curl', ['-fsSL', '-o', tarPath, REPO_TARBALL]);
    await run('tar', ['-xzf', tarPath, '-C', tmp]);

    const entries = await readdir(tmp);
    const repoDir = entries.find((e) => e.startsWith('Consent-O-Matic-'));
    if (!repoDir) throw new Error('Dossier du repo introuvable après extraction');

    const rulesDir = path.join(tmp, repoDir, 'rules');
    const licenseText = await readFile(path.join(tmp, repoDir, 'LICENSE'), 'utf-8');

    const files = (await readdir(rulesDir)).filter((f) => f.endsWith('.json'));
    const normalized = [];

    for (const file of files) {
      const raw = JSON.parse(await readFile(path.join(rulesDir, file), 'utf-8'));
      for (const [vendorId, rule] of Object.entries(raw)) {
        if (vendorId === '$schema') continue;
        const presentSelectors = [];
        const showingSelectors = [];
        for (const detector of rule?.detectors ?? []) {
          presentSelectors.push(...collectCssSelectors(detector.presentMatcher));
          showingSelectors.push(...collectCssSelectors(detector.showingMatcher));
        }
        if (presentSelectors.length === 0) continue; // règle inexploitable pour nous

        normalized.push({
          id: vendorId,
          sourceFile: file,
          presentSelectors: [...new Set(presentSelectors)],
          showingSelectors: [...new Set(showingSelectors)],
          openOptionsSelector: findOpenOptionsSelector(rule?.methods),
        });
      }
    }

    normalized.sort((a, b) => a.id.localeCompare(b.id));

    await mkdir(path.dirname(OUT_FILE), { recursive: true });
    await writeFile(OUT_FILE, JSON.stringify(normalized, null, 2) + '\n', 'utf-8');
    console.log(`[build-cmp-rules] ${normalized.length} règles écrites dans ${OUT_FILE}`);

    const attribution = `# Attribution — règles de détection CMP

Les sélecteurs de \`consent-o-matic-rules.json\` sont dérivés du projet
open-source **Consent-O-Matic** (CAVI, Aarhus University) :
https://github.com/cavi-au/Consent-O-Matic

Licence : MIT (texte original ci-dessous). Nous ne redistribuons pas leur
moteur d'automatisation complet, seulement les sélecteurs \`presentMatcher\`
et \`OPEN_OPTIONS\` (simples), pour la détection de présence CMP et le
repérage de la zone DOM à mesurer. Voir
docs/tracking-score/CAHIER-DES-CHARGES.md (Module A) pour le détail.

Régénération : \`node scripts/build-cmp-rules.mjs\` (${new Date().toISOString().slice(0, 10)}).

---

${licenseText.trim()}
`;
    await writeFile(ATTRIBUTION_FILE, attribution, 'utf-8');
    console.log(`[build-cmp-rules] Attribution écrite dans ${ATTRIBUTION_FILE}`);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('[build-cmp-rules] Échec:', err);
  process.exit(1);
});
