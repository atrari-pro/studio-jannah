import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { ScanState, DetectionResult } from './types.js';
import { auditCmp } from './cmp-detection.js';
import {
  scoreCMP,
  scoreTMS,
  scoreAnalytics,
  scoreDataLayer,
  calculateTotalScore,
  collectManualReview,
  CompleteScanReport,
  ModuleScore
} from './scoring.js';
import { getPageSpeedScores, scorePerformance } from './pagespeed.js';

export class PlaywrightController {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private scanStartTime: number = 0;
  private state: ScanState = {
    status: 'idle',
    url: '',
    observations: {
      cmp: null,
      cmpAudit: null,
      tms: null,
      analytics: null,
      attribution: [],
      abTesting: [],
      dataLayer: [],
      networkRequests: [],
      states: {
        initial: false,
        accepted: false,
        refused: false,
      },
    },
  };
  
  // Snapshot pour tests comportementaux
  private networkRequestsBeforeConsent: Array<{ url: string; timestamp: number; category: string }> = [];

  async startScan(rawUrl: string) {
    // Validation + normalisation URL (ajoute https:// si schéma absent)
    const url = this.normalizeUrl(rawUrl);

    // Ferme le navigateur d'un scan précédent avant d'en ouvrir un nouveau
    // (évite l'accumulation de fenêtres Chromium orphelines)
    if (this.browser) {
      await this.close();
    }

    // Réinitialise complètement l'état — sinon un 2e scan hérite du
    // dataLayer/network/consentement du scan précédent
    this.state = {
      status: 'scanning',
      url,
      observations: {
        cmp: null,
        cmpAudit: null,
        tms: null,
        analytics: null,
        attribution: [],
        abTesting: [],
        dataLayer: [],
        networkRequests: [],
        states: {
          initial: false,
          accepted: false,
          refused: false,
        },
      },
    };
    this.scanStartTime = Date.now();
    this.networkRequestsBeforeConsent = [];

    // Lance Playwright en mode HEADED (visible)
    this.browser = await chromium.launch({
      headless: false,
      args: ['--start-maximized'],
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });

    this.page = await this.context.newPage();

    // Capture passive des requêtes réseau avec parsing détaillé
    this.page.on('request', (request) => {
      const url = new URL(request.url());
      const params: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      
      // Catégorisation des requêtes
      let category: 'tracking' | 'analytics' | 'media' | 'resource' | 'other' = 'other';
      const urlStr = request.url().toLowerCase();
      
      if (urlStr.includes('google-analytics.com') || urlStr.includes('analytics.google.com') || 
          urlStr.includes('adobe.com') || urlStr.includes('xiti.com') || 
          urlStr.includes('matomo') || urlStr.includes('piwik')) {
        category = 'analytics';
      } else if (urlStr.includes('facebook.com') || urlStr.includes('tiktok.com') || 
                 urlStr.includes('ads.linkedin.com') || urlStr.includes('doubleclick.net') ||
                 urlStr.includes('googleadservices.com')) {
        category = 'media';
      } else if (urlStr.includes('collect') || urlStr.includes('track') || 
                 urlStr.includes('event') || urlStr.includes('pixel')) {
        category = 'tracking';
      } else if (request.resourceType() === 'image' || request.resourceType() === 'stylesheet' ||
                 request.resourceType() === 'font' || request.resourceType() === 'media') {
        category = 'resource';
      }

      const requestData = {
        url: request.url(),
        method: request.method(),
        timestamp: Date.now() - this.scanStartTime,
        type: request.resourceType(),
        params,
        category,
      };

      this.state.observations.networkRequests.push(requestData);
      
      // Capture requêtes avant consentement (premières 3 secondes)
      if (requestData.timestamp < 3000 && (category === 'tracking' || category === 'analytics' || category === 'media')) {
        this.networkRequestsBeforeConsent.push({
          url: requestData.url,
          timestamp: requestData.timestamp,
          category: requestData.category || 'other'
        });
      }
    });

    // Navigation vers l'URL
    await this.page.goto(url, { waitUntil: 'networkidle' });

    // Détection automatique après chargement
    await this.detectTools();

    // Marque l'état initial comme capturé
    this.state.observations.states.initial = true;
  }

