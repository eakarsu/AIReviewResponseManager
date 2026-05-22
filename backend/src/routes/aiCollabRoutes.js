// Apply pass 6 (close-out) — mechanical follow-up endpoints under /api/ai
// Endpoints:
//   POST /api/ai/response-assignment    — route reviews to team members
//   GET  /api/ai/analytics-dashboard    — DB-aggregated dashboard counters (LLM-optional)
//   POST /api/ai/retention-targeting    — churn-risk + outreach plan from negative reviews
//
// House style: authMiddleware + aiRateLimiter (applied at mount in index.js) +
// OpenRouter helper + parseAIJson + persistence to ai_results (with .catch fallthrough) +
// 503 guard when OPENROUTER_API_KEY is missing. Append-only, no schema changes.

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { sanitizeForPrompt, parseAIJson } = require('../services/aiService');

const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function hasOpenRouterKey() {
  const k = process.env.OPENROUTER_API_KEY;
  return !!k && k !== 'your_openrouter_api_key_here';
}

async function callOpenRouter(prompt, { max_tokens = 1500, temperature = 0.3 } = {}) {
  const r = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Review Response Manager'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens,
      temperature
    })
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error.message || 'OpenRouter error');
  const content = data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : '';
  return parseAIJson(content) || { raw: content };
}

