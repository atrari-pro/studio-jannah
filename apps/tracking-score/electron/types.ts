export interface DetectionResult {
  detected: boolean;
  name: string | null;
  method: 'auto' | 'manual' | 'not-verified';
  details?: {
    version?: string;
    containerId?: string;
    propertyId?: string;
    docs?: string; // Lien vers doc officielle
  };
}

/**
 * Élément candidat mesuré dans le DOM (bouton Accepter/Refuser, etc.)
 * Toutes les dimensions sont en pixels CSS (viewport courant).
 */
export interface CmpMeasuredElement {
  selector: string;
  text: string;
  width: number;
  height: number;
  x: number;
  y: number;
  /** Ratio de contraste WCAG (texte / fond effectif). null si non calculable. */
  contrast: number | null;
}

export interface CmpCtaParity {
  /** false = structure trop atypique pour être mesurée avec confiance (cf. règle non_determine) */
  determinable: boolean;
  accept: CmpMeasuredElement | null;
  refuse: CmpMeasuredElement | null;
  areaRatio: number | null;
  sameRow: boolean | null;
  contrastDelta: number | null;
  verdict: 'pass' | 'fail' | null;
  reason: string;
}

export interface CmpCategories {
  determinable: boolean;
  list: string[];
  reason: string;
}

export interface CmpBlocking {
  determinable: boolean;
  type: 'blocking' | 'non-blocking' | null;
  reason: string;
}

/**
 * Résultat de l'audit CMP enrichi (Module A v2) — voir
 * docs/tracking-score/CAHIER-DES-CHARGES.md pour la méthodologie.
 */
export interface CmpAuditResult {
  typology: 'marche_reconnu' | 'custom_maison' | 'absente';
  vendorId: string | null;
  detectionMethod: 'native' | 'consent-o-matic' | 'heuristic' | 'none';
  rootFound: boolean;
  cta: CmpCtaParity;
  categories: CmpCategories;
  blocking: CmpBlocking;
}

export interface NetworkRequest {
  url: string;
  method: string;
  timestamp: number;
  type: string;
  params?: Record<string, string>; // Paramètres URL parsés
  headers?: Record<string, string>;
  category?: 'tracking' | 'analytics' | 'media' | 'resource' | 'other';
}

export interface DataLayerEvent {
  index: number;
  event: string;
  timestamp: number;
  data: any;
  category?: 'navigation' | 'engagement' | 'ecommerce' | 'form' | 'consent' | 'custom';
}

export interface ScanState {
  status: 'idle' | 'scanning' | 'completed' | 'error';
  url: string;
  observations: {
    cmp: DetectionResult | null;
    cmpAudit: CmpAuditResult | null;
    tms: DetectionResult | null;
    analytics: DetectionResult | null;
    attribution: DetectionResult[]; // Nouveaux outils d'attribution
    abTesting: DetectionResult[]; // Nouveaux outils A/B test
    dataLayer: DataLayerEvent[];
    networkRequests: NetworkRequest[];
    states: {
      initial: boolean;
      accepted: boolean;
      refused: boolean;
    };
  };
}

export interface ScanReport {
  url: string;
  timestamp: string;
  observations: ScanState['observations'];
  scores: {
    cmp: number;
    tms: number;
    analytics: number;
    dataLayer: number;
    total: number;
  };
  summary: {
    totalTools: number;
    totalEvents: number;
    totalRequests: number;
  };
}
