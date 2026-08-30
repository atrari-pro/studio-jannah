import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { Page } from 'playwright';
import type { CmpAuditResult, CmpCategories, DetectionResult } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Module A v2 — détection et mesure CMP.
 * Méthodologie complète : docs/tracking-score/CAHIER-DES-CHARGES.md (Module A)
 *
 * Principe : on combine
 *  1. la détection native existante (5 CMP via window.*), gardée telle quelle
 *  2. les règles open-source Consent-O-Matic (presentSelectors + OPEN_OPTIONS,
 *     voir electron/data/consent-o-matic-rules.json et scripts/build-cmp-rules.mjs)
 *     pour élargir la couverture à ~180 CMP supplémentaires
 *  3. une heuristique générique de repli (mots-clés + boutons) pour les CMP
 *     "maison" non couvertes par les règles ci-dessus
 *
 * Tout ce qui dépend d'une structure DOM non reconnue (règle absente ET
 * heuristique en échec) est renvoyé comme non-déterminable — jamais un score
 * forcé. Voir la fonction `scoreCMP` dans scoring.ts pour la traduction en points.
 */

interface NormalizedCmpRule {
  id: string;
  sourceFile: string;
  presentSelectors: string[];
  showingSelectors: string[];
  openOptionsSelector: string | null;
}

let cachedRules: NormalizedCmpRule[] | null = null;

function loadCmpRules(): NormalizedCmpRule[] {
  if (!cachedRules) {
    const file = path.join(__dirname, 'data/consent-o-matic-rules.json');
    cachedRules = JSON.parse(readFileSync(file, 'utf-8'));
  }
  return cachedRules!;
}

const ACCEPT_KEYWORDS = [
  'tout accepter', 'accepter tout', "j'accepte", 'accepter et fermer', 'accepter',
  'accept all', 'allow all', 'i agree', 'agree', 'allow cookies',
];

const REFUSE_KEYWORDS = [
  'tout refuser', 'refuser tout', 'je refuse', 'continuer sans accepter', 'refuser',
  'reject all', 'decline all', 'decline', 'reject', 'disagree',
  'necessary only', 'essential only', 'strictement nécessaire',
];

const CONTEXT_KEYWORDS = [
  'cookie', 'cookies', 'consent', 'consentement', 'confidentialit', 'vie privée',
  'privacy', 'données personnelles', 'traceurs', 'tracking',
];

/**
 * Forme brute renvoyée par l'évaluation navigateur, avant l'étape (async,
 * hors evaluate) d'ouverture du panneau de catégories.
 */
interface RawCmpDetection {
  typology: 'marche_reconnu' | 'custom_maison' | 'absente';
  vendorId: string | null;
  detectionMethod: 'native' | 'consent-o-matic' | 'heuristic' | 'none';
  rootFound: boolean;
  cta: CmpAuditResult['cta'];
  blocking: CmpAuditResult['blocking'];
  openOptionsSelector: string | null;
}

