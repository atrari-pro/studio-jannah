import { PlaywrightController } from './playwright-controller.js';
import type { CompleteScanReport, ScoreDetail } from './scoring.js';

export type PageIssue =
  | { source: 'criterion'; module: string; detail: ScoreDetail }
  | { source: 'behavioralTest'; test: string; detail: CompleteScanReport['behavioralTests'][keyof CompleteScanReport['behavioralTests']] };

export type PageScanResult =
  | { url: string; status: 'completed'; report: CompleteScanReport; issues: PageIssue[] }
  | { url: string; status: 'failed'; error: string };

export interface AggregateScanReport {
  timestamp: string;
  pages: PageScanResult[];
  summary: { requested: number; completed: number; failed: number };
  /** Sommes sur les pages réussies, sans arrondi ni dénominateur fixe. */
  globalScore: { obtained: number; max: number; percentage: number } | null;
}

export interface ScanOptions {
  /** true par défaut pour Node ; aucune incidence sur le défaut Electron. */
  headless?: boolean;
}

function collectIssues(report: CompleteScanReport): PageIssue[] {
  const issues: PageIssue[] = [];
  for (const [module, score] of Object.entries(report.modules)) {
    for (const detail of score.details) {
      if (detail.status === 'fail' || detail.status === 'partial') {
        issues.push({ source: 'criterion', module, detail });
      }
    }
  }
  for (const [test, detail] of Object.entries(report.behavioralTests)) {
    if (detail.status === 'fail') issues.push({ source: 'behavioralTest', test, detail });
  }
  return issues;
}

/** Scanne uniquement les URLs explicites, dans l'ordre, en sessions isolées. */
export async function scanUrls(urls: readonly string[], options: ScanOptions = {}): Promise<AggregateScanReport> {
  if (!Array.isArray(urls) || urls.length === 0 || urls.some(url => typeof url !== 'string')) {
    throw new TypeError('Fournir une liste non vide de chaînes URL.');
  }
  const pages: PageScanResult[] = [];
  let obtained = 0;
  let max = 0;
  let completed = 0;
  for (const url of [...urls]) {
    const controller = new PlaywrightController({ headless: options.headless ?? true });
    try {
      await controller.startScan(url);
      const report = await controller.finishScan();
      pages.push({ url, status: 'completed', report, issues: collectIssues(report) });
      obtained += report.totalScore;
      max += report.maxScore;
      completed++;
    } catch (error) {
      pages.push({ url, status: 'failed', error: error instanceof Error ? error.message : String(error) });
    } finally {
      await controller.close();
    }
  }
  return {
    timestamp: new Date().toISOString(),
    pages,
    summary: { requested: pages.length, completed, failed: pages.length - completed },
    globalScore: completed ? { obtained, max, percentage: max > 0 ? obtained / max * 100 : 0 } : null,
  };
}
