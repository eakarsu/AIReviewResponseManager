const pool = require('../config/database');
const aiService = require('../services/aiService');
const { parsePagination, buildPaginationResponse, buildSortClause } = require('../middleware/pagination');
const { Parser } = require('json2csv');
const { generatePDF } = require('../services/pdfService');

const getAllPersonalizedResponses = async (req, res) => {
  try {
    const { status, tone, review_sentiment, search, sort_by, sort_order } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    let whereClause = ' WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (tone) {
      paramCount++;
      whereClause += ` AND tone = $${paramCount}`;
      params.push(tone);
    }

    if (review_sentiment) {
      paramCount++;
      whereClause += ` AND review_sentiment = $${paramCount}`;
      params.push(review_sentiment);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (reviewer_name ILIKE $${paramCount} OR original_review ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const orderClause = buildSortClause(sort_by, sort_order, ['created_at', 'personalization_score', 'reviewer_name']);

    const countResult = await pool.query(`SELECT COUNT(*) FROM personalized_responses${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    const result = await pool.query(
      `SELECT * FROM personalized_responses${whereClause} ORDER BY ${orderClause} LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    res.json(buildPaginationResponse(result.rows, total, page, limit));
  } catch (error) {
    console.error('Get personalized responses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPersonalizedResponseById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM personalized_responses WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Personalized response not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get personalized response error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createPersonalizedResponse = async (req, res) => {
  try {
    const { reviewer_name, reviewer_profile, original_review, review_sentiment } = req.body;

    const result = await pool.query(`
      INSERT INTO personalized_responses (reviewer_name, reviewer_profile, original_review, review_sentiment)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [reviewer_name, reviewer_profile, original_review, review_sentiment]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create personalized response error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updatePersonalizedResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewer_name, reviewer_profile, original_review, review_sentiment, personalization_factors, generated_response, tone, personalization_score, ai_reasoning, status } = req.body;

    const result = await pool.query(`
      UPDATE personalized_responses
      SET reviewer_name = COALESCE($1, reviewer_name),
          reviewer_profile = COALESCE($2, reviewer_profile),
          original_review = COALESCE($3, original_review),
          review_sentiment = COALESCE($4, review_sentiment),
          personalization_factors = COALESCE($5, personalization_factors),
          generated_response = COALESCE($6, generated_response),
          tone = COALESCE($7, tone),
          personalization_score = COALESCE($8, personalization_score),
          ai_reasoning = COALESCE($9, ai_reasoning),
          status = COALESCE($10, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [reviewer_name, reviewer_profile, original_review, review_sentiment, personalization_factors, generated_response, tone, personalization_score, ai_reasoning, status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Personalized response not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update personalized response error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deletePersonalizedResponse = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM personalized_responses WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Personalized response not found' });
    }

    res.json({ message: 'Personalized response deleted successfully' });
  } catch (error) {
    console.error('Delete personalized response error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const generatePersonalizedResponse = async (req, res) => {
  try {
    const { id } = req.params;

    const responseResult = await pool.query(
      'SELECT * FROM personalized_responses WHERE id = $1',
      [id]
    );

    if (responseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Personalized response not found' });
    }

    const response = responseResult.rows[0];

    const review = {
      text: response.original_review,
      rating: response.review_sentiment === 'positive' ? 5 : response.review_sentiment === 'negative' ? 2 : 3,
      sentiment: response.review_sentiment
    };

    const reviewerProfile = response.reviewer_profile || {
      name: response.reviewer_name,
      previous_reviews: 0,
      loyalty_status: 'new',
      preferred_tone: 'friendly'
    };

    const analysis = await aiService.personalizeResponse(review, reviewerProfile);

    const updateResult = await pool.query(`
      UPDATE personalized_responses
      SET personalization_factors = $1,
          generated_response = $2,
          tone = $3,
          personalization_score = $4,
          ai_reasoning = $5,
          status = 'generated',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [
      analysis.personalization_factors,
      analysis.generated_response,
      analysis.tone,
      analysis.personalization_score,
      analysis.reasoning,
      id
    ]);

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Generate personalized response error:', error);
    res.status(500).json({ error: 'Failed to generate personalized response' });
  }
};

const exportCSV = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, reviewer_name, review_sentiment, tone, personalization_score, status, generated_response FROM personalized_responses ORDER BY created_at DESC');
    const parser = new Parser({ fields: ['id', 'reviewer_name', 'review_sentiment', 'tone', 'personalization_score', 'status', 'generated_response'] });
    const csv = parser.parse(result.rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="personalized_responses.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
};

const exportPDF = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM personalized_responses ORDER BY created_at DESC');
    generatePDF('Personalized Responses', [
      { key: 'id', label: 'ID' },
      { key: 'reviewer_name', label: 'Reviewer' },
      { key: 'review_sentiment', label: 'Sentiment' },
      { key: 'tone', label: 'Tone' },
      { key: 'status', label: 'Status' }
    ], result.rows, res);
  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    const result = await pool.query('DELETE FROM personalized_responses WHERE id = ANY($1) RETURNING id', [ids]);
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
    const params = [ids];
    let paramCount = 1;
    const allowed = ['status', 'tone'];

    Object.entries(updates).forEach(([key, value]) => {
      if (allowed.includes(key)) {
        paramCount++;
        setClauses.push(`${key} = $${paramCount}`);
        params.push(value);
      }
    });

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');

    const result = await pool.query(
      `UPDATE personalized_responses SET ${setClauses.join(', ')} WHERE id = ANY($1) RETURNING *`,
      params
    );

    res.json({ message: `${result.rowCount} items updated`, data: result.rows });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Bulk update failed' });
  }
};

module.exports = {
  getAllPersonalizedResponses,
  getPersonalizedResponseById,
  createPersonalizedResponse,
  updatePersonalizedResponse,
  deletePersonalizedResponse,
  generatePersonalizedResponse,
  exportCSV,
  exportPDF,
  bulkDelete,
  bulkUpdate
};
