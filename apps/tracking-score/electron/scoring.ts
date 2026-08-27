import { ScanState, DetectionResult, DataLayerEvent, NetworkRequest } from './types.js';

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
  status: 'pass' | 'fail' | 'partial' | 'manual';
  method: 'auto' | 'manual' | 'not-verified';
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
 * Module A — CMP (30 points)
 */
export function scoreCMP(
  cmp: DetectionResult | null,
  networkRequests: NetworkRequest[],
  _states: { initial: boolean; accepted: boolean; refused: boolean },
  consentModeDetected: boolean
): ModuleScore {
  const details: ScoreDetail[] = [];
  let score = 0;

  // 1. CMP détectée (5 pts)
  if (cmp?.detected) {
    const points = cmp.method === 'auto' ? 5 : 2.5;
    score += points;
    details.push({
      criterion: 'CMP détectée',
      points,
      maxPoints: 5,
      status: cmp.method === 'auto' ? 'pass' : 'partial',
      method: cmp.method,
      reason: cmp.method === 'auto' ? `${cmp.name} détecté automatiquement` : 'Déclaration manuelle'
    });
  } else {
    details.push({
      criterion: 'CMP détectée',
      points: 0,
      maxPoints: 5,
      status: 'fail',
      method: 'auto',
      reason: 'Aucune CMP détectée'
    });
  }

  // 2. Blocage pré-consentement (10 pts)
  const trackingRequestsBeforeConsent = networkRequests.filter(
    r => r.timestamp < 3000 && (r.category === 'tracking' || r.category === 'analytics' || r.category === 'media')
  ).length;

  if (trackingRequestsBeforeConsent === 0) {
    score += 10;
    details.push({
      criterion: 'Blocage pré-consentement',
      points: 10,
      maxPoints: 10,
      status: 'pass',
      method: 'auto',
      reason: 'Aucune requête tracking avant consentement'
    });
  } else {
    score -= 10; // Pénalité
    details.push({
      criterion: 'Blocage pré-consentement',
      points: -10,
      maxPoints: 10,
      status: 'fail',
      method: 'auto',
      reason: `${trackingRequestsBeforeConsent} requêtes tracking avant consentement — VIOLATION RGPD`
    });
  }

  // 3. Choix granulaire (5 pts) — À implémenter manuellement
  details.push({
    criterion: 'Choix granulaire (Accepter/Refuser visible)',
    points: 0,
    maxPoints: 5,
    status: 'manual',
    method: 'manual',
    reason: 'Vérification manuelle requise (présence bouton Refuser)'
  });

  // 4. Audit trail (5 pts) — À implémenter manuellement
  details.push({
    criterion: 'Audit trail (logs consentement)',
    points: 0,
    maxPoints: 5,
    status: 'manual',
    method: 'manual',
    reason: 'Vérification manuelle requise (API getConsents() ou équivalent)'
  });

  // 5. Consent Mode v2 intégré (5 pts)
  if (consentModeDetected) {
    score += 5;
    details.push({
      criterion: 'Consent Mode v2 intégré',
      points: 5,
      maxPoints: 5,
      status: 'pass',
      method: 'auto',
      reason: 'Paramètres Consent Mode v2 détectés'
    });
  } else {
    details.push({
      criterion: 'Consent Mode v2 intégré',
      points: 0,
      maxPoints: 5,
      status: 'fail',
      method: 'auto',
      reason: 'Paramètres Consent Mode v2 manquants'
    });
  }

  const maxScore = 30;
  const percentage = Math.max(0, (score / maxScore) * 100);
  const level = percentage >= 83 ? 'excellent' : percentage >= 50 ? 'good' : percentage >= 0 ? 'warning' : 'critical';

  return { obtained: Math.max(0, score), max: maxScore, percentage, level, details };
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
    
  const max = 120;
  const percentage = (total / max) * 100;
  
  let level = 'critical';
  if (percentage >= 83) level = 'excellence';
  else if (percentage >= 67) level = 'production';
  else if (percentage >= 50) level = 'medium';
  else if (percentage >= 33) level = 'low';
  
  return { total, max, percentage, level };
}
