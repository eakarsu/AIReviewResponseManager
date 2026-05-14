const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const aiService = require('../services/aiService');

/**
 * GET /api/businesses/:id/reputation-score
 * Computes composite reputation score 0-100 + AI narrative
 */
router.get('/:id/reputation-score', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { id } = req.params;

    const businessRes = await pool.query('SELECT * FROM businesses WHERE id = $1', [id]);
    if (businessRes.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    const business = businessRes.rows[0];

    // Gather metrics
    const statsRes = await pool.query(`
      SELECT
        COUNT(*) AS total_reviews,
        ROUND(AVG(rating), 2) AS avg_rating,
        COUNT(CASE WHEN response_status = 'responded' THEN 1 END) AS responded_count,
        COUNT(CASE WHEN sentiment = 'positive' THEN 1 END) AS positive_count,
        COUNT(CASE WHEN sentiment = 'negative' THEN 1 END) AS negative_count,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) AS recent_30d
      FROM reviews WHERE business_id = $1
    `, [id]);

    const stats = statsRes.rows[0];
    const total = parseInt(stats.total_reviews) || 0;
    const avgRating = parseFloat(stats.avg_rating) || 0;
    const respondedCount = parseInt(stats.responded_count) || 0;
    const positiveCount = parseInt(stats.positive_count) || 0;
    const negativeCount = parseInt(stats.negative_count) || 0;
    const recent30d = parseInt(stats.recent_30d) || 0;

    // Score components (weighted)
    const ratingScore = (avgRating / 5) * 40; // 40% weight
    const responseRate = total > 0 ? (respondedCount / total) : 0;
    const responseScore = responseRate * 25; // 25% weight
    const sentimentRate = total > 0 ? (positiveCount / total) : 0.5;
    const sentimentScore = sentimentRate * 25; // 25% weight
    const volumeScore = Math.min(recent30d / 10, 1) * 10; // 10% weight — caps at 10 reviews/month

    const compositeScore = Math.round(ratingScore + responseScore + sentimentScore + volumeScore);

    const scoreData = {
      composite_score: compositeScore,
      breakdown: {
        rating_score: Math.round(ratingScore),
        response_rate_score: Math.round(responseScore),
        sentiment_score: Math.round(sentimentScore),
        volume_score: Math.round(volumeScore)
      },
      metrics: {
        total_reviews: total,
        avg_rating: avgRating,
        response_rate: Math.round(responseRate * 100),
        positive_rate: Math.round(sentimentRate * 100),
        negative_count: negativeCount,
        reviews_last_30_days: recent30d
      }
    };

    // Generate AI narrative
    const narrative = await aiService.generateReputationNarrative(business.name, scoreData);

    // Persist the reputation score
    await pool.query(`
      INSERT INTO ai_results (feature, business_id, input_summary, result_text, model_used, created_at)
      VALUES ('reputation_score', $1, $2, $3, $4, NOW())
      ON CONFLICT DO NOTHING
    `, [id, JSON.stringify(scoreData.metrics), JSON.stringify({ ...scoreData, ...narrative }), 'anthropic/claude-3-5-sonnet-20241022'])
    .catch(() => {}); // Non-fatal if ai_results table doesn't have business_id yet

    res.json({
      business_id: parseInt(id),
      business_name: business.name,
      ...scoreData,
      ai_narrative: narrative
    });
  } catch (error) {
    console.error('Reputation score error:', error);
    res.status(500).json({ error: 'Failed to compute reputation score' });
  }
});

/**
 * POST /api/businesses/:businessId/auto-respond-config
 * Save auto-respond configuration for a business
 */
router.post('/:businessId/auto-respond-config', authMiddleware, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { enabled, min_rating, max_rating, tone, signature, respond_to_platforms } = req.body;

    // Ensure the config table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auto_respond_configs (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        enabled BOOLEAN DEFAULT false,
        min_rating INTEGER DEFAULT 1,
        max_rating INTEGER DEFAULT 5,
        tone VARCHAR(50) DEFAULT 'professional',
        signature TEXT,
        respond_to_platforms TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(business_id)
      )
    `);

    const result = await pool.query(`
      INSERT INTO auto_respond_configs (business_id, enabled, min_rating, max_rating, tone, signature, respond_to_platforms)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (business_id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        min_rating = EXCLUDED.min_rating,
        max_rating = EXCLUDED.max_rating,
        tone = EXCLUDED.tone,
        signature = EXCLUDED.signature,
        respond_to_platforms = EXCLUDED.respond_to_platforms,
        updated_at = NOW()
      RETURNING *
    `, [businessId, enabled !== false, min_rating || 1, max_rating || 5, tone || 'professional', signature || '', respond_to_platforms || ['google', 'yelp']]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Auto-respond config error:', error);
    res.status(500).json({ error: 'Failed to save auto-respond config' });
  }
});

/**
 * GET /api/businesses/:businessId/auto-respond-config
 */
router.get('/:businessId/auto-respond-config', authMiddleware, async (req, res) => {
  try {
    const { businessId } = req.params;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS auto_respond_configs (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        enabled BOOLEAN DEFAULT false,
        min_rating INTEGER DEFAULT 1,
        max_rating INTEGER DEFAULT 5,
        tone VARCHAR(50) DEFAULT 'professional',
        signature TEXT,
        respond_to_platforms TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(business_id)
      )
    `);

    const result = await pool.query(
      'SELECT * FROM auto_respond_configs WHERE business_id = $1',
      [businessId]
    );

    if (result.rows.length === 0) {
      return res.json({ business_id: parseInt(businessId), enabled: false, min_rating: 1, max_rating: 5, tone: 'professional', signature: '', respond_to_platforms: ['google', 'yelp'] });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get auto-respond config error:', error);
    res.status(500).json({ error: 'Failed to get auto-respond config' });
  }
});

module.exports = router;
