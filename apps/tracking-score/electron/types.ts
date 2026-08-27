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
