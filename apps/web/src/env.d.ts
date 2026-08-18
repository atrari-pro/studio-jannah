/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_GTM_ID?: string;
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
  readonly PUBLIC_BASE_PATH?: string;
  readonly PUBLIC_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  dataLayer?: Record<string, unknown>[];
  sjTrack?: (payload: Record<string, unknown>) => void;
  sj?: {
    ensureDataLayer?: () => unknown[];
    setConsent?: (analytics: boolean, ads: boolean, source: string) => void;
    push?: (payload: Record<string, unknown>) => void;
  };
  gtag?: (...args: unknown[]) => void;
  tarteaucitron?: {
    init: (cfg: Record<string, unknown>) => void;
    services: Record<string, unknown>;
    job?: string[];
    user: Record<string, unknown>;
    userInterface?: { openPanel: () => void };
  };
}
