export interface DetectionResult {
  detected: boolean;
  name: string | null;
  method: 'auto' | 'manual' | 'not-verified';
  details?: {
    version?: string;
    containerId?: string;
    propertyId?: string;
    docs?: string;
  };
}

export interface NetworkRequest {
  url: string;
  method: string;
  timestamp: number;
  type: string;
  params?: Record<string, string>;
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

export interface CmpMeasuredElement {
  selector: string;
  text: string;
  width: number;
  height: number;
  x: number;
  y: number;
  contrast: number | null;
}

export interface CmpCtaParity {
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

export interface CmpAuditResult {
  typology: 'marche_reconnu' | 'custom_maison' | 'absente';
  vendorId: string | null;
  detectionMethod: 'native' | 'consent-o-matic' | 'heuristic' | 'none';
  rootFound: boolean;
  cta: CmpCtaParity;
  categories: CmpCategories;
  blocking: CmpBlocking;
}

export interface ScanState {
  status: 'idle' | 'scanning' | 'completed' | 'error';
  url: string;
  observations: {
    cmp: DetectionResult | null;
    cmpAudit: CmpAuditResult | null;
    tms: DetectionResult | null;
    analytics: DetectionResult | null;
    attribution: DetectionResult[];
    abTesting: DetectionResult[];
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
  summary?: {
    totalTools: number;
    totalEvents: number;
    totalRequests: number;
  };
}

// Nouveaux types pour rapport d'audit professionnel v0.3

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
  status: 'pass' | 'fail' | 'partial' | 'manual' | 'non_determine';
  method: 'auto' | 'manual' | 'not-verified' | 'heuristic';
  reason?: string;
}

export interface ManualReviewItem {
  module: string;
  criterion: string;
  reason?: string;
}

export interface CompleteScanReport {
  url: string;
  timestamp: string;
  scanDuration: number;
  
  modules: {
    cmp: ModuleScore;
    tms: ModuleScore;
    analytics: ModuleScore;
    dataLayer: ModuleScore;
    performance: ModuleScore;
    consentModeV2: ModuleScore;
  };
  
  totalScore: number;
  maxScore: number;
  percentage: number;
  level: 'excellence' | 'production' | 'medium' | 'low' | 'critical';
  
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
  
  recommendations: {
    critical: string[];
    high: string[];
    medium: string[];
    low: string[];
  };

  manualReview: ManualReviewItem[];

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