  private async detectTools() {
    if (!this.page) return;

    // Module A — Détection CMP (avec docs officielles)
    const cmpResult = await this.page.evaluate(() => {
      // @ts-ignore - window est disponible dans le contexte du navigateur
      const w = window;
      const cmps = [
        { 
          name: 'Didomi', 
          check: () => typeof w.Didomi !== 'undefined',
          docs: 'https://developers.didomi.io/'
        },
        { 
          name: 'Axeptio', 
          check: () => typeof w.axeptioSettings !== 'undefined',
          docs: 'https://developers.axeptio.eu/'
        },
        { 
          name: 'Cookiebot', 
          check: () => typeof w.Cookiebot !== 'undefined',
          docs: 'https://www.cookiebot.com/en/developer/'
        },
        { 
          name: 'Tarteaucitron', 
          check: () => typeof w.tarteaucitron !== 'undefined',
          docs: 'https://tarteaucitron.io/en/install/'
        },
        { 
          name: 'OneTrust', 
          check: () => typeof w.OneTrust !== 'undefined',
          docs: 'https://my.onetrust.com/s/topic/0TO1Q000000ItRyWAK/cookie-compliance'
        },
      ];

      for (const cmp of cmps) {
        if (cmp.check()) {
          return { 
            detected: true, 
            name: cmp.name, 
            method: 'auto',
            details: { docs: cmp.docs }
          };
        }
      }
      return { detected: false, name: null, method: 'auto' };
    });

    this.state.observations.cmp = cmpResult as DetectionResult;

    // Module A v2 — audit CMP enrichi (parité CTA, catégories, typologie, blocage)
    // Fait une passe DOM supplémentaire + éventuellement un clic sur "ouvrir les
    // options" pour lister les catégories — voir electron/cmp-detection.ts
    if (this.page) {
      this.state.observations.cmpAudit = await auditCmp(this.page, this.state.observations.cmp);
    }

    // Module B — Détection TMS (avec containerId)
    const tmsResult = await this.page.evaluate(() => {
      // @ts-ignore - window est disponible dans le contexte du navigateur
      const w = window;
      // @ts-ignore - document est disponible dans le contexte du navigateur
      const doc = document;
      
      // Google Tag Manager
      if (typeof w.google_tag_manager !== 'undefined') {
        // Extraction du container ID depuis le DOM
        const gtmScripts = Array.from(doc.querySelectorAll('script[src*="googletagmanager.com"]'));
        let containerId = null;
        
        for (const script of gtmScripts) {
          // @ts-ignore
          const src = script.src;
          const match = src.match(/GTM-[A-Z0-9]+/);
          if (match) {
            containerId = match[0];
            break;
          }
        }
        
        return { 
          detected: true, 
          name: 'Google Tag Manager', 
          method: 'auto',
          details: { 
            containerId,
            docs: 'https://developers.google.com/tag-platform/tag-manager'
          }
        };
      }
      
      // Adobe Launch
      if (typeof w._satellite !== 'undefined') {
        return { 
          detected: true, 
          name: 'Adobe Launch', 
          method: 'auto',
          details: {
            docs: 'https://experienceleague.adobe.com/docs/experience-platform/tags/home.html'
          }
        };
      }
      
      return { detected: false, name: null, method: 'auto' };
    });

    this.state.observations.tms = tmsResult as DetectionResult;

    // Module B2 — Détection Analytics (avec propertyId)
    const analyticsResult = await this.page.evaluate(() => {
      // @ts-ignore - window est disponible dans le contexte du navigateur
      const w = window;
      // @ts-ignore - document est disponible dans le contexte du navigateur
      const doc = document;
      
      // Google Analytics 4
      if (typeof w.gtag !== 'undefined' || (w.dataLayer && Array.isArray(w.dataLayer))) {
        // Extraction du Measurement ID depuis le DOM ou dataLayer
        const gaScripts = Array.from(doc.querySelectorAll('script[src*="googletagmanager.com/gtag"]'));
        let propertyId = null;
        
        for (const script of gaScripts) {
          // @ts-ignore
          const src = script.src;
          const match = src.match(/G-[A-Z0-9]+/);
          if (match) {
            propertyId = match[0];
            break;
          }
        }
        
        // Si pas trouvé dans script, chercher dans dataLayer
        if (!propertyId && w.dataLayer) {
          for (const item of w.dataLayer) {
            if (item['gtm.start'] || item[1]?.match(/G-[A-Z0-9]+/)) {
              const match = JSON.stringify(item).match(/G-[A-Z0-9]+/);
              if (match) {
                propertyId = match[0];
                break;
              }
            }
          }
        }
        
        return { 
          detected: true, 
          name: 'Google Analytics 4', 
          method: 'auto',
          details: {
            propertyId,
            docs: 'https://developers.google.com/analytics/devguides/collection/ga4'
          }
        };
      }
      
      // Adobe Analytics
      if (typeof w.s !== 'undefined') {
        return { 
          detected: true, 
          name: 'Adobe Analytics', 
          method: 'auto',
          details: {
            docs: 'https://experienceleague.adobe.com/docs/analytics/implementation/home.html'
          }
        };
      }
      
      return { detected: false, name: null, method: 'auto' };
    });

    this.state.observations.analytics = analyticsResult as DetectionResult;

    // Module D — Détection Attribution
    const attributionResults = await this.page.evaluate(() => {
      // @ts-ignore
      const w = window;
      const tools = [];
      
      // Adjust
      if (typeof w.Adjust !== 'undefined' || typeof w.AdjustConfig !== 'undefined') {
        tools.push({ 
          detected: true, 
          name: 'Adjust', 
          method: 'auto',
          details: { docs: 'https://help.adjust.com/en/article/web-sdk' }
        });
      }
      
      // AppsFlyer
      if (typeof w.AF !== 'undefined' || typeof w.appsflyerSDK !== 'undefined') {
        tools.push({ 
          detected: true, 
          name: 'AppsFlyer', 
          method: 'auto',
          details: { docs: 'https://dev.appsflyer.com/hc/docs/web-sdk-reference' }
        });
      }
      
      // Branch
      if (typeof w.branch !== 'undefined') {
        tools.push({ 
          detected: true, 
          name: 'Branch', 
          method: 'auto',
          details: { docs: 'https://help.branch.io/developers-hub/docs/web-sdk' }
        });
      }
      
      // Kochava
      if (typeof w.Kochava !== 'undefined') {
        tools.push({ 
          detected: true, 
          name: 'Kochava', 
          method: 'auto',
          details: { docs: 'https://support.kochava.com/sdk-integration/web-sdk' }
        });
      }
      
      return tools;
    });

    this.state.observations.attribution = attributionResults as DetectionResult[];

    // Module E — Détection A/B Testing
    const abTestingResults = await this.page.evaluate(() => {
      // @ts-ignore
      const w = window;
      const tools = [];
      
      // Optimizely / Optimizely X
      if (typeof w.optimizely !== 'undefined' || typeof w.optly !== 'undefined') {
        tools.push({ 
          detected: true, 
          name: 'Optimizely', 
          method: 'auto',
          details: { docs: 'https://docs.developers.optimizely.com/web-experimentation' }
        });
      }
      
      // VWO (Visual Website Optimizer)
      if (typeof w._vwo_code !== 'undefined' || typeof w.VWO !== 'undefined') {
        tools.push({ 
          detected: true, 
          name: 'VWO', 
          method: 'auto',
          details: { docs: 'https://developers.vwo.com/reference/introduction' }
        });
      }
      
      // Google Optimize
      if (typeof w.gtag !== 'undefined' && w.dataLayer) {
        const hasOptimize = w.dataLayer.some((item: any) => 
          item['gtm.uniqueEventId'] || item.event === 'optimize.activate'
        );
        if (hasOptimize) {
          tools.push({ 
            detected: true, 
            name: 'Google Optimize', 
            method: 'auto',
            details: { docs: 'https://support.google.com/optimize' }
          });
        }
      }
      
      // AB Tasty
      if (typeof w.ABTasty !== 'undefined' || typeof w.abtasty !== 'undefined') {
        tools.push({ 
          detected: true, 
          name: 'AB Tasty', 
          method: 'auto',
          details: { docs: 'https://developers.abtasty.com/' }
        });
      }
      
      // Kameleoon
      if (typeof w.Kameleoon !== 'undefined') {
        tools.push({ 
          detected: true, 
          name: 'Kameleoon', 
          method: 'auto',
          details: { docs: 'https://developers.kameleoon.com/' }
        });
      }
      
      return tools;
    });

    this.state.observations.abTesting = abTestingResults as DetectionResult[];

    // Module C — Inspection dataLayer (avec catégorisation)
    const dataLayerEvents = await this.page.evaluate(() => {
      // @ts-ignore - window est disponible dans le contexte du navigateur
      const w = window;
      const dl = w.dataLayer;
      
      // Fonction de catégorisation des events
      const categorizeEvent = (eventName: string) => {
        const name = eventName.toLowerCase();
        if (name.includes('page') || name.includes('view') || name.includes('navigation')) {
          return 'navigation';
        }
        if (name.includes('click') || name.includes('scroll') || name.includes('video') || name.includes('engagement')) {
          return 'engagement';
        }
        if (name.includes('cart') || name.includes('purchase') || name.includes('checkout') || name.includes('product')) {
          return 'ecommerce';
        }
        if (name.includes('form') || name.includes('submit') || name.includes('lead')) {
          return 'form';
        }
        if (name.includes('consent') || name.includes('cookie')) {
          return 'consent';
        }
        return 'custom';
      };
      
      if (Array.isArray(dl)) {
        return dl.slice(0, 50).map((item: any, index: number) => ({
          index,
          event: item.event || 'unknown',
          timestamp: Date.now(),
          data: item,
          category: categorizeEvent(item.event || 'unknown') as 'navigation' | 'engagement' | 'ecommerce' | 'form' | 'consent' | 'custom',
        }));
      }
      return [];
    });

    this.state.observations.dataLayer = dataLayerEvents;
  }

