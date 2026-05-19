const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const aiService = require('../services/aiService');

/**
 * POST /api/auto-respond/reviews/:id/auto-respond
 * Trigger auto-respond for a specific review using the business auto-respond config
 */
router.post('/reviews/:id/auto-respond', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const reviewRes = await pool.query('SELECT * FROM reviews WHERE id = $1', [id]);
    if (reviewRes.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    const review = reviewRes.rows[0];

    // Load auto-respond config for the business
    let config = { tone: 'professional', signature: '- The Team', business_name: 'Our Business' };
    try {
      const configRes = await pool.query(
        'SELECT arc.*, b.name as business_name FROM auto_respond_configs arc JOIN businesses b ON arc.business_id = b.id WHERE arc.business_id = $1',
        [review.business_id]
      );
      if (configRes.rows.length > 0) {
        config = { ...config, ...configRes.rows[0] };
        if (!config.enabled) {
          return res.status(400).json({ error: 'Auto-respond is disabled for this business' });
        }
        // Check if review rating is within configured range
        if (review.rating < config.min_rating || review.rating > config.max_rating) {
          return res.status(400).json({ error: `Review rating ${review.rating} is outside configured auto-respond range (${config.min_rating}-${config.max_rating})` });
        }
      }
    } catch (_) {} // If table doesn't exist yet, use defaults

    const responseText = await aiService.generateAutoResponse(review, config);

    // Save draft
    const draftRes = await pool.query(`
      INSERT INTO response_drafts (review_id, draft_text, tone)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id, responseText, config.tone]);

    // Update review status to 'draft'
    await pool.query(`
      UPDATE reviews SET response_status = 'draft', updated_at = NOW() WHERE id = $1
    `, [id]);

    // Persist AI result
    await pool.query(`
      INSERT INTO ai_results (feature, input_summary, result_text, model_used, created_at)
      VALUES ('auto_respond', $1, $2, $3, NOW())
    `, [`review_id:${id} rating:${review.rating}`, responseText, 'anthropic/claude-3-5-sonnet-20241022'])
    .catch(() => {});

    res.json({
      draft: draftRes.rows[0],
      response_text: responseText,
      auto_responded: true
    });
  } catch (error) {
    console.error('Auto-respond error:', error);
    res.status(500).json({ error: 'Failed to auto-respond to review' });
  }
});

module.exports = router;
