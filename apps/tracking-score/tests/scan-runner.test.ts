import { afterEach, describe, expect, it, vi } from 'vitest';
import { chromium } from 'playwright';
import { PlaywrightController } from '../electron/playwright-controller.js';
import { scanUrls } from '../electron/scan-runner.js';
import type { CompleteScanReport } from '../electron/scoring.js';

function report(totalScore = 60, maxScore = 120): CompleteScanReport {
  const module = { obtained: 0, max: 0, percentage: 0, level: 'critical' as const, details: [] };
  return {
    url: 'https://example.com/', timestamp: '', scanDuration: 0,
    totalScore, maxScore, percentage: totalScore / maxScore * 100, level: 'medium',
    modules: { cmp: { ...module, details: [
      { criterion: 'missing', points: 0, maxPoints: 5, status: 'fail', method: 'auto' },
      { criterion: 'unknown', points: 0, maxPoints: 5, status: 'non_determine', method: 'heuristic' },
    ] }, tms: module, analytics: module, dataLayer: module, performance: module, consentModeV2: module },
    behavioralTests: {
      preConsentBlocking: { status: 'fail', requestsBeforeConsent: 1, violatingDomains: ['example.com'] },
      consentRefusal: { status: 'not_tested', requestsAfterRefusal: 0, violatingDomains: [] },
      consentModeV2: { status: 'not_tested', gcsParamBeforeConsent: null, gcsParamAfterConsent: null },
    },
    recommendations: { critical: [], high: [], medium: [], low: [] }, manualReview: [],
    rawData: { observations: new PlaywrightController().getState().observations },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('scanUrls', () => {
  it('séquence start/finish/close, conserve les rapports et les maxima variables', async () => {
    const calls: string[] = [];
    const instances = new Set<PlaywrightController>();
    vi.spyOn(PlaywrightController.prototype, 'startScan').mockImplementation(async function (url) {
      instances.add(this); calls.push(`start:${url}`);
      await Promise.resolve();
    });
    const reports = [report(), report(90, 100)];
    vi.spyOn(PlaywrightController.prototype, 'finishScan').mockImplementation(async () => {
      calls.push('finish'); return reports[calls.filter(x => x === 'finish').length - 1];
    });
    vi.spyOn(PlaywrightController.prototype, 'close').mockImplementation(async () => { calls.push('close'); });
    const result = await scanUrls(['a', 'b']);
    expect(calls).toEqual(['start:a', 'finish', 'close', 'start:b', 'finish', 'close']);
    expect(instances.size).toBe(2);
    expect(result.globalScore).toEqual({ obtained: 150, max: 220, percentage: 150 / 220 * 100 });
    expect(result.pages[0]).toMatchObject({ report: reports[0], issues: [
      { source: 'criterion', detail: { status: 'fail' } }, { source: 'behavioralTest' },
    ] });
  });

  it('ferme après erreur de navigation ou rapport et continue sur la page suivante', async () => {
    vi.spyOn(PlaywrightController.prototype, 'startScan').mockRejectedValueOnce(new Error('navigation')).mockResolvedValue(undefined);
    vi.spyOn(PlaywrightController.prototype, 'finishScan').mockRejectedValueOnce(new Error('report')).mockResolvedValue(report());
    const close = vi.spyOn(PlaywrightController.prototype, 'close').mockResolvedValue(undefined);
    const result = await scanUrls(['a', 'b', 'c']);
    expect(result.summary).toEqual({ requested: 3, completed: 1, failed: 2 });
    expect(result.pages.slice(0, 2)).toEqual([
      { url: 'a', status: 'failed', error: 'navigation' }, { url: 'b', status: 'failed', error: 'report' },
    ]);
    expect(close).toHaveBeenCalledTimes(3);
    expect(result.globalScore?.obtained).toBe(60);
  });

  it('ne fabrique aucun score si toutes les pages échouent', async () => {
    vi.spyOn(PlaywrightController.prototype, 'startScan').mockRejectedValue(new Error('offline'));
    vi.spyOn(PlaywrightController.prototype, 'close').mockResolvedValue(undefined);
    expect((await scanUrls(['a'])).globalScore).toBeNull();
    await expect(scanUrls([])).rejects.toThrow('liste non vide');
  });

  it('conserve Electron visible et utilise headless pour Node', async () => {
    const launch = vi.spyOn(chromium, 'launch').mockRejectedValue(new Error('stop before browser'));
    await expect(new PlaywrightController().startScan('https://example.com')).rejects.toThrow();
    expect(launch).toHaveBeenLastCalledWith({ headless: false, args: ['--start-maximized'] });
    await scanUrls(['https://example.com']);
    expect(launch).toHaveBeenLastCalledWith({ headless: true, args: ['--start-maximized'] });
    await scanUrls(['https://example.com'], { headless: false });
    expect(launch).toHaveBeenLastCalledWith({ headless: false, args: ['--start-maximized'] });
  });
});
