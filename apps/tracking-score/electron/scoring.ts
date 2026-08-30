import { ScanState, DetectionResult, DataLayerEvent, NetworkRequest, CmpAuditResult } from './types.js';

/**
 * Grille de scoring professionnelle basée sur SCORING-METHODOLOGY.md
 * Version 2.0 — Août 2026
 */

export interface ModuleScore {
  obtained: number;
  max: number;
  percentage: number;
  level: 'excellent' | 'good' | 'warning' | 'critical';
  details: ScoreDetail[];
}

export interface ScoreDetail {
  criterion: string;
  points: number;
  maxPoints: number;
  /**
   * 'non_determine' = critère techniquement indéterminable pour ce scan
   * (CMP non reconnue, structure non standard...). Exclu du calcul du
   * score (ni positif ni négatif) — jamais forcé à 0 ou aux points pleins.
   * Voir docs/tracking-score/CAHIER-DES-CHARGES.md.
   */
  status: 'pass' | 'fail' | 'partial' | 'manual' | 'non_determine';
  method: 'auto' | 'manual' | 'not-verified' | 'heuristic';
  reason?: string;
}

/** Item de revue manuelle agrégé depuis les critères non_determine de tous les modules. */
export interface ManualReviewItem {
  module: string;
  criterion: string;
  reason?: string;
}

export interface CompleteScanReport {
  url: string;
  timestamp: string;
  scanDuration: number;
  
  // Scores par module
  modules: {
    cmp: ModuleScore;
    tms: ModuleScore;
    analytics: ModuleScore;
    dataLayer: ModuleScore;
    performance: ModuleScore;
    consentModeV2: ModuleScore;
  };
  
  // Score total
  totalScore: number;
  maxScore: number;
  percentage: number;
  level: 'excellence' | 'production' | 'medium' | 'low' | 'critical';
  
  // Tests comportementaux
  behavioralTests: {
    preConsentBlocking: {
      status: 'pass' | 'fail' | 'not_tested';
      requestsBeforeConsent: number;
      violatingDomains: string[];
    };
    consentRefusal: {
      status: 'pass' | 'fail' | 'not_tested';
      requestsAfterRefusal: number;
      violatingDomains: string[];
    };
    consentModeV2: {
      status: 'pass' | 'fail' | 'not_tested';
      gcsParamBeforeConsent: string | null;
      gcsParamAfterConsent: string | null;
    };
  };
  
  // Recommandations
  recommendations: {
    critical: string[];
    high: string[];
    medium: string[];
    low: string[];
  };

  /** Critères non_determine de tous les modules, à revoir manuellement. */
  manualReview: ManualReviewItem[];

  // Données brutes
  rawData: {
    observations: ScanState['observations'];
    performanceScores?: {
      performance: number;
      accessibility: number;
      seo: number;
      bestPractices: number;
    };
  };
}

/**
 * Agrège une liste de ScoreDetail en ModuleScore, en excluant les critères
 * 'non_determine' à la fois du numérateur ET du dénominateur — un critère
 * indéterminable ne pénalise ni ne favorise le score du module.
 */
function buildModuleScore(details: ScoreDetail[]): ModuleScore {
  const counted = details.filter((d) => d.status !== 'non_determine');
  const obtained = Math.max(0, counted.reduce((sum, d) => sum + d.points, 0));
  const max = counted.reduce((sum, d) => sum + d.maxPoints, 0);
  const percentage = max > 0 ? Math.max(0, (obtained / max) * 100) : 0;
  const level = percentage >= 83 ? 'excellent' : percentage >= 50 ? 'good' : percentage >= 0 ? 'warning' : 'critical';
  return { obtained, max, percentage, level, details };
}

/**
 * Rassemble les critères non_determine de tous les modules pour affichage
 * séparé dans le rapport (revue manuelle) — cf. règle transversale Module A.
 */
