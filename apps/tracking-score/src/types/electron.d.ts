import { ScanState, CompleteScanReport } from './scan';

declare global {
  interface Window {
    electronAPI: {
      startScan: (url: string) => Promise<{ success: boolean; error?: string }>;
      getScanState: () => Promise<ScanState>;
      finishScan: () => Promise<{ success: boolean; report?: CompleteScanReport; error?: string }>;
      markConsentAccepted: () => Promise<{ success: boolean }>;
      markConsentRefused: () => Promise<{ success: boolean }>;
    };
  }
}

export {};
