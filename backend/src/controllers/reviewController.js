const pool = require('../config/database');
const aiService = require('../services/aiService');
const { parsePagination, buildPaginationResponse, buildSearchClause, buildSortClause } = require('../middleware/pagination');
const { Parser } = require('json2csv');
const { generatePDF } = require('../services/pdfService');

const getAllReviews = async (req, res) => {
  try {
    const { platform, status, rating, business_id, search, sort_by, sort_order } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    let whereClause = ' WHERE b.user_id = $1';
    const params = [req.userId];
    let paramCount = 1;

    if (platform) {
      paramCount++;
      whereClause += ` AND r.platform = $${paramCount}`;
      params.push(platform);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND r.response_status = $${paramCount}`;
      params.push(status);
    }

    if (rating) {
      paramCount++;
      whereClause += ` AND r.rating = $${paramCount}`;
      params.push(parseInt(rating));
    }

    if (business_id) {
      paramCount++;
      whereClause += ` AND r.business_id = $${paramCount}`;
      params.push(parseInt(business_id));
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (r.reviewer_name ILIKE $${paramCount} OR r.review_text ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const orderClause = buildSortClause(sort_by, sort_order, ['created_at', 'rating', 'reviewer_name', 'review_date']);

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM reviews r JOIN businesses b ON r.business_id = b.id${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    const result = await pool.query(
      `SELECT r.*, b.name as business_name
       FROM reviews r
       LEFT JOIN businesses b ON r.business_id = b.id
       ${whereClause}
       ORDER BY ${orderClause}
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    res.json(buildPaginationResponse(result.rows, total, page, limit));
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT r.*, b.name as business_name,
             (SELECT json_agg(d.*) FROM response_drafts d WHERE d.review_id = r.id) as drafts
      FROM reviews r
      LEFT JOIN businesses b ON r.business_id = b.id
      WHERE r.id = $1 AND b.user_id = $2
    `, [id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createReview = async (req, res) => {
  try {
    const {
      business_id, platform, reviewer_name, reviewer_avatar,
      rating, review_text, review_date
    } = req.body;

    // Reviews may only be attached to a business owned by the caller.
    const business = await pool.query(
      'SELECT id FROM businesses WHERE id = $1 AND user_id = $2',
      [business_id, req.userId]
    );
    if (business.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Analyze sentiment using AI
    let sentiment = 'neutral';
    let keywords = [];

    try {
      sentiment = await aiService.analyzeSentiment(review_text);
      keywords = await aiService.extractKeywords(review_text);
    } catch (aiError) {
      console.error('AI analysis failed, using defaults:', aiError);
      // Set sentiment based on rating as fallback
      sentiment = rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral';
    }

    const result = await pool.query(`
      INSERT INTO reviews (business_id, platform, reviewer_name, reviewer_avatar, rating, review_text, review_date, sentiment, keywords)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [business_id, platform, reviewer_name, reviewer_avatar, rating, review_text, review_date || new Date(), sentiment, keywords]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      platform, reviewer_name, rating, review_text,
      response_status, sentiment
    } = req.body;

    const result = await pool.query(`
      UPDATE reviews
      SET platform = COALESCE($1, platform),
          reviewer_name = COALESCE($2, reviewer_name),
          rating = COALESCE($3, rating),
          review_text = COALESCE($4, review_text),
          response_status = COALESCE($5, response_status),
          sentiment = COALESCE($6, sentiment),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND business_id IN (SELECT id FROM businesses WHERE user_id = $8)
      RETURNING *
    `, [platform, reviewer_name, rating, review_text, response_status, sentiment, id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM reviews WHERE id = $1 AND business_id IN (SELECT id FROM businesses WHERE user_id = $2) RETURNING *',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const generateAIResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { tone, template_id } = req.body;

    const reviewResult = await pool.query(`
      SELECT r.* FROM reviews r
      JOIN businesses b ON r.business_id = b.id
      WHERE r.id = $1 AND b.user_id = $2
    `, [id, req.userId]);

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const review = reviewResult.rows[0];
    let template = null;

    if (template_id) {
      const templateResult = await pool.query('SELECT * FROM templates WHERE id = $1 AND user_id = $2', [template_id, req.userId]);
      if (templateResult.rows.length > 0) {
        template = templateResult.rows[0].content;
      }
    }

    const aiResponse = await aiService.generateResponse(review, tone || 'professional', template);

    // Save the draft
    const draftResult = await pool.query(`
      INSERT INTO response_drafts (review_id, draft_text, tone)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id, aiResponse, tone || 'professional']);

    // Update review status
    await pool.query(`
      UPDATE reviews SET response_status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = $1
    `, [id]);

    res.json({
      draft: draftResult.rows[0],
      response_text: aiResponse
    });
  } catch (error) {
    console.error('Generate AI response error:', error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
};

const getReviewStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total_reviews,
        COUNT(CASE WHEN r.response_status = 'pending' THEN 1 END) as pending_reviews,
        COUNT(CASE WHEN r.response_status = 'draft' THEN 1 END) as draft_reviews,
        COUNT(CASE WHEN r.response_status = 'responded' THEN 1 END) as responded_reviews,
        COUNT(CASE WHEN r.platform = 'google' THEN 1 END) as google_reviews,
        COUNT(CASE WHEN r.platform = 'yelp' THEN 1 END) as yelp_reviews,
        ROUND(AVG(r.rating), 2) as average_rating,
        COUNT(CASE WHEN r.sentiment = 'positive' THEN 1 END) as positive_reviews,
        COUNT(CASE WHEN r.sentiment = 'negative' THEN 1 END) as negative_reviews,
        COUNT(CASE WHEN r.sentiment = 'neutral' THEN 1 END) as neutral_reviews
      FROM reviews r
      JOIN businesses b ON r.business_id = b.id
      WHERE b.user_id = $1
    `, [req.userId]);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const exportCSV = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.id, r.reviewer_name, r.platform, r.rating, r.review_text, r.response_status, r.sentiment, r.review_date
      FROM reviews r
      JOIN businesses b ON r.business_id = b.id
      WHERE b.user_id = $1
      ORDER BY r.created_at DESC
    `, [req.userId]);
    const parser = new Parser({ fields: ['id', 'reviewer_name', 'platform', 'rating', 'review_text', 'response_status', 'sentiment', 'review_date'] });
    const csv = parser.parse(result.rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="reviews.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
};

const exportPDF = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.* FROM reviews r
      JOIN businesses b ON r.business_id = b.id
      WHERE b.user_id = $1
      ORDER BY r.created_at DESC
    `, [req.userId]);
    generatePDF('Reviews', [
      { key: 'id', label: 'ID' },
      { key: 'reviewer_name', label: 'Reviewer' },
      { key: 'platform', label: 'Platform' },
      { key: 'rating', label: 'Rating' },
      { key: 'response_status', label: 'Status' }
    ], result.rows, res);
  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    const result = await pool.query(
      'DELETE FROM reviews WHERE id = ANY($1) AND business_id IN (SELECT id FROM businesses WHERE user_id = $2) RETURNING id',
      [ids, req.userId]
    );
    res.json({ message: `${result.rowCount} items deleted`, deleted: result.rows.map(r => r.id) });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Bulk delete failed' });
  }
};

const bulkUpdate = async (req, res) => {
  try {
    const { ids, updates } = req.body;
    const setClauses = [];
    const params = [ids, req.userId];
    let paramCount = 2;

    Object.entries(updates).forEach(([key, value]) => {
      const allowed = ['response_status', 'sentiment'];
      if (allowed.includes(key)) {
        paramCount++;
        setClauses.push(`${key} = $${paramCount}`);
        params.push(value);
      }
    });

    if (setClauses.length === 0) return res.status(400).json({ error: 'No valid updates provided' });

    setClauses.push('updated_at = CURRENT_TIMESTAMP');

    const result = await pool.query(
      `UPDATE reviews SET ${setClauses.join(', ')} WHERE id = ANY($1) AND business_id IN (SELECT id FROM businesses WHERE user_id = $2) RETURNING *`,
      params
    );
    res.json({ message: `${result.rowCount} items updated`, data: result.rows });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Bulk update failed' });
  }
};

module.exports = {
  getAllReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  generateAIResponse,
  getReviewStats,
  exportCSV,
  exportPDF,
  bulkDelete,
  bulkUpdate
};