export function collectManualReview(modules: Record<string, ModuleScore>): ManualReviewItem[] {
  const items: ManualReviewItem[] = [];
  for (const [moduleName, module] of Object.entries(modules)) {
    for (const detail of module.details) {
      if (detail.status === 'non_determine') {
        items.push({ module: moduleName, criterion: detail.criterion, reason: detail.reason });
      }
    }
  }
  return items;
}

/**
 * Module A — CMP (30 points)
 *
 * Refonte v2 (voir docs/tracking-score/CAHIER-DES-CHARGES.md, section Module A) :
 *   1. Présence/absence CMP (5 pts)
 *   2. CTA conformes CNIL — parité visuelle Accepter/Refuser mesurée (10 pts)
 *   3. Contenu catégoriel — catégories de consentement listées (5 pts)
 *   4. Typologie de CMP — marché reconnu / custom maison / absente (5 pts)
 *   5. Blocage navigation — modal bloquant vs bannière non-bloquante (5 pts)
 *
 * Règle transversale : un critère techniquement indéterminable (CMP non
 * reconnue par les règles Consent-O-Matic, structure non standard) est
 * renvoyé en 'non_determine' — jamais forcé à 0 ni aux points pleins. Un
 * critère non_determine est retiré à la fois du numérateur et du
 * dénominateur (`buildModuleScore` ci-dessous), donc n'affecte ni positivement
 * ni négativement le pourcentage du module.
 *
 * Important : les signaux Consent Mode (gcs, gcd, G1xy) ne font PAS partie de
 * ce module — ce sont des paramètres portés par les requêtes réseau générées
 * par le TMS/sGTM, traités dans scoreTMS et le module bonus consentModeV2.
 */