export async function auditCmp(page: Page, nativeCmp: DetectionResult | null): Promise<CmpAuditResult> {
  const rules = loadCmpRules().map((r) => ({
    id: r.id,
    presentSelectors: r.presentSelectors,
    showingSelectors: r.showingSelectors,
    openOptionsSelector: r.openOptionsSelector,
  }));

  const raw: RawCmpDetection = await page.evaluate(
    ({ rules, nativeVendorName, acceptKeywords, refuseKeywords, contextKeywords }) => {
      // @ts-ignore - contexte navigateur (pas de lib DOM dans tsconfig electron)
      const w = window as any;
      // @ts-ignore
      const doc = document as any;

      const textOf = (el: any): string =>
        ((el.innerText ?? el.textContent ?? '') as string).trim().replace(/\s+/g, ' ').slice(0, 80);

      const parseColor = (str: string): number[] | null => {
        const m = /rgba?\(([^)]+)\)/.exec(str || '');
        if (!m) return null;
        const parts = m[1].split(',').map((s: string) => parseFloat(s.trim()));
        return [parts[0] || 0, parts[1] || 0, parts[2] || 0, parts[3] === undefined ? 1 : parts[3]];
      };

      const relLuminance = ([r, g, b]: number[]): number => {
        const [rs, gs, bs] = [r, g, b].map((c) => {
          const cs = c / 255;
          return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      };

      const effectiveBackground = (el: any): number[] => {
        let node = el;
        for (let i = 0; i < 6 && node; i++) {
          const cs = w.getComputedStyle(node);
          const rgba = parseColor(cs.backgroundColor);
          if (rgba && rgba[3] > 0.05) return rgba;
          node = node.parentElement;
        }
        return [255, 255, 255];
      };

      const contrastOf = (el: any): number | null => {
        const cs = w.getComputedStyle(el);
        const fg = parseColor(cs.color);
        if (!fg) return null;
        const L1 = relLuminance(fg);
        const L2 = relLuminance(effectiveBackground(el));
        const light = Math.max(L1, L2);
        const dark = Math.min(L1, L2);
        return (light + 0.05) / (dark + 0.05);
      };

      const describe = (el: any, selector: string) => {
        const rect = el.getBoundingClientRect();
        return {
          selector,
          text: textOf(el),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          contrast: contrastOf(el),
        };
      };

      // --- 1. Détection vendor + root via règles Consent-O-Matic ---
      let vendorId: string | null = null;
      let rootEl: any = null;
      let openOptionsSelector: string | null = null;
      let detectionMethod: 'native' | 'consent-o-matic' | 'heuristic' | 'none' = 'none';
      let showingSelectorsForMatch: string[] = [];

      const isVisible = (el: any): boolean => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      for (const rule of rules as {
        id: string;
        presentSelectors: string[];
        showingSelectors: string[];
        openOptionsSelector: string | null;
      }[]) {
        for (const sel of rule.presentSelectors) {
          let el = null;
          try {
            el = doc.querySelector(sel);
          } catch {
            el = null;
          }
          if (el) {
            vendorId = rule.id;
            rootEl = el;
            openOptionsSelector = rule.openOptionsSelector;
            showingSelectorsForMatch = rule.showingSelectors;
            detectionMethod = 'consent-o-matic';
            break;
          }
        }
        if (rootEl) break;
      }

      if (!rootEl && nativeVendorName) {
        detectionMethod = 'native';
        vendorId = nativeVendorName;
      }

      // --- 2. Repli heuristique générique (root + typologie) ---
      let typology: 'marche_reconnu' | 'custom_maison' | 'absente';
      if (detectionMethod === 'consent-o-matic') {
        typology = 'marche_reconnu';
      } else {
        const candidates = doc.body ? (Array.from(doc.body.children) as any[]) : [];
        let found: any = null;
        for (const el of candidates) {
          const txt = textOf(el).toLowerCase();
          if ((contextKeywords as string[]).some((k) => txt.includes(k))) {
            const hasButtons = el.querySelectorAll('button, a, [role="button"]').length > 0;
            if (hasButtons) {
              found = el;
              break;
            }
          }
        }
        if (found) {
          rootEl = found;
          if (detectionMethod === 'native') {
            typology = 'marche_reconnu';
          } else {
            typology = 'custom_maison';
            detectionMethod = 'heuristic';
          }
        } else if (detectionMethod === 'native') {
          typology = 'marche_reconnu'; // détecté via window.* mais bannière déjà fermée/introuvable
        } else {
          typology = 'absente';
        }
      }

      // La CMP peut être présente dans le DOM sans être actuellement affichée
      // (ex: tarteaucitron n'affiche qu'une icône tant qu'on n'a pas cliqué
      // dessus). Mesurer des boutons masqués donnerait des bounding box à
      // zéro et un faux verdict "fail" — on distingue donc ce cas et on le
      // renvoie en non_determine plutôt que de mesurer du vide.
      const isShowing = rootEl
        ? showingSelectorsForMatch.length > 0
          ? showingSelectorsForMatch.some((sel) => {
              try {
                return isVisible(doc.querySelector(sel));
              } catch {
                return false;
              }
            })
          : isVisible(rootEl)
        : false;

      if (!rootEl) {
        return {
          typology,
          vendorId,
          detectionMethod,
          rootFound: false,
          cta: {
            determinable: false,
            accept: null,
            refuse: null,
            areaRatio: null,
            sameRow: null,
            contrastDelta: null,
            verdict: null,
            reason: 'Aucune CMP présente sur la page.',
          },
          blocking: { determinable: false, type: null, reason: 'Aucune CMP présente sur la page.' },
          openOptionsSelector: null,
        };
      }

      // --- 3. Boutons Accepter / Refuser (uniquement des éléments visibles —
      // un bouton présent mais display:none donnerait une bounding box à
      // zéro et fausserait la mesure) ---
      const buttons = (
        Array.from(
          rootEl.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]')
        ) as any[]
      ).filter((el) => isVisible(el));
      let acceptEl: any = null;
      let refuseEl: any = null;
      for (const el of buttons) {
        const txt = textOf(el).toLowerCase();
        if (!acceptEl && (acceptKeywords as string[]).some((k) => txt.includes(k))) acceptEl = el;
        if (!refuseEl && (refuseKeywords as string[]).some((k) => txt.includes(k))) refuseEl = el;
      }

      const isVendorRule = detectionMethod === 'consent-o-matic';
      let cta: CmpAuditResult['cta'];

      if (!isShowing) {
        cta = {
          determinable: false,
          accept: null,
          refuse: null,
          areaRatio: null,
          sameRow: null,
          contrastDelta: null,
          verdict: null,
          reason:
            "CMP présente dans le DOM mais non affichée au moment de la mesure (ex: icône fermée) — parité non mesurable dans cet état.",
        };
      } else if (acceptEl && refuseEl) {
        const accept = describe(acceptEl, 'accept');
        const refuse = describe(refuseEl, 'refuse');
        const areaA = accept.width * accept.height;
        const areaR = refuse.width * refuse.height;
        const areaRatio = areaA > 0 && areaR > 0 ? Math.min(areaA, areaR) / Math.max(areaA, areaR) : 0;
        const sameRow = Math.abs(accept.y - refuse.y) < Math.max(accept.height, refuse.height, 10) * 1.5;
        const contrastDelta =
          accept.contrast !== null && refuse.contrast !== null ? Math.abs(accept.contrast - refuse.contrast) : null;
        const ok = areaRatio >= 0.5 && sameRow && (contrastDelta === null || contrastDelta <= 3);
        cta = {
          determinable: true,
          accept,
          refuse,
          areaRatio,
          sameRow,
          contrastDelta,
          verdict: ok ? 'pass' : 'fail',
          reason: ok
            ? `Boutons Accepter/Refuser de taille et position comparables (ratio ${areaRatio.toFixed(2)}).`
            : `Asymétrie détectée — ratio taille ${areaRatio.toFixed(2)}, même ligne : ${sameRow}, écart de contraste : ${
                contrastDelta !== null ? contrastDelta.toFixed(1) : 'n/a'
              }.`,
        };
      } else if (!isVendorRule) {
        cta = {
          determinable: false,
          accept: acceptEl ? describe(acceptEl, 'accept') : null,
          refuse: null,
          areaRatio: null,
          sameRow: null,
          contrastDelta: null,
          verdict: null,
          reason:
            'CMP non reconnue par les règles Consent-O-Matic — boutons Accepter/Refuser non localisables avec certitude.',
        };
      } else {
        cta = {
          determinable: true,
          accept: acceptEl ? describe(acceptEl, 'accept') : null,
          refuse: refuseEl ? describe(refuseEl, 'refuse') : null,
          areaRatio: null,
          sameRow: null,
          contrastDelta: null,
          verdict: 'fail',
          reason: !refuseEl
            ? 'Aucun bouton "Refuser" visible au même niveau que "Accepter" — potentiel dark pattern CNIL.'
            : 'Aucun bouton "Accepter" identifié.',
        };
      }

      // --- 4. Blocage navigation (heuristique best-effort) ---
      let blocking: CmpAuditResult['blocking'];
      if (!isShowing) {
        blocking = {
          determinable: false,
          type: null,
          reason: 'CMP présente mais non affichée au moment de la mesure — blocage non évaluable dans cet état.',
        };
      } else {
        const bodyStyle = doc.body ? w.getComputedStyle(doc.body) : null;
        const htmlStyle = w.getComputedStyle(doc.documentElement);
        const scrollLocked = (bodyStyle && bodyStyle.overflow === 'hidden') || htmlStyle.overflow === 'hidden';
        let fullscreenBackdrop = false;
        if (doc.body) {
          for (const el of Array.from(doc.body.children) as any[]) {
            const isRelated =
              el === rootEl || (rootEl.contains && rootEl.contains(el)) || (el.contains && el.contains(rootEl));
            if (isRelated) continue;
            const cs = w.getComputedStyle(el);
            if ((cs.position === 'fixed' || cs.position === 'absolute') && cs.pointerEvents !== 'none') {
              const rect = el.getBoundingClientRect();
              const coverage = (rect.width * rect.height) / (w.innerWidth * w.innerHeight);
              if (coverage > 0.7) {
                fullscreenBackdrop = true;
                break;
              }
            }
          }
        }
        blocking = {
          determinable: true,
          type: scrollLocked || fullscreenBackdrop ? 'blocking' : 'non-blocking',
          reason:
            scrollLocked || fullscreenBackdrop
              ? 'Défilement verrouillé et/ou overlay plein écran détecté derrière la CMP.'
              : 'Aucun verrouillage de défilement ni overlay plein écran détecté — bannière probablement non-bloquante.',
        };
      }

      return { typology, vendorId, detectionMethod, rootFound: true, cta, blocking, openOptionsSelector };
    },
    {
      rules,
      nativeVendorName: nativeCmp?.detected ? nativeCmp.name : null,
      acceptKeywords: ACCEPT_KEYWORDS,
      refuseKeywords: REFUSE_KEYWORDS,
      contextKeywords: CONTEXT_KEYWORDS,
    }
  );

  // --- 5. Catégories : nécessite un clic réel, donc hors du evaluate ci-dessus ---
  const categories = raw.rootFound
    ? await extractCategories(page, raw.openOptionsSelector, raw.detectionMethod === 'consent-o-matic')
    : { determinable: false, list: [], reason: 'Aucune CMP présente sur la page.' };

  return {
    typology: raw.typology,
    vendorId: raw.vendorId,
    detectionMethod: raw.detectionMethod,
    rootFound: raw.rootFound,
    cta: raw.cta,
    categories,
    blocking: raw.blocking,
  };
}

