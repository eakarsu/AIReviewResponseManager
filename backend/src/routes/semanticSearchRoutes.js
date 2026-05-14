const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const aiService = require('../services/aiService');
const { parsePagination, buildPaginationResponse } = require('../middleware/pagination');

/**
 * POST /api/reviews/semantic-search
 * AI-ranked semantic search over reviews
 */
router.post('/semantic-search', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { query, business_id, limit: limitParam } = req.body;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    // Fetch candidate reviews (broad SQL filter first for efficiency)
    const params = [];
    let whereClause = 'WHERE 1=1';
    if (business_id) {
      params.push(parseInt(business_id));
      whereClause += ` AND business_id = $${params.length}`;
    }
    params.push(parseInt(limitParam) || 50);

    const reviewsRes = await pool.query(
      `SELECT id, reviewer_name, review_text, rating, platform, sentiment, review_date FROM reviews ${whereClause} ORDER BY created_at DESC LIMIT $${params.length}`,
      params
    );

    if (reviewsRes.rows.length === 0) {
      return res.json({ data: [], query, total: 0 });
    }

    // AI ranking
    const rankings = await aiService.semanticSearchReviews(query, reviewsRes.rows);

    // Merge ranking data back into reviews
    const reviewMap = {};
    reviewsRes.rows.forEach(r => { reviewMap[r.id] = r; });

    const rankedReviews = rankings
      .filter(r => reviewMap[r.id])
      .map(r => ({
        ...reviewMap[r.id],
        relevance_score: r.relevance_score,
        match_reason: r.match_reason
      }));

    res.json({
      data: rankedReviews,
      query,
      total: rankedReviews.length
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({ error: 'Semantic search failed' });
  }
});

/**
 * POST /api/reviews/bulk-import
 * Bulk import reviews from CSV/JSON, deduped by external_id+platform
 * Auto-triggers sentiment analysis for each
 */
router.post('/bulk-import', authMiddleware, async (req, res) => {
  try {
    const { reviews, business_id } = req.body;

    if (!Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({ error: 'reviews must be a non-empty array' });
    }

    if (!business_id) {
      return res.status(400).json({ error: 'business_id is required' });
    }

    // Ensure external_id column exists (migration)
    await pool.query(`
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS external_id VARCHAR(255)
    `).catch(() => {});

    // Ensure unique constraint exists
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_external_id_platform
      ON reviews (external_id, platform) WHERE external_id IS NOT NULL
    `).catch(() => {});

    const results = { imported: 0, skipped: 0, errors: [] };

    for (const rev of reviews) {
      try {
        const {
          external_id, platform, reviewer_name, reviewer_avatar,
          rating, review_text, review_date
        } = rev;

        if (!platform || !reviewer_name || !rating || !review_text) {
          results.errors.push({ review: rev, error: 'Missing required fields' });
          continue;
        }

        // Check for duplicate
        if (external_id) {
          const dupCheck = await pool.query(
            'SELECT id FROM reviews WHERE external_id = $1 AND platform = $2',
            [external_id, platform]
          );
          if (dupCheck.rows.length > 0) {
            results.skipped++;
            continue;
          }
        }

        // Sentiment analysis (best effort)
        let sentiment = rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral';
        let keywords = [];
        try {
          sentiment = await aiService.analyzeSentiment(review_text);
          keywords = await aiService.extractKeywords(review_text);
        } catch (_) {}

        await pool.query(`
          INSERT INTO reviews (business_id, external_id, platform, reviewer_name, reviewer_avatar, rating, review_text, review_date, sentiment, keywords)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [business_id, external_id || null, platform, reviewer_name, reviewer_avatar || null, rating, review_text, review_date || new Date(), sentiment, keywords]);

        results.imported++;
      } catch (err) {
        results.errors.push({ review: rev, error: err.message });
      }
    }

    res.status(201).json({
      message: `Bulk import complete. Imported: ${results.imported}, Skipped (duplicates): ${results.skipped}, Errors: ${results.errors.length}`,
      ...results
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Bulk import failed' });
  }
});

module.exports = router;