export function scoreCMP(cmpAudit: CmpAuditResult | null): ModuleScore {
  const details: ScoreDetail[] = [];

  // 1. Présence/absence CMP (5 pts)
  if (!cmpAudit || cmpAudit.typology === 'absente') {
    details.push({
      criterion: 'Présence CMP',
      points: 0,
      maxPoints: 5,
      status: 'fail',
      method: 'auto',
      reason: "Aucune CMP détectée (5 outils connus + ~180 règles Consent-O-Matic + heuristique générique)",
    });
  } else {
    const viaHeuristic = cmpAudit.detectionMethod === 'heuristic';
    details.push({
      criterion: 'Présence CMP',
      points: 5,
      maxPoints: 5,
      status: 'pass',
      method: viaHeuristic ? 'heuristic' : 'auto',
      reason: cmpAudit.vendorId
        ? `CMP détectée : ${cmpAudit.vendorId} (méthode : ${cmpAudit.detectionMethod})`
        : `CMP détectée (méthode : ${cmpAudit.detectionMethod})`,
    });
  }

  // 2. CTA conformes CNIL — parité visuelle Accepter/Refuser (10 pts)
  if (!cmpAudit || cmpAudit.typology === 'absente') {
    details.push({
      criterion: 'CTA conformes CNIL (parité Accepter/Refuser)',
      points: 0,
      maxPoints: 10,
      status: 'fail',
      method: 'auto',
      reason: 'Aucune CMP à évaluer.',
    });
  } else if (!cmpAudit.cta.determinable) {
    details.push({
      criterion: 'CTA conformes CNIL (parité Accepter/Refuser)',
      points: 0,
      maxPoints: 10,
      status: 'non_determine',
      method: 'heuristic',
      reason: cmpAudit.cta.reason,
    });
  } else {
    const pass = cmpAudit.cta.verdict === 'pass';
    details.push({
      criterion: 'CTA conformes CNIL (parité Accepter/Refuser)',
      points: pass ? 10 : 0,
      maxPoints: 10,
      status: pass ? 'pass' : 'fail',
      method: cmpAudit.detectionMethod === 'consent-o-matic' ? 'auto' : 'heuristic',
      reason: cmpAudit.cta.reason,
    });
  }

  // 3. Contenu catégoriel — granularité du consentement (5 pts)
  if (!cmpAudit || cmpAudit.typology === 'absente') {
    details.push({
      criterion: 'Contenu catégoriel (granularité du consentement)',
      points: 0,
      maxPoints: 5,
      status: 'fail',
      method: 'auto',
      reason: 'Aucune CMP à évaluer.',
    });
  } else if (!cmpAudit.categories.determinable) {
    details.push({
      criterion: 'Contenu catégoriel (granularité du consentement)',
      points: 0,
      maxPoints: 5,
      status: 'non_determine',
      method: 'heuristic',
      reason: cmpAudit.categories.reason,
    });
  } else {
    const granular = cmpAudit.categories.list.length >= 2;
    details.push({
      criterion: 'Contenu catégoriel (granularité du consentement)',
      points: granular ? 5 : 2,
      maxPoints: 5,
      status: granular ? 'pass' : 'partial',
      method: cmpAudit.detectionMethod === 'consent-o-matic' ? 'auto' : 'heuristic',
      reason: `${cmpAudit.categories.reason} (${cmpAudit.categories.list.join(', ') || 'aucune'})`,
    });
  }

  // 4. Typologie de CMP (5 pts) — reconnue = garanties d'audit tierces, custom = revue recommandée
  if (!cmpAudit || cmpAudit.typology === 'absente') {
    details.push({
      criterion: 'Typologie CMP',
      points: 0,
      maxPoints: 5,
      status: 'fail',
      method: 'auto',
      reason: 'Absente.',
    });
  } else if (cmpAudit.typology === 'marche_reconnu') {
    details.push({
      criterion: 'Typologie CMP',
      points: 5,
      maxPoints: 5,
      status: 'pass',
      method: 'auto',
      reason: `CMP du marché reconnue (${cmpAudit.vendorId ?? 'vendor identifié'}).`,
    });
  } else {
    details.push({
      criterion: 'Typologie CMP',
      points: 2,
      maxPoints: 5,
      status: 'partial',
      method: 'heuristic',
      reason: 'CMP "custom maison" détectée par heuristique — non couverte par un vendor reconnu, revue manuelle recommandée.',
    });
  }

  // 5. Blocage navigation (5 pts) — on valorise la garantie technique la plus
  // forte (modal bloquant), sans que la CNIL n'exige l'une ou l'autre forme :
  // une bannière non-bloquante reste valide si aucun tracking ne fire avant
  // décision (cf. tests comportementaux, module séparé).
  if (!cmpAudit || cmpAudit.typology === 'absente') {
    details.push({
      criterion: 'Blocage navigation avant décision',
      points: 0,
      maxPoints: 5,
      status: 'fail',
      method: 'auto',
      reason: 'Aucune CMP à évaluer.',
    });
  } else if (!cmpAudit.blocking.determinable) {
    details.push({
      criterion: 'Blocage navigation avant décision',
      points: 0,
      maxPoints: 5,
      status: 'non_determine',
      method: 'heuristic',
      reason: cmpAudit.blocking.reason,
    });
  } else {
    const blocking = cmpAudit.blocking.type === 'blocking';
    details.push({
      criterion: 'Blocage navigation avant décision',
      points: blocking ? 5 : 3,
      maxPoints: 5,
      status: blocking ? 'pass' : 'partial',
      method: cmpAudit.detectionMethod === 'consent-o-matic' ? 'auto' : 'heuristic',
      reason: cmpAudit.blocking.reason,
    });
  }

  return buildModuleScore(details);
}

/**
 * Module B1 — TMS (20 points)
 */