async function persistAIResult(feature, inputSummary, result) {
  await pool.query(
    `INSERT INTO ai_results (feature, input_summary, result_text, model_used, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [feature, inputSummary, JSON.stringify(result), MODEL]
  ).catch(() => {});
}

/**
 * POST /api/ai/response-assignment
 * body: { reviews: [{id, sentiment, platform, urgency_hint?, text?, rating?}],
 *         team: [{user_id, expertise, current_load, languages?}],
 *         rules? }
 * returns: { assignments: [{review_id, user_id, priority, rationale}],
 *            unassigned: [...], escalations: [...] }
 */
router.post('/response-assignment', authMiddleware, async (req, res) => {
  try {
    if (!hasOpenRouterKey()) {
      return res.status(503).json({ error: 'OpenRouter API key not configured' });
    }
    const { reviews, team, rules } = req.body || {};
    if (!Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({ error: 'reviews (non-empty array) is required' });
    }
    if (!Array.isArray(team) || team.length === 0) {
      return res.status(400).json({ error: 'team (non-empty array) is required' });
    }

    const safeReviews = reviews.slice(0, 50).map((r) => ({
      id: r.id,
      sentiment: r.sentiment,
      platform: r.platform,
      rating: r.rating,
      urgency_hint: r.urgency_hint,
      text: sanitizeForPrompt(r.text || r.review_text || '', 400)
    }));
    const safeTeam = team.slice(0, 50).map((m) => ({
      user_id: m.user_id != null ? m.user_id : m.id,
      expertise: m.expertise,
      current_load: m.current_load,
      languages: m.languages,
      role: m.role
    }));
    const safeRules = sanitizeForPrompt(
      typeof rules === 'string' ? rules : JSON.stringify(rules || {}),
      600
    );

    const prompt = `You are an operations lead assigning customer-review responses to a team. ` +
      `For every review, pick the best owner from the team, set a priority (urgent|high|medium|low), ` +
      `and provide a one-sentence rationale. If no owner fits, list it under "unassigned" with a reason. ` +
      `If a review needs leadership escalation (legal, safety, viral risk), put its id under "escalations" too.

Rules: ${safeRules}

Reviews (${safeReviews.length}):
${JSON.stringify(safeReviews, null, 2)}

Team (${safeTeam.length}):
${JSON.stringify(safeTeam, null, 2)}

Return ONLY JSON:
{
  "assignments": [{"review_id": any, "user_id": any, "priority": "urgent|high|medium|low", "rationale": ""}],
  "unassigned": [{"review_id": any, "reason": ""}],
  "escalations": [{"review_id": any, "reason": ""}],
  "load_after": [{"user_id": any, "assigned_count": 0}],
  "summary": ""
}`;

    const result = await callOpenRouter(prompt, { max_tokens: 1800, temperature: 0.25 });
    await persistAIResult(
      'response_assignment',
      `reviews:${safeReviews.length} team:${safeTeam.length}`,
      result
    );
    res.json({
      assignments: Array.isArray(result.assignments) ? result.assignments : [],
      unassigned: Array.isArray(result.unassigned) ? result.unassigned : [],
      escalations: Array.isArray(result.escalations) ? result.escalations : [],
      load_after: Array.isArray(result.load_after) ? result.load_after : [],
      summary: result.summary || '',
      raw: result.raw
    });
  } catch (err) {
    console.error('response-assignment error:', err);
    res.status(500).json({ error: 'Failed to compute response assignments' });
  }
});

/**
 * GET /api/ai/analytics-dashboard?period=30d&platforms=google,yelp&business_id=123
 * DB-only aggregator (no LLM): counts_by_platform, avg_sentiment, response time p50/p90,
 * top_themes (keyword frequency), alerts (rule-of-thumb).
 */
router.get('/analytics-dashboard', authMiddleware, async (req, res) => {
  try {
    const periodRaw = String(req.query.period || '30d').trim().toLowerCase();
    const m = periodRaw.match(/^(\d+)\s*([dwmy])?$/);
    let days = 30;
    if (m) {
      const n = parseInt(m[1], 10);
      const unit = m[2] || 'd';
      const mult = unit === 'd' ? 1 : unit === 'w' ? 7 : unit === 'm' ? 30 : 365;
      days = Math.max(1, Math.min(365, n * mult));
    }
    const platformsParam = String(req.query.platforms || '').trim();
    const platforms = platformsParam
      ? platformsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : null;
    const businessIdRaw = req.query.business_id || req.query.businessId;
    const businessId = businessIdRaw ? parseInt(businessIdRaw, 10) : null;

    const since = `NOW() - INTERVAL '${days} days'`;
    const params = [];
    const where = [`r.created_at >= ${since}`];
    if (platforms && platforms.length) {
      params.push(platforms);
      where.push(`r.platform = ANY($${params.length})`);
    }
    if (businessId && !Number.isNaN(businessId)) {
      params.push(businessId);
      where.push(`r.business_id = $${params.length}`);
    }
    const whereSQL = where.join(' AND ');

    // counts_by_platform + rating distribution
    const byPlatform = await pool.query(
      `SELECT r.platform,
              COUNT(*)::int AS count,
              AVG(r.rating)::float AS avg_rating,
              SUM(CASE WHEN r.sentiment='positive' THEN 1 ELSE 0 END)::int AS positive,
              SUM(CASE WHEN r.sentiment='neutral'  THEN 1 ELSE 0 END)::int AS neutral,
              SUM(CASE WHEN r.sentiment='negative' THEN 1 ELSE 0 END)::int AS negative,
              SUM(CASE WHEN r.response_status='responded' THEN 1 ELSE 0 END)::int AS responded
         FROM reviews r
        WHERE ${whereSQL}
        GROUP BY r.platform
        ORDER BY count DESC`,
      params
    ).catch(() => ({ rows: [] }));

    // overall sentiment score (positive=1, neutral=0, negative=-1)
    const sentimentRow = await pool.query(
      `SELECT
         SUM(CASE WHEN r.sentiment='positive' THEN 1 WHEN r.sentiment='negative' THEN -1 ELSE 0 END)::float AS net,
         COUNT(*)::int AS total,
         AVG(r.rating)::float AS avg_rating
         FROM reviews r
        WHERE ${whereSQL}`,
      params
    ).catch(() => ({ rows: [{ net: 0, total: 0, avg_rating: null }] }));
    const sRow = sentimentRow.rows[0] || { net: 0, total: 0, avg_rating: null };
    const avgSentiment = sRow.total > 0 ? Number((sRow.net / sRow.total).toFixed(4)) : 0;

    // response time percentiles (review.created_at -> first draft created_at)
    const responseTimes = await pool.query(
      `SELECT EXTRACT(EPOCH FROM (d.first_draft - r.created_at)) AS secs
         FROM reviews r
         JOIN (
           SELECT review_id, MIN(created_at) AS first_draft
             FROM response_drafts
            GROUP BY review_id
         ) d ON d.review_id = r.id
        WHERE ${whereSQL}
          AND d.first_draft IS NOT NULL`,
      params
    ).catch(() => ({ rows: [] }));
    const secs = responseTimes.rows
      .map((r) => Number(r.secs))
      .filter((n) => Number.isFinite(n) && n >= 0)
      .sort((a, b) => a - b);
    const pct = (p) => {
      if (!secs.length) return null;
      const idx = Math.min(secs.length - 1, Math.max(0, Math.ceil((p / 100) * secs.length) - 1));
      return Math.round(secs[idx]);
    };
    const responseTimes_seconds = { p50: pct(50), p90: pct(90), p99: pct(99), sample_size: secs.length };

    // top_themes — flatten keywords array
    const themesRows = await pool.query(
      `SELECT kw AS theme, COUNT(*)::int AS count
         FROM reviews r, LATERAL UNNEST(COALESCE(r.keywords, ARRAY[]::TEXT[])) AS kw
        WHERE ${whereSQL}
          AND kw IS NOT NULL AND kw <> ''
        GROUP BY kw
        ORDER BY count DESC
        LIMIT 15`,
      params
    ).catch(() => ({ rows: [] }));

    // alerts — simple rule-of-thumb derived from aggregates
    const totals = byPlatform.rows.reduce(
      (acc, r) => {
        acc.count += r.count || 0;
        acc.negative += r.negative || 0;
        acc.responded += r.responded || 0;
        return acc;
      },
      { count: 0, negative: 0, responded: 0 }
    );
    const negShare = totals.count > 0 ? totals.negative / totals.count : 0;
    const respShare = totals.count > 0 ? totals.responded / totals.count : 0;
    const alerts = [];
    if (negShare >= 0.4) alerts.push({ level: 'critical', code: 'NEGATIVE_SHARE_HIGH', detail: `${Math.round(negShare * 100)}% of reviews are negative.` });
    else if (negShare >= 0.25) alerts.push({ level: 'warning', code: 'NEGATIVE_SHARE_ELEVATED', detail: `${Math.round(negShare * 100)}% of reviews are negative.` });
    if (totals.count > 0 && respShare < 0.5) alerts.push({ level: 'warning', code: 'LOW_RESPONSE_RATE', detail: `Only ${Math.round(respShare * 100)}% of reviews have a response.` });
    if (responseTimes_seconds.p90 && responseTimes_seconds.p90 > 72 * 3600) alerts.push({ level: 'warning', code: 'SLOW_P90_RESPONSE', detail: `p90 first-response time exceeds 72h.` });

    res.json({
      period: { days, since_iso: new Date(Date.now() - days * 86400 * 1000).toISOString() },
      filters: { platforms: platforms || 'all', business_id: businessId || null },
      counts_by_platform: byPlatform.rows,
      totals: {
        reviews: totals.count,
        responded: totals.responded,
        response_rate: totals.count ? Number(respShare.toFixed(4)) : 0,
        avg_rating: sRow.avg_rating != null ? Number(Number(sRow.avg_rating).toFixed(2)) : null
      },
      avg_sentiment: avgSentiment,
      response_time_p50: responseTimes_seconds.p50,
      response_time_p90: responseTimes_seconds.p90,
      response_time_p99: responseTimes_seconds.p99,
      response_time_sample_size: responseTimes_seconds.sample_size,
      top_themes: themesRows.rows,
      alerts
    });
  } catch (err) {
    console.error('analytics-dashboard error:', err);
    res.status(500).json({ error: 'Failed to compute analytics dashboard' });
  }
});

/**
 * POST /api/ai/retention-targeting
 * body: { negative_reviews: [{id, customer_id?, text, sentiment_score, rating?}],
 *         offers?: [...], brand_voice? }
 * returns: { candidates: [{customer_id, churn_risk, recommended_outreach,
 *                          suggested_offer, suggested_channel, review_id, rationale}],
 *            notes: "" }
 */
router.post('/retention-targeting', authMiddleware, async (req, res) => {
  try {
    if (!hasOpenRouterKey()) {
      return res.status(503).json({ error: 'OpenRouter API key not configured' });
    }
    const { negative_reviews, offers, brand_voice } = req.body || {};
    if (!Array.isArray(negative_reviews) || negative_reviews.length === 0) {
      return res.status(400).json({ error: 'negative_reviews (non-empty array) is required' });
    }
    const safeReviews = negative_reviews.slice(0, 40).map((r) => ({
      id: r.id,
      customer_id: r.customer_id,
      rating: r.rating,
      sentiment_score: r.sentiment_score,
      text: sanitizeForPrompt(r.text || r.review_text || '', 500)
    }));
    const safeOffers = Array.isArray(offers)
      ? offers.slice(0, 20).map((o) => ({
          id: o.id,
          name: o.name,
          value: o.value,
          eligibility: o.eligibility,
          channel: o.channel
        }))
      : [];
    const safeVoice = sanitizeForPrompt(brand_voice || 'empathetic, accountable, concise', 300);

    const prompt = `You are a customer retention strategist. For each negative review, decide if the customer is a retention target. ` +
      `Estimate churn_risk (low|medium|high|severe), pick the best outreach channel from {email, phone, in_app, sms, mail}, ` +
      `recommend a concrete outreach message theme, and choose one offer from the offers list (or propose one inline if the list is empty). ` +
      `Skip reviews that are spam/fake-looking or unreachable.

Brand voice: ${safeVoice}

Offers (${safeOffers.length}):
${JSON.stringify(safeOffers, null, 2)}

Negative reviews (${safeReviews.length}):
${JSON.stringify(safeReviews, null, 2)}

Return ONLY JSON:
{
  "candidates": [{
    "review_id": any,
    "customer_id": any,
    "churn_risk": "low|medium|high|severe",
    "recommended_outreach": "",
    "suggested_offer": {"id": any, "name": "", "value": ""},
    "suggested_channel": "email|phone|in_app|sms|mail",
    "expected_save_rate_pct": number,
    "rationale": ""
  }],
  "notes": "",
  "global_actions": []
}`;

    const result = await callOpenRouter(prompt, { max_tokens: 1800, temperature: 0.3 });
    await persistAIResult(
      'retention_targeting',
      `negative_reviews:${safeReviews.length} offers:${safeOffers.length}`,
      result
    );
    res.json({
      candidates: Array.isArray(result.candidates) ? result.candidates : [],
      notes: result.notes || '',
      global_actions: Array.isArray(result.global_actions) ? result.global_actions : [],
      raw: result.raw
    });
  } catch (err) {
    console.error('retention-targeting error:', err);
    res.status(500).json({ error: 'Failed to compute retention targets' });
  }
});

module.exports = router;
