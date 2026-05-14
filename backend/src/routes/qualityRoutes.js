const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const aiService = require('../services/aiService');

/**
 * POST /api/quality/score-response
 * Score the quality of a drafted response against the original review.
 */
router.post('/score-response', authMiddleware, async (req, res) => {
  try {
    const { review, response, brandVoice } = req.body || {};
    if (!review || !response) {
      return res.status(400).json({ error: 'review and response are required' });
    }
    const result = await aiService.scoreResponseQuality(review, response, brandVoice || '');
    await pool.query(
      `INSERT INTO ai_results (feature, input_summary, result_text, model_used, created_at)
       VALUES ('response_quality_scorer', $1, $2, $3, NOW())`,
      [`review_id:${review.id || 'inline'}`, JSON.stringify(result), 'anthropic/claude-3-5-sonnet-20241022']
    ).catch(() => {});
    res.json({ result });
  } catch (error) {
    console.error('Response quality scorer error:', error);
    res.status(500).json({ error: 'Failed to score response quality' });
  }
});

/**
 * POST /api/quality/reputation-risk-alert
 * Flag whether a business is heading toward a reputation crisis.
 */
router.post('/reputation-risk-alert', authMiddleware, async (req, res) => {
  try {
    const { businessId, businessName, baseline } = req.body || {};
    let name = businessName;
    let recent = [];
    if (businessId) {
      const biz = await pool.query('SELECT name FROM businesses WHERE id = $1', [businessId]).catch(() => ({ rows: [] }));
      if (biz.rows[0]) name = name || biz.rows[0].name;
      const rev = await pool.query(
        'SELECT id, rating, review_text, created_at FROM reviews WHERE business_id = $1 ORDER BY created_at DESC LIMIT 50',
        [businessId]
      ).catch(() => ({ rows: [] }));
      recent = rev.rows;
    } else if (Array.isArray(req.body?.recentReviews)) {
      recent = req.body.recentReviews;
    }
    const result = await aiService.reputationRiskAlert(name || 'Unknown', recent, baseline || {});
    await pool.query(
      `INSERT INTO ai_results (feature, input_summary, result_text, model_used, created_at)
       VALUES ('reputation_risk_alert', $1, $2, $3, NOW())`,
      [`business:${businessId || name}`, JSON.stringify(result), 'anthropic/claude-3-5-sonnet-20241022']
    ).catch(() => {});
    res.json({ result, sample_size: recent.length });
  } catch (error) {
    console.error('Reputation risk alert error:', error);
    res.status(500).json({ error: 'Failed to compute reputation risk alert' });
  }
});

/**
 * POST /api/quality/translate-response
 * Translate a response to a target language while preserving brand voice.
 */
router.post('/translate-response', authMiddleware, async (req, res) => {
  try {
    const { response, targetLanguage, preserveTone } = req.body || {};
    if (!response || !targetLanguage) {
      return res.status(400).json({ error: 'response and targetLanguage are required' });
    }
    const result = await aiService.translateResponse(response, targetLanguage, preserveTone !== false);
    res.json({ result });
  } catch (error) {
    console.error('Translate response error:', error);
    res.status(500).json({ error: 'Failed to translate response' });
  }
});

/**
 * POST /api/quality/team-assignment-suggester
 * Suggest the best team member to own a review response.
 */
router.post('/team-assignment-suggester', authMiddleware, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your_openrouter_api_key_here') {
      return res.status(503).json({ error: 'OpenRouter API key not configured' });
    }
    const { review, teamMembers, workloadHints } = req.body || {};
    if (!review) return res.status(400).json({ error: 'review is required' });
    let team = Array.isArray(teamMembers) ? teamMembers : [];
    if (!team.length) {
      const r = await pool.query('SELECT id, name, role FROM users LIMIT 25').catch(() => ({ rows: [] }));
      team = r.rows;
    }
    const result = await aiService.suggestTeamAssignment(review, team, workloadHints || '');
    await pool.query(
      `INSERT INTO ai_results (feature, input_summary, result_text, model_used, created_at)
       VALUES ('team_assignment_suggester', $1, $2, $3, NOW())`,
      [`review_id:${review.id || 'inline'}`, JSON.stringify(result), 'anthropic/claude-3-5-sonnet-20241022']
    ).catch(() => {});
    res.json({ result, team_size: team.length });
  } catch (error) {
    console.error('Team assignment suggester error:', error);
    res.status(500).json({ error: 'Failed to suggest team assignment' });
  }
});

/**
 * POST /api/quality/retention-targets-from-reviews
 * Identify high-priority retention outreach targets from recent negative reviews.
 */
router.post('/retention-targets-from-reviews', authMiddleware, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your_openrouter_api_key_here') {
      return res.status(503).json({ error: 'OpenRouter API key not configured' });
    }
    const { businessId, businessName, retentionPlaybook } = req.body || {};
    let name = businessName;
    let recent = [];
    if (businessId) {
      const biz = await pool.query('SELECT name FROM businesses WHERE id = $1', [businessId]).catch(() => ({ rows: [] }));
      if (biz.rows[0]) name = name || biz.rows[0].name;
      const rev = await pool.query(
        'SELECT id, rating, review_text, created_at FROM reviews WHERE business_id = $1 ORDER BY created_at DESC LIMIT 100',
        [businessId]
      ).catch(() => ({ rows: [] }));
      recent = rev.rows;
    } else if (Array.isArray(req.body?.recentReviews)) {
      recent = req.body.recentReviews;
    }
    const result = await aiService.retentionTargetsFromReviews(name || 'Unknown', recent, retentionPlaybook);
    await pool.query(
      `INSERT INTO ai_results (feature, input_summary, result_text, model_used, created_at)
       VALUES ('retention_targets_from_reviews', $1, $2, $3, NOW())`,
      [`business:${businessId || name}`, JSON.stringify(result), 'anthropic/claude-3-5-sonnet-20241022']
    ).catch(() => {});
    res.json({ result, sample_size: recent.length });
  } catch (error) {
    console.error('Retention targets error:', error);
    res.status(500).json({ error: 'Failed to compute retention targets' });
  }
});

module.exports = router;