export function scoreTMS(
  tms: DetectionResult | null,
  networkRequests: NetworkRequest[],
  _states: { initial: boolean; accepted: boolean; refused: boolean }
): ModuleScore {
  const details: ScoreDetail[] = [];
  let score = 0;

  // 1. TMS détecté (5 pts)
  if (tms?.detected) {
    const points = tms.method === 'auto' ? 5 : 2.5;
    score += points;
    details.push({
      criterion: 'TMS détecté',
      points,
      maxPoints: 5,
      status: tms.method === 'auto' ? 'pass' : 'partial',
      method: tms.method,
      reason: tms.method === 'auto' ? `${tms.name} détecté automatiquement` : 'Déclaration manuelle'
    });
  } else {
    details.push({
      criterion: 'TMS détecté',
      points: 0,
      maxPoints: 5,
      status: 'fail',
      method: 'auto',
      reason: 'Aucun TMS détecté'
    });
  }

  // 2. Container ID identifié (5 pts)
  if (tms?.details?.containerId) {
    const points = tms.method === 'auto' ? 5 : 2.5;
    score += points;
    details.push({
      criterion: 'Container ID identifié',
      points,
      maxPoints: 5,
      status: tms.method === 'auto' ? 'pass' : 'partial',
      method: tms.method,
      reason: `Container ID: ${tms.details.containerId}`
    });
  } else {
    details.push({
      criterion: 'Container ID identifié',
      points: 0,
      maxPoints: 5,
      status: 'fail',
      method: 'auto',
      reason: 'Container ID non identifié (risque contamination cross-env)'
    });
  }

  // 3. Tags respectent consentement (5 pts)
  const trackingRequestsBeforeConsent = networkRequests.filter(
    r => r.timestamp < 3000 && (r.category === 'tracking' || r.category === 'analytics')
  ).length;

  if (trackingRequestsBeforeConsent === 0) {
    score += 5;
    details.push({
      criterion: 'Tags respectent consentement',
      points: 5,
      maxPoints: 5,
      status: 'pass',
      method: 'auto',
      reason: 'Aucun tag analytics/ads avant consent'
    });
  } else {
    score -= 5; // Pénalité
    details.push({
      criterion: 'Tags respectent consentement',
      points: -5,
      maxPoints: 5,
      status: 'fail',
      method: 'auto',
      reason: `${trackingRequestsBeforeConsent} tags fire avant consent — invalidité données`
    });
  }

  // 4. Pas de tags dupliqués (3 pts) — Requiert upload container.json (Module E)
  details.push({
    criterion: 'Pas de tags dupliqués',
    points: 0,
    maxPoints: 3,
    status: 'manual',
    method: 'manual',
    reason: 'Vérification container.json requise (Module E)'
  });

  // 5. Naming conventions (2 pts) — Requiert upload container.json (Module E)
  details.push({
    criterion: 'Naming conventions',
    points: 0,
    maxPoints: 2,
    status: 'manual',
    method: 'manual',
    reason: 'Vérification container.json requise (Module E)'
  });

  const maxScore = 20;
  const percentage = Math.max(0, (score / maxScore) * 100);
  const level = percentage >= 85 ? 'excellent' : percentage >= 50 ? 'good' : percentage >= 0 ? 'warning' : 'critical';

  return { obtained: Math.max(0, score), max: maxScore, percentage, level, details };
}

/**
 * Module B2 — Analytics (25 points)
 */
