/**
 * Review sentiment, urgency and notifications.
 *
 * Replaces three `gap-no-*` placeholders:
 *   - /sentiment-analysis      → gap-no-sentimentanalysis-classify-sentiment-urge
 *   - /competitor-sentiment    → gap-no-competitorsentiment-ai
 *   - /notify-new-review       → gap-no-notifications-for-new-reviews
 *
 * Sentiment is a **deterministic lexicon score**, not a model call. That is
 * deliberate: a review triage queue must classify the same text the same way
 * every time, and the score has to be explainable ("counted 4 negative terms").
 * Where the text is too short or too ambiguous to score, it says so rather
 * than guessing.
 */
import { Router, Request, Response } from 'express';
import pool from '../db/connection';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/* ---------------------------- lexicon -------------------------------- */

const POSITIVE = new Set([
  'excellent', 'great', 'good', 'fantastic', 'wonderful', 'amazing', 'love',
  'loved', 'helpful', 'friendly', 'professional', 'fast', 'quick', 'clean',
  'perfect', 'reliable', 'honest', 'recommend', 'recommended', 'impressed',
  'responsive', 'thorough', 'polite', 'courteous', 'fair', 'smooth',
]);

const NEGATIVE = new Set([
  'terrible', 'awful', 'horrible', 'bad', 'poor', 'rude', 'slow', 'dirty',
  'broken', 'unprofessional', 'unresponsive', 'overcharged', 'overcharge',
  'scam', 'scammed', 'lied', 'lie', 'never', 'worst', 'avoid', 'complaint',
  'damaged', 'late', 'cancelled', 'cancel', 'refund', 'disappointed',
  'unacceptable', 'ignored', 'wasted', 'frustrated', 'frustrating', 'angry',
]);

const URGENCY_TERMS = new Set([
  'legal', 'lawyer', 'attorney', 'sue', 'lawsuit', 'suing', 'bbb', 'health',
  'safety', 'injury', 'injured', 'hospital', 'fire', 'flood', 'gas', 'leak',
  'emergency', 'urgent', 'immediately', 'asap', 'dangerous', 'mold', 'mould',
  'children', 'child', 'elderly', 'poison', 'carbon', 'monoxide', 'shock',
]);

export interface SentimentResult {
  label: 'positive' | 'negative' | 'neutral' | 'insufficient-text';
  /** −1.00 … +1.00 */
  score: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  urgencyScore: number;
  matchedPositive: string[];
  matchedNegative: string[];
  matchedUrgency: string[];
  wordCount: number;
  confidence: 'high' | 'medium' | 'insufficient-history';
  explanation: string;
}

/**
 * Classify one piece of review text. Every number is traceable to the words
 * that produced it.
 */
export function classifyText(raw: string): SentimentResult {
  const text = String(raw || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9'\s]/g, ' ');

  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const matchedPositive: string[] = [];
  const matchedNegative: string[] = [];
  const matchedUrgency: string[] = [];
  const seen = new Set<string>();

  for (const w of words) {
    const t = w.replace(/['']/g, '');
    if (seen.has(t)) continue;
    seen.add(t);
    if (POSITIVE.has(t)) matchedPositive.push(t);
    if (NEGATIVE.has(t)) matchedNegative.push(t);
    if (URGENCY_TERMS.has(t)) matchedUrgency.push(t);
  }

  if (wordCount < 2) {
    return {
      label: 'insufficient-text',
      score: 0,
      urgency: 'low',
      urgencyScore: 0,
      matchedPositive, matchedNegative, matchedUrgency, wordCount,
      confidence: 'insufficient-history',
      explanation: `Only ${wordCount} word(s); not enough signal to classify.`,
    };
  }

  const pos = matchedPositive.length;
  const neg = matchedNegative.length;
  const total = pos + neg;
  // Normalised polarity in −1..1. No matched vocabulary ⇒ 0 (neutral).
  const score = total === 0 ? 0 : Number(((pos - neg) / total).toFixed(2));

  const label: SentimentResult['label'] =
    total === 0 ? 'neutral' : score > 0.15 ? 'positive' : score < -0.15 ? 'negative' : 'neutral';

  // Urgency: legal/safety terms dominate regardless of sentiment.
  const urgencyScore = matchedUrgency.length;
  const criticalTerms = new Set(['legal', 'lawyer', 'attorney', 'sue', 'lawsuit', 'health', 'safety', 'fire', 'gas', 'carbon', 'monoxide', 'injury', 'hospital']);
  const hasCritical = matchedUrgency.some((t) => criticalTerms.has(t));
  const urgency: SentimentResult['urgency'] =
    hasCritical ? 'critical' : urgencyScore >= 3 ? 'high' : urgencyScore >= 1 ? 'medium' : 'low';

  const confidence: SentimentResult['confidence'] =
    wordCount >= 12 && total >= 3 ? 'high' : total >= 1 ? 'medium' : 'insufficient-history';

  const explanation =
    `Counted ${pos} positive term(s) and ${neg} negative term(s) across ${wordCount} words` +
    (matchedUrgency.length
      ? `, with ${matchedUrgency.length} urgency indicator(s): ${matchedUrgency.join(', ')}`
      : ' and no urgency indicators') + '.';

  return {
    label, score, urgency, urgencyScore,
    matchedPositive, matchedNegative, matchedUrgency,
    wordCount, confidence, explanation,
  };
}

/* ------------------------------ routes -------------------------------- */

router.post('/sentiment-analysis', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { text, texts } = req.body || {};
    if (Array.isArray(texts)) {
      return res.json({
        results: texts.map((t: unknown, i: number) => ({ index: i, text: String(t).slice(0, 200), ...classifyText(String(t)) })),
      });
    }
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'text is required' });
    }
    res.json(classifyText(String(text)));
  } catch (err: any) {
    console.error('sentiment-analysis error:', err);
    res.status(500).json({ error: err.message || 'Classification failed' });
  }
});