  getState(): ScanState {
    return this.state;
  }

  async finishScan(): Promise<CompleteScanReport> {
    this.state.status = 'completed';
    const scanDuration = Date.now() - this.scanStartTime;
    
    console.log('[Scan] Génération du rapport professionnel...');
    
    // 1. Détection Consent Mode v2
    const consentModeDetected = await this.detectConsentModeV2();
    
    // 2. PageSpeed Insights (peut prendre 30-60s)
    console.log('[Scan] Appel PageSpeed Insights API...');
    const pageSpeedResult = await getPageSpeedScores(this.state.url, 'mobile');
    const performanceScores = pageSpeedResult.scores;
    
    // 3. Calcul des scores par module
    // Note : les signaux Consent Mode (gcs/gcd/G1xy) ne sont PAS traités ici —
    // ils appartiennent aux requêtes réseau générées par le TMS, cf. scoreTMS
    // et le module bonus consentModeV2 plus bas. Module A ne juge que la CMP
    // elle-même (présence, CTA, catégories, typologie, blocage).
    const cmpScore = scoreCMP(this.state.observations.cmpAudit);
    
    const tmsScore = scoreTMS(
      this.state.observations.tms,
      this.state.observations.networkRequests,
      this.state.observations.states
    );
    
    const analyticsScore = scoreAnalytics(
      this.state.observations.analytics,
      this.state.observations.dataLayer,
      this.state.observations.networkRequests
    );
    
    const dataLayerScore = scoreDataLayer(this.state.observations.dataLayer);
    
    const performanceScore = scorePerformance(performanceScores);
    
    const consentModeScore = this.scoreConsentModeV2(consentModeDetected);
    
    // 4. Calcul score total
    const totalScore = calculateTotalScore(
      cmpScore,
      tmsScore,
      analyticsScore,
      dataLayerScore,
      performanceScore,
      consentModeScore
    );
    
    // 5. Tests comportementaux
    const behavioralTests = this.generateBehavioralTests();
    
    // 6. Recommandations
    const recommendations = this.generateRecommendations(
      cmpScore,
      tmsScore,
      analyticsScore,
      dataLayerScore,
      performanceScore,
      consentModeScore,
      behavioralTests
    );
    
    // 7. Rapport complet
    const modules = {
      cmp: cmpScore,
      tms: tmsScore,
      analytics: analyticsScore,
      dataLayer: dataLayerScore,
      performance: performanceScore,
      consentModeV2: consentModeScore
    };

    const report: CompleteScanReport = {
      url: this.state.url,
      timestamp: new Date().toISOString(),
      scanDuration,
      modules,
      totalScore: totalScore.total,
      maxScore: totalScore.max,
      percentage: totalScore.percentage,
      level: totalScore.level as any,
      behavioralTests,
      recommendations,
      // Critères non_determine à revoir manuellement (règle transversale Module A)
      manualReview: collectManualReview(modules),
      rawData: {
        observations: this.state.observations,
        performanceScores: performanceScores || undefined
      }
    };
    
    console.log(`[Scan] Rapport généré - Score: ${totalScore.total}/${totalScore.max} (${Math.round(totalScore.percentage)}%)`);
    
    return report;
  }
  