export function scoreAnalytics(
  analytics: DetectionResult | null,
  dataLayerEvents: DataLayerEvent[],
  _networkRequests: NetworkRequest[]
): ModuleScore {
  const details: ScoreDetail[] = [];
  let score = 0;

  // 1. Analytics détecté (5 pts)
  if (analytics?.detected) {
    const points = analytics.method === 'auto' ? 5 : 2.5;
    score += points;
    details.push({
      criterion: 'Analytics détecté',
      points,
      maxPoints: 5,
      status: analytics.method === 'auto' ? 'pass' : 'partial',
      method: analytics.method,
      reason: analytics.method === 'auto' ? `${analytics.name} détecté automatiquement` : 'Déclaration manuelle'
    });
  } else {
    details.push({
      criterion: 'Analytics détecté',
      points: 0,
      maxPoints: 5,
      status: 'fail',
      method: 'auto',
      reason: 'Aucun analytics détecté'
    });
  }

  // 2. Property/Measurement ID identifié (5 pts)
  if (analytics?.details?.propertyId) {
    const points = analytics.method === 'auto' ? 5 : 2.5;
    score += points;
    details.push({
      criterion: 'Property/Measurement ID identifié',
      points,
      maxPoints: 5,
      status: analytics.method === 'auto' ? 'pass' : 'partial',
      method: analytics.method,
      reason: `Property ID: ${analytics.details.propertyId}`
    });
  } else {
    details.push({
      criterion: 'Property/Measurement ID identifié',
      points: 0,
      maxPoints: 5,
      status: 'fail',
      method: 'auto',
      reason: 'Property ID non identifié'
    });
  }

  // 3. Events GA4 recommandés présents (5 pts)
  const ga4RecommendedEvents = ['page_view', 'view_item', 'add_to_cart', 'purchase', 'login', 'sign_up'];
  const detectedRecommendedEvents = dataLayerEvents.filter(e => ga4RecommendedEvents.includes(e.event));
  
  if (detectedRecommendedEvents.length >= 2) {
    score += 5;
    details.push({
      criterion: 'Events GA4 recommandés présents',
      points: 5,
      maxPoints: 5,
      status: 'pass',
      method: 'auto',
      reason: `${detectedRecommendedEvents.length} events GA4 recommandés détectés`
    });
  } else if (detectedRecommendedEvents.length === 1) {
    score += 2.5;
    details.push({
      criterion: 'Events GA4 recommandés présents',
      points: 2.5,
      maxPoints: 5,
      status: 'partial',
      method: 'auto',
      reason: '1 seul event GA4 recommandé détecté'
    });
  } else {
    details.push({
      criterion: 'Events GA4 recommandés présents',
      points: 0,
      maxPoints: 5,
      status: 'fail',
      method: 'auto',
      reason: 'Aucun event GA4 recommandé détecté'
    });
  }

  // 4. Paramètres requis complets (5 pts)
  const purchaseEvents = dataLayerEvents.filter(e => e.event === 'purchase');
  let parameterScore = 0;
  
  if (purchaseEvents.length > 0) {
    const completeEvents = purchaseEvents.filter(e => 
      e.data.transaction_id && e.data.value && e.data.currency && e.data.items
    );
    if (completeEvents.length === purchaseEvents.length) {
      parameterScore = 5;
      details.push({
        criterion: 'Paramètres requis complets',
        points: 5,
        maxPoints: 5,
        status: 'pass',
        method: 'auto',
        reason: 'Events purchase avec tous les paramètres requis'
      });
    } else {
      parameterScore = -5; // Pénalité
      details.push({
        criterion: 'Paramètres requis complets',
        points: -5,
        maxPoints: 5,
        status: 'fail',
        method: 'auto',
        reason: 'Events purchase incomplets (transaction_id, value, currency, items manquants) — revenue faussé'
      });
    }
  } else {
    details.push({
      criterion: 'Paramètres requis complets',
      points: 0,
      maxPoints: 5,
      status: 'pass',
      method: 'auto',
      reason: 'Aucun event purchase pour vérification'
    });
  }
  score += parameterScore;

  // 5. Pas de duplicate pageview (3 pts)
  const pageViewEvents = dataLayerEvents.filter(e => e.event === 'page_view');
  if (pageViewEvents.length <= 1) {
    score += 3;
    details.push({
      criterion: 'Pas de duplicate pageview',
      points: 3,
      maxPoints: 3,
      status: 'pass',
      method: 'auto',
      reason: '1 seul page_view par chargement'
    });
  } else {
    score -= 3; // Pénalité
    details.push({
      criterion: 'Pas de duplicate pageview',
      points: -3,
      maxPoints: 3,
      status: 'fail',
      method: 'auto',
      reason: `${pageViewEvents.length} page_view détectés — inflation sessions/users`
    });
  }

  // 6. Consent Mode v2 configuré (2 pts) — Requiert vérification GA4 Admin
  details.push({
    criterion: 'Consent Mode v2 configuré (GA4 Admin)',
    points: 0,
    maxPoints: 2,
    status: 'manual',
    method: 'manual',
    reason: 'Vérification GA4 Admin > Data collection > Consent settings requise'
  });

  const maxScore = 25;
  const percentage = Math.max(0, (score / maxScore) * 100);
  const level = percentage >= 88 ? 'excellent' : percentage >= 60 ? 'good' : percentage >= 0 ? 'warning' : 'critical';

  return { obtained: Math.max(0, score), max: maxScore, percentage, level, details };
}