async function extractCategories(
  page: Page,
  openOptionsSelector: string | null,
  isVendorRule: boolean
): Promise<CmpCategories> {
  if (!openOptionsSelector) {
    return {
      determinable: false,
      list: [],
      reason: isVendorRule
        ? 'Cette CMP ne semble pas exposer de panneau de préférences détaillé (choix probablement binaire).'
        : 'CMP non reconnue — pas de sélecteur fiable pour ouvrir un éventuel panneau de préférences.',
    };
  }

  try {
    const opened = await page.evaluate((selector: string) => {
      // @ts-ignore
      const doc = document as any;
      const el = doc.querySelector(selector);
      if (el) {
        el.click();
        return true;
      }
      return false;
    }, openOptionsSelector);

    if (!opened) {
      return { determinable: false, list: [], reason: 'Bouton "ouvrir les options" introuvable au moment de la mesure.' };
    }

    await page.waitForTimeout(500);

    const list: string[] = await page.evaluate(() => {
      // @ts-ignore
      const doc = document as any;
      const nodes = Array.from(
        doc.querySelectorAll('input[type="checkbox"], [role="switch"], [role="checkbox"]')
      ) as any[];
      const labels = new Set<string>();
      for (const node of nodes) {
        let el = node;
        let label: string | null = null;
        for (let i = 0; i < 4 && el && !label; i++) {
          const txt = ((el.innerText ?? el.textContent ?? '') as string).trim().replace(/\s+/g, ' ');
          if (txt && txt.length >= 3 && txt.length <= 60) label = txt;
          el = el.parentElement;
        }
        if (label) labels.add(label);
        if (labels.size >= 12) break;
      }
      return Array.from(labels);
    });

    return list.length > 0
      ? { determinable: true, list, reason: `${list.length} catégorie(s) de consentement identifiée(s).` }
      : { determinable: false, list: [], reason: 'Panneau ouvert mais aucune catégorie identifiable (structure non standard).' };
  } catch {
    return { determinable: false, list: [], reason: "Erreur lors de l'ouverture du panneau de préférences." };
  }
}