  /**
   * Détecte si Consent Mode v2 est configuré
   */
  private async detectConsentModeV2(): Promise<boolean> {
    if (!this.page) return false;
    
    return await this.page.evaluate(() => {
      // @ts-ignore
      const w = window;
      
      // Cherche les paramètres Consent Mode v2 dans dataLayer
      if (w.dataLayer && Array.isArray(w.dataLayer)) {
        for (const item of w.dataLayer) {
          if (item.event === 'consent' || item[0] === 'consent') {
            const hasV2Params = 
              item.ad_storage !== undefined ||
              item.analytics_storage !== undefined ||
              item.ad_user_data !== undefined ||
              item.ad_personalization !== undefined;
            
            if (hasV2Params) return true;
          }
        }
      }
      
      // Cherche dans les requêtes Google (paramètres gcs/gcd)
      // Note: Ceci est fait côté requêtes réseau
      
      return false;
    });
  }
  
  /**
   * Score le bonus Consent Mode v2 (10 pts)
   */
  private scoreConsentModeV2(detected: boolean): ModuleScore {
    const details = [];
    let score = 0;
    
    if (detected) {
      score += 3;
      details.push({
        criterion: 'Les 4 paramètres v2 détectés',
        points: 3,
        maxPoints: 3,
        status: 'pass' as const,
        method: 'auto' as const,
        reason: 'ad_storage, analytics_storage, ad_user_data, ad_personalization détectés'
      });
    } else {
      details.push({
        criterion: 'Les 4 paramètres v2 détectés',
        points: 0,
        maxPoints: 3,
        status: 'fail' as const,
        method: 'auto' as const,
        reason: 'Paramètres Consent Mode v2 manquants'
      });
    }
    
    // Les autres critères (default=denied, update, GA4 Admin) nécessitent vérification manuelle
    details.push({
      criterion: 'Default = denied avant banner',
      points: 0,
      maxPoints: 3,
      status: 'manual' as const,
      method: 'manual' as const,
      reason: 'Vérification manuelle requise (inspect network requests)'
    });
    
    details.push({
      criterion: 'Update après consentement',
      points: 0,
      maxPoints: 2,
      status: 'manual' as const,
      method: 'manual' as const,
      reason: 'Vérification manuelle requise (paramètres gcs/gcd)'
    });
    
    details.push({
      criterion: 'GA4 Admin confirme signaux v2',
      points: 0,
      maxPoints: 2,
      status: 'manual' as const,
      method: 'manual' as const,
      reason: 'Vérification GA4 Admin > Data collection > Consent settings requise'
    });
    
    const maxScore = 10;
    const percentage = (score / maxScore) * 100;
    const level = percentage >= 80 ? 'excellent' : percentage >= 40 ? 'good' : percentage >= 0 ? 'warning' : 'critical';
    
    return { obtained: score, max: maxScore, percentage, level: level as any, details };
  }
  