/**
 * Module C — DataLayer (25 points)
 */
export function scoreDataLayer(dataLayerEvents: DataLayerEvent[]): ModuleScore {
  const details: ScoreDetail[] = [];
  let score = 0;

  // 1. DataLayer initialisé (5 pts)
  if (dataLayerEvents.length > 0) {
    score += 5;
    details.push({
      criterion: 'DataLayer initialisé',
      points: 5,
      maxPoints: 5,
      status: 'pass',
      method: 'auto',
      reason: `${dataLayerEvents.length} events capturés`
    });
  } else {
    details.push({
      criterion: 'DataLayer initialisé',
      points: 0,
      maxPoints: 5,
      status: 'fail',
      method: 'auto',
      reason: 'Aucun event dataLayer capturé'
    });
  }

  // 2. Nomenclature snake_case (5 pts)
  const snakeCaseRegex = /^[a-z0-9_]+$/;
  const invalidEvents = dataLayerEvents.filter(e => !snakeCaseRegex.test(e.event));
  
  if (invalidEvents.length === 0) {
    score += 5;
    details.push({
      criterion: 'Nomenclature snake_case',
      points: 5,
      maxPoints: 5,
      status: 'pass',
      method: 'auto',
      reason: 'Tous les events respectent snake_case'
    });
  } else {
    score -= 3; // Pénalité
    details.push({
      criterion: 'Nomenclature snake_case',
      points: -3,
      maxPoints: 5,
      status: 'fail',
      method: 'auto',
      reason: `${invalidEvents.length} events non snake_case (camelCase ou PascalCase détectés)`
    });
  }

  // 3. Event names descriptifs (5 pts)
  const genericEvents = ['click', 'event', 'event1', 'action', 'track'];
  const genericDetected = dataLayerEvents.filter(e => genericEvents.includes(e.event));
  
  if (genericDetected.length === 0) {
    score += 5;
    details.push({
      criterion: 'Event names descriptifs',
      points: 5,
      maxPoints: 5,
      status: 'pass',
      method: 'auto',
      reason: 'Aucun event générique détecté'
    });
  } else {
    score -= 3; // Pénalité
    details.push({
      criterion: 'Event names descriptifs',
      points: -3,
      maxPoints: 5,
      status: 'fail',
      method: 'auto',
      reason: `${genericDetected.length} events génériques détectés (click, event1...) — non-exploitable`
    });
  }

  // 4. Structure e-commerce GA4 (5 pts)
  const ecommerceEvents = dataLayerEvents.filter(e => 
    ['view_item', 'add_to_cart', 'remove_from_cart', 'purchase'].includes(e.event)
  );
  
  if (ecommerceEvents.length > 0) {
    const validEcommerce = ecommerceEvents.filter(e => 
      e.data.ecommerce && 
      e.data.ecommerce.items && 
      Array.isArray(e.data.ecommerce.items)
    );
    
    if (validEcommerce.length === ecommerceEvents.length) {
      score += 5;
      details.push({
        criterion: 'Structure e-commerce GA4',
        points: 5,
        maxPoints: 5,
        status: 'pass',
        method: 'auto',
        reason: 'Structure ecommerce.items[] conforme GA4'
      });
    } else {
      details.push({
        criterion: 'Structure e-commerce GA4',
        points: 2.5,
        maxPoints: 5,
        status: 'partial',
        method: 'auto',
        reason: 'Structure e-commerce partielle ou non-standard'
      });
      score += 2.5;
    }
  } else {
    details.push({
      criterion: 'Structure e-commerce GA4',
      points: 0,
      maxPoints: 5,
      status: 'pass',
      method: 'auto',
      reason: 'Aucun event e-commerce pour vérification'
    });
  }

  // 5. Reset ecommerce (null) avant push (3 pts)
  // Note: Difficile à détecter automatiquement, on suppose OK si structure est valide
  details.push({
    criterion: 'Reset ecommerce (null) avant push',
    points: 0,
    maxPoints: 3,
    status: 'manual',
    method: 'manual',
    reason: 'Vérification code source requise'
  });

  // 6. Préfixe custom events (2 pts)
  const customEvents = dataLayerEvents.filter(e => 
    !['page_view', 'view_item', 'add_to_cart', 'purchase', 'login', 'sign_up'].includes(e.event)
  );
  const prefixedEvents = customEvents.filter(e => 
    e.event.startsWith('sj_') || e.event.startsWith('custom_') || e.event.includes('_')
  );
  
  if (customEvents.length > 0) {
    if (prefixedEvents.length / customEvents.length >= 0.8) {
      score += 2;
      details.push({
        criterion: 'Préfixe custom events',
        points: 2,
        maxPoints: 2,
        status: 'pass',
        method: 'auto',
        reason: '≥80% des events custom ont un préfixe ou underscore'
      });
    } else {
      details.push({
        criterion: 'Préfixe custom events',
        points: 1,
        maxPoints: 2,
        status: 'partial',
        method: 'auto',
        reason: 'Préfixes custom events inconsistants'
      });
      score += 1;
    }
  } else {
    details.push({
      criterion: 'Préfixe custom events',
      points: 0,
      maxPoints: 2,
      status: 'pass',
      method: 'auto',
      reason: 'Aucun custom event pour vérification'
    });
  }

  const maxScore = 25;
  const percentage = Math.max(0, (score / maxScore) * 100);
  const level = percentage >= 88 ? 'excellent' : percentage >= 60 ? 'good' : percentage >= 0 ? 'warning' : 'critical';

  return { obtained: Math.max(0, score), max: maxScore, percentage, level, details };
}

