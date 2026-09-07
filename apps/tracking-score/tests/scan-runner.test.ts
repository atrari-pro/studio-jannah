import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { chromium, type Page } from 'playwright';
import { PlaywrightController } from '../electron/playwright-controller.js';
import * as cmpDetection from '../electron/cmp-detection.js';
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

beforeEach(() => {
  vi.spyOn(PlaywrightController.prototype, 'measureAutomatedConsent').mockResolvedValue(false);
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); });

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

  it('mesure avant/après le clic et signale les pages limitées dans l’agrégat', async () => {
    const calls: string[] = [];
    vi.spyOn(PlaywrightController.prototype, 'startScan').mockImplementation(async () => { calls.push('pre'); });
    vi.mocked(PlaywrightController.prototype.measureAutomatedConsent).mockImplementationOnce(async () => {
      calls.push('click:success'); return true;
    }).mockImplementationOnce(async () => { calls.push('click:failure'); return false; });
    vi.spyOn(PlaywrightController.prototype, 'finishScan').mockImplementation(async () => {
      calls.push('finish'); return report();
    });
    vi.spyOn(PlaywrightController.prototype, 'close').mockImplementation(async () => { calls.push('close'); });
    const result = await scanUrls(['a', 'b']);
    expect(calls).toEqual(['pre', 'click:success', 'finish', 'close', 'pre', 'click:failure', 'finish', 'close']);
    expect(result.pages[0]).toMatchObject({ consentMeasurement: { status: 'post_consent' } });
    expect(result.pages[1]).toMatchObject({ consentMeasurement: {
      status: 'non_determine', reason: expect.stringContaining("mesure limitée à l'état pré-consentement"),
    } });
    expect(result.consentMeasurement).toEqual({ postConsent: 1, preConsentOnly: 1, scoreIsLimited: true });
  });

  it.each([true, false, 'throws'] as const)('préserve le CMP initial et la fenêtre réseau, clic=%s', async (outcome) => {
    vi.mocked(PlaywrightController.prototype.measureAutomatedConsent).mockRestore();
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const controller = new PlaywrightController();
    // Accès de test aux points internes pour exercer la vraie orchestration,
    // sans navigateur ni appel PageSpeed.
    const internals = controller as unknown as {
      page: Page; scanStartTime: number; detectTools: (includeCmp?: boolean) => Promise<void>;
    };
    internals.scanStartTime = 0;
    const waits: number[] = [];
    internals.page = { waitForTimeout: vi.fn(async (ms: number) => {
      waits.push(ms); vi.setSystemTime(Date.now() + ms);
    }) } as unknown as Page;
    const initialCmp = { vendorId: 'test-cmp' };
    Object.assign(controller.getState().observations, { cmpAudit: initialCmp });
    const detect = vi.spyOn(internals, 'detectTools').mockImplementation(async (includeCmp) => {
      expect(includeCmp).toBe(false);
      controller.getState().observations.tms = { detected: true, name: 'GTM', method: 'auto' };
    });
    const click = vi.spyOn(cmpDetection, 'acceptCmpConsent').mockImplementation(async () => {
      expect(Date.now()).toBeGreaterThanOrEqual(3000);
      if (outcome === 'throws') throw new Error('CMP inaccessible');
      return outcome;
    });
    expect(await controller.measureAutomatedConsent()).toBe(outcome === true);
    expect(click).toHaveBeenCalledOnce();
    expect(waits).toEqual(outcome === true ? [2000, 2000] : [2000]);
    expect(detect).toHaveBeenCalledTimes(outcome === true ? 1 : 0);
    expect(controller.getState().observations.cmpAudit).toBe(initialCmp);
    expect(controller.getState().observations.states.accepted).toBe(outcome === true);
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


describe('CTA partagé avec auditCmp', () => {
  it.each(['accepted', 'missing', 'hidden', 'timeout'] as const)('sélecteur vendor + mots-clés : %s', async (scenario) => {
    const rect = { width: 100, height: 40, x: 0, y: 0 };
    const refuse = { innerText: 'Continuer sans accepter', getBoundingClientRect: () => rect, click: vi.fn() };
    const accept = { innerText: 'Tout accepter', getBoundingClientRect: () => rect, click: vi.fn() };
    if (scenario === 'timeout') accept.click.mockRejectedValue(new Error('not actionable'));
    const root = {
      getBoundingClientRect: () => scenario === 'hidden' ? { ...rect, width: 0 } : rect,
      querySelectorAll: () => scenario === 'missing' ? [refuse] : [refuse, accept],
    };
    const querySelector = vi.fn((selector: string) => selector === '#onetrust-banner-sdk' ? root : null);
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', { querySelector });
    const dispose = vi.fn();
    const page = {
      // Exerce la vraie fonction navigateur avec un DOM minimal contrôlé.
      evaluateHandle: vi.fn(async (fn: (args: unknown) => unknown, args: unknown) => {
        const selected = fn(args);
        return { asElement: () => selected === accept || selected === refuse ? selected : null, dispose };
      }),
    } as unknown as Page;
    expect(await cmpDetection.acceptCmpConsent(page, null)).toBe(scenario === 'accepted');
    expect(querySelector).toHaveBeenCalledWith('#onetrust-banner-sdk');
    expect(refuse.click).not.toHaveBeenCalled();
    expect(accept.click).toHaveBeenCalledTimes(scenario === 'accepted' || scenario === 'timeout' ? 1 : 0);
    expect(dispose).toHaveBeenCalledOnce();
  });
});