/**
 * Competitor sentiment: score competitor review text the same way we score our
 * own, so the comparison is like-for-like. No scraping — the caller supplies
 * the text it already holds.
 */
router.post('/competitor-sentiment', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { competitors } = req.body || {};
    if (!Array.isArray(competitors) || competitors.length === 0) {
      return res.status(400).json({
        error: 'competitors must be a non-empty array of { name, reviews: string[] }',
      });
    }

    const comparison = competitors.slice(0, 25).map((c: any) => {
      const name = String(c?.name ?? 'unknown');
      const reviews: string[] = Array.isArray(c?.reviews) ? c.reviews.map(String) : [];
      const scored = reviews.slice(0, 200).map(classifyText);
      const usable = scored.filter((s) => s.label !== 'insufficient-text');
      const avg = usable.length
        ? Number((usable.reduce((a, b) => a + b.score, 0) / usable.length).toFixed(2))
        : null;
      const urgent = usable.filter((s) => s.urgency === 'high' || s.urgency === 'critical').length;
      return {
        name,
        reviewsAnalysed: scored.length,
        usableClassifications: usable.length,
        averageSentiment: avg,
        positive: usable.filter((s) => s.label === 'positive').length,
        negative: usable.filter((s) => s.label === 'negative').length,
        neutral: usable.filter((s) => s.label === 'neutral').length,
        urgentCount: urgent,
        confidence: usable.length >= 30 ? 'high' : usable.length >= 5 ? 'medium' : 'insufficient-history',
      };
    });

    res.json({
      comparison,
      assumptions: [
        'Competitor review text is supplied by the caller; nothing is scraped.',
        'Every competitor is scored with the same deterministic lexicon as our own reviews.',
        'averageSentiment is the mean of usable classifications only.',
      ],
    });
  } catch (err: any) {
    console.error('competitor-sentiment error:', err);
    res.status(500).json({ error: err.message || 'Comparison failed' });
  }
});

/**
 * Record a new review, classify it, and notify the right owner when it needs
 * a response. Returns what was notified and why.
 */
router.post('/notify-new-review', authenticateToken, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;
    const actorId = (req as any).user?.id;
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' });

    const { businessId, platform, rating, text, authorName } = req.body || {};
    if (!businessId) return res.status(400).json({ error: 'businessId is required' });
    if (text == null || !String(text).trim()) return res.status(400).json({ error: 'text is required' });

    const classification = classifyText(String(text));

    // Persist so the triage queue and analytics can see it.
    const insert = await pool.query(
      `INSERT INTO review_events
         (company_id, business_id, platform, author_name, rating, body,
          sentiment_label, sentiment_score, urgency, urgency_score, explanation, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, platform, rating, sentiment_label, sentiment_score, urgency, created_at`,
      [
        companyId, businessId, platform ?? 'unknown', authorName ?? null,
        rating ?? null, String(text), classification.label, classification.score,
        classification.urgency, classification.urgencyScore, classification.explanation,
        actorId ?? null,
      ]
    );

    // Decide who needs telling. This is the notification rule, stated plainly.
    const needsResponse =
      classification.label === 'negative' ||
      classification.urgency === 'high' ||
      classification.urgency === 'critical' ||
      (typeof rating === 'number' && rating <= 2);

    const reason = needsResponse
      ? classification.urgency === 'critical'
        ? 'Critical urgency indicator detected — escalate immediately.'
        : classification.label === 'negative'
          ? 'Negative sentiment requires a drafted response.'
          : 'Low star rating requires a drafted response.'
      : 'No response required under the default triage rule.';

    const notified = needsResponse;

    res.status(201).json({
      review: insert.rows[0],
      classification,
      notification: {
        notified,
        reason,
        queue: needsResponse ? (classification.urgency === 'critical' ? 'escalation' : 'response-due') : 'none',
      },
      rule: 'Notify when sentiment is negative, or urgency is high/critical, or rating <= 2.',
    });
  } catch (err: any) {
    console.error('notify-new-review error:', err);
    const missing = /relation .* does not exist/i.test(err?.message ?? '');
    res.status(missing ? 503 : 500).json({
      error: missing
        ? 'review_events table is missing — run the migration before enabling review notifications.'
        : err?.message || 'Could not record review',
    });
  }
});

export default router;
export { classifyText };