/**
 * Calcul du score total
 */
export function calculateTotalScore(
  cmpScore: ModuleScore,
  tmsScore: ModuleScore,
  analyticsScore: ModuleScore,
  dataLayerScore: ModuleScore,
  performanceScore: ModuleScore,
  consentModeScore: ModuleScore
): { total: number; max: number; percentage: number; level: string } {
  const total =
    cmpScore.obtained +
    tmsScore.obtained +
    analyticsScore.obtained +
    dataLayerScore.obtained +
    performanceScore.obtained +
    consentModeScore.obtained;

  // Le max n'est plus fixé à 120 : un critère 'non_determine' réduit le max
  // du module concerné (cf. buildModuleScore), donc le max global doit être
  // recalculé à partir des modules plutôt que codé en dur.
  const max =
    cmpScore.max +
    tmsScore.max +
    analyticsScore.max +
    dataLayerScore.max +
    performanceScore.max +
    consentModeScore.max;
  const percentage = max > 0 ? (total / max) * 100 : 0;
  
  let level = 'critical';
  if (percentage >= 83) level = 'excellence';
  else if (percentage >= 67) level = 'production';
  else if (percentage >= 50) level = 'medium';
  else if (percentage >= 33) level = 'low';
  
  return { total, max, percentage, level };
}
