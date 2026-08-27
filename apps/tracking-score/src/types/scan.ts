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

export interface ScanState {
  status: 'idle' | 'scanning' | 'completed' | 'error';
  url: string;
  observations: {
    cmp: DetectionResult | null;
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
  status: 'pass' | 'fail' | 'partial' | 'manual';
  method: 'auto' | 'manual' | 'not-verified';
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