  /**
   * Génère les résultats des tests comportementaux
   */
  private generateBehavioralTests() {
    // Test 1: Blocage pré-consentement
    const violatingDomainsBeforeConsent = this.networkRequestsBeforeConsent.map(r => {
      try {
        return new URL(r.url).hostname;
      } catch {
        return r.url;
      }
    });
    
    const uniqueViolatingDomains = [...new Set(violatingDomainsBeforeConsent)];
    
    return {
      preConsentBlocking: {
        status: this.networkRequestsBeforeConsent.length === 0 ? 'pass' as const : 'fail' as const,
        requestsBeforeConsent: this.networkRequestsBeforeConsent.length,
        violatingDomains: uniqueViolatingDomains
      },
      consentRefusal: {
        status: 'not_tested' as const,
        requestsAfterRefusal: 0,
        violatingDomains: []
      },
      consentModeV2: {
        status: 'not_tested' as const,
        gcsParamBeforeConsent: null,
        gcsParamAfterConsent: null
      }
    };
  }
  
  /**
   * Génère les recommandations priorisées
   */
  private generateRecommendations(
    cmpScore: ModuleScore,
    tmsScore: ModuleScore,
    analyticsScore: ModuleScore,
    dataLayerScore: ModuleScore,
    performanceScore: ModuleScore,
    consentModeScore: ModuleScore,
    behavioralTests: any
  ) {
    const critical: string[] = [];
    const high: string[] = [];
    const medium: string[] = [];
    const low: string[] = [];
    
    // Recommandations critiques (P0)
    if (behavioralTests.preConsentBlocking.status === 'fail') {
      critical.push(
        `VIOLATION RGPD: ${behavioralTests.preConsentBlocking.requestsBeforeConsent} requêtes tracking/analytics/ads avant consentement. ` +
        `Domaines: ${behavioralTests.preConsentBlocking.violatingDomains.join(', ')}. ` +
        `Action: Configurer le blocage pré-consentement dans votre CMP.`
      );
    }
    
    if (cmpScore.percentage < 50) {
      critical.push(
        'CMP non-conforme RGPD (score < 50%). ' +
        'Action: Implémenter un CMP certifié (Didomi, Axeptio, Cookiebot) avec blocage pré-consentement.'
      );
    }
    
    // Recommandations haute priorité (P1)
    if (analyticsScore.details.find(d => d.criterion.includes('duplicate') && d.status === 'fail')) {
      high.push(
        'Duplicate pageview détecté — inflation sessions/users. ' +
        'Action: Vérifier qu\'un seul tag GA4 Configuration fire par page (GTM Preview mode).'
      );
    }
    
    if (analyticsScore.details.find(d => d.criterion.includes('Paramètres requis') && d.status === 'fail')) {
      high.push(
        'Events purchase incomplets (transaction_id, value, currency manquants) — revenue faussé. ' +
        'Action: Compléter tous les paramètres requis dans dataLayer.push() e-commerce.'
      );
    }
    
    if (performanceScore.percentage < 50) {
      high.push(
        `Performance critique (${Math.round(performanceScore.percentage)}%) — impact UX + SEO. ` +
        'Action: Audit Lighthouse détaillé + optimisations (images, cache, scripts).'
      );
    }
    
    // Recommandations moyenne priorité (P2)
    if (dataLayerScore.details.find(d => d.criterion.includes('snake_case') && d.status === 'fail')) {
      medium.push(
        'Nomenclature dataLayer non-standard (camelCase ou PascalCase détectés). ' +
        'Action: Normaliser tous les event names en snake_case pour cohérence GA4.'
      );
    }
    
    if (!tmsScore.details.find(d => d.criterion.includes('Container ID') && d.status === 'pass')) {
      medium.push(
        'Container ID GTM non identifié — risque contamination cross-environnements. ' +
        'Action: Vérifier que le container ID est bien extrait (GTM-XXXXXX) et documenté.'
      );
    }
    
    if (consentModeScore.percentage < 30) {
      medium.push(
        'Consent Mode v2 non implémenté — perte données modélisées Google + audiences. ' +
        'Action: Implémenter les 4 paramètres v2 (ad_storage, analytics_storage, ad_user_data, ad_personalization).'
      );
    }
    
    // Recommandations basse priorité (P3)
    if (dataLayerScore.details.find(d => d.criterion.includes('Préfixe') && d.status === 'partial')) {
      low.push(
        'Préfixes custom events inconsistants. ' +
        'Action: Adopter un préfixe uniforme (ex: sj_, custom_) pour tous les events custom.'
      );
    }
    
    return { critical, high, medium, low };
  }

  markConsentAccepted() {
    this.state.observations.states.accepted = true;
  }

  markConsentRefused() {
    this.state.observations.states.refused = true;
  }

  /**
   * Valide et normalise l'URL saisie par l'utilisateur.
   * Ajoute https:// si aucun schéma n'est fourni, rejette les schémas
   * non-http(s) (ex: file://, javascript:) et les URLs malformées.
   */
  private normalizeUrl(rawUrl: string): string {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      throw new Error('URL vide');
    }

    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    let parsed: URL;
    try {
      parsed = new URL(withScheme);
    } catch {
      throw new Error(`URL invalide: "${rawUrl}"`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Schéma non autorisé: "${parsed.protocol}"`);
    }

    return parsed.toString();
  }

  async close() {
    try {
      if (this.context) {
        await this.context.close();
      }
    } catch {
      // Contexte déjà fermé (ex: fenêtre fermée manuellement) — ignoré
    }
    try {
      if (this.browser) {
        await this.browser.close();
      }
    } catch {
      // Navigateur déjà fermé — ignoré
    }
    this.context = null;
    this.page = null;
    this.browser = null;
  }
}
