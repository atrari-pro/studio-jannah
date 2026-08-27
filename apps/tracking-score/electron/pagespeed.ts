/**
 * PageSpeed Insights API Integration
 * 
 * Référence: https://developers.google.com/speed/docs/insights/rest
 * API gratuite: 25,000 requêtes/jour
 */

export interface PageSpeedScores {
  performance: number;
  accessibility: number;
  seo: number;
  bestPractices: number;
}

export interface PageSpeedResult {
  success: boolean;
  scores: PageSpeedScores | null;
  error?: string;
  metrics?: {
    firstContentfulPaint: string;
    largestContentfulPaint: string;
    totalBlockingTime: string;
    cumulativeLayoutShift: string;
    speedIndex: string;
  };
}

/**
 * Appelle l'API PageSpeed Insights (gratuite)
 * 
 * @param url URL à analyser
 * @param strategy 'mobile' ou 'desktop'
 * @returns Scores Lighthouse
 */
export async function getPageSpeedScores(
  url: string,
  strategy: 'mobile' | 'desktop' = 'mobile'
): Promise<PageSpeedResult> {
  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`;
    
    // Construire l'URL avec tous les paramètres
    const fullUrl = `${apiUrl}?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance&category=accessibility&category=seo&category=best-practices`;

    console.log(`[PageSpeed] Analyse de ${url} (${strategy})...`);

    // Timeout 60s — l'API PageSpeed peut rester silencieuse en cas de surcharge,
    // sans timeout le scan resterait bloqué indéfiniment sur cet appel.
    const response = await fetch(fullUrl, { signal: AbortSignal.timeout(60_000) });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PageSpeed] Erreur API: ${response.status} - ${errorText}`);
      return {
        success: false,
        scores: null,
        error: `API Error: ${response.status}`
      };
    }

    const data: any = await response.json();
    
    // Extraction des scores Lighthouse
    const lighthouse = data.lighthouseResult;
    const categories = lighthouse.categories;
    
    const scores: PageSpeedScores = {
      performance: Math.round((categories.performance?.score || 0) * 100),
      accessibility: Math.round((categories.accessibility?.score || 0) * 100),
      seo: Math.round((categories.seo?.score || 0) * 100),
      bestPractices: Math.round((categories['best-practices']?.score || 0) * 100)
    };

    // Extraction des métriques Core Web Vitals
    const audits = lighthouse.audits;
    const metrics = {
      firstContentfulPaint: audits['first-contentful-paint']?.displayValue || 'N/A',
      largestContentfulPaint: audits['largest-contentful-paint']?.displayValue || 'N/A',
      totalBlockingTime: audits['total-blocking-time']?.displayValue || 'N/A',
      cumulativeLayoutShift: audits['cumulative-layout-shift']?.displayValue || 'N/A',
      speedIndex: audits['speed-index']?.displayValue || 'N/A'
    };

    console.log('[PageSpeed] Scores récupérés:', scores);
    
    return {
      success: true,
      scores,
      metrics
    };

  } catch (error) {
    console.error('[PageSpeed] Erreur:', error);
    return {
      success: false,
      scores: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Score le module Performance (20 points)
 * 
 * Référence: SCORING-METHODOLOGY.md - Module D
 * 
 * @param scores Scores PageSpeed Insights
 * @returns Module score
 */
export function scorePerformance(scores: PageSpeedScores | null): {
  obtained: number;
  max: number;
  percentage: number;
  level: 'excellent' | 'good' | 'warning' | 'critical';
  details: Array<{
    criterion: string;
    points: number;
    maxPoints: number;
    status: 'pass' | 'fail' | 'partial';
    method: 'auto';
    reason: string;
  }>;
} {
  const details: Array<{
    criterion: string;
    points: number;
    maxPoints: number;
    status: 'pass' | 'fail' | 'partial';
    method: 'auto';
    reason: string;
  }> = [];
  let score = 0;

  if (!scores) {
    return {
      obtained: 0,
      max: 20,
      percentage: 0,
      level: 'critical',
      details: [{
        criterion: 'PageSpeed Insights non disponible',
        points: 0,
        maxPoints: 20,
        status: 'fail',
        method: 'auto',
        reason: 'API PageSpeed Insights inaccessible ou timeout'
      }]
    };
  }

  // 1. Performance score > 90 (8 pts)
  if (scores.performance >= 90) {
    score += 8;
    details.push({
      criterion: 'Performance score > 90',
      points: 8,
      maxPoints: 8,
      status: 'pass',
      method: 'auto',
      reason: `Performance: ${scores.performance}/100`
    });
  } else if (scores.performance >= 50) {
    const partialPoints = Math.round((scores.performance / 90) * 8);
    score += partialPoints;
    details.push({
      criterion: 'Performance score > 90',
      points: partialPoints,
      maxPoints: 8,
      status: 'partial',
      method: 'auto',
      reason: `Performance: ${scores.performance}/100 (score moyen)`
    });
  } else {
    score -= 5; // Pénalité
    details.push({
      criterion: 'Performance score > 90',
      points: -5,
      maxPoints: 8,
      status: 'fail',
      method: 'auto',
      reason: `Performance: ${scores.performance}/100 — CRITIQUE (impact UX + SEO)`
    });
  }

  // 2. Accessibilité > 90 (4 pts)
  if (scores.accessibility >= 90) {
    score += 4;
    details.push({
      criterion: 'Accessibilité score > 90',
      points: 4,
      maxPoints: 4,
      status: 'pass',
      method: 'auto',
      reason: `Accessibilité: ${scores.accessibility}/100`
    });
  } else if (scores.accessibility >= 50) {
    const partialPoints = Math.round((scores.accessibility / 90) * 4);
    score += partialPoints;
    details.push({
      criterion: 'Accessibilité score > 90',
      points: partialPoints,
      maxPoints: 4,
      status: 'partial',
      method: 'auto',
      reason: `Accessibilité: ${scores.accessibility}/100`
    });
  } else {
    score -= 2; // Pénalité
    details.push({
      criterion: 'Accessibilité score > 90',
      points: -2,
      maxPoints: 4,
      status: 'fail',
      method: 'auto',
      reason: `Accessibilité: ${scores.accessibility}/100 — Non-conformité WCAG`
    });
  }

  // 3. SEO > 90 (4 pts)
  if (scores.seo >= 90) {
    score += 4;
    details.push({
      criterion: 'SEO score > 90',
      points: 4,
      maxPoints: 4,
      status: 'pass',
      method: 'auto',
      reason: `SEO: ${scores.seo}/100`
    });
  } else {
    const partialPoints = Math.round((scores.seo / 90) * 4);
    score += partialPoints;
    details.push({
      criterion: 'SEO score > 90',
      points: partialPoints,
      maxPoints: 4,
      status: 'partial',
      method: 'auto',
      reason: `SEO: ${scores.seo}/100`
    });
  }

  // 4. Best Practices > 90 (4 pts)
  if (scores.bestPractices >= 90) {
    score += 4;
    details.push({
      criterion: 'Best Practices score > 90',
      points: 4,
      maxPoints: 4,
      status: 'pass',
      method: 'auto',
      reason: `Best Practices: ${scores.bestPractices}/100`
    });
  } else {
    const partialPoints = Math.round((scores.bestPractices / 90) * 4);
    score += partialPoints;
    details.push({
      criterion: 'Best Practices score > 90',
      points: partialPoints,
      maxPoints: 4,
      status: 'partial',
      method: 'auto',
      reason: `Best Practices: ${scores.bestPractices}/100`
    });
  }

  const maxScore = 20;
  const percentage = Math.max(0, (score / maxScore) * 100);
  const level = percentage >= 90 ? 'excellent' : percentage >= 60 ? 'good' : percentage >= 0 ? 'warning' : 'critical';

  return { obtained: Math.max(0, score), max: maxScore, percentage, level, details };
}
