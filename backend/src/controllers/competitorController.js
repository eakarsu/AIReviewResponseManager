const pool = require('../config/database');
const aiService = require('../services/aiService');
const { parsePagination, buildPaginationResponse, buildSortClause } = require('../middleware/pagination');
const { Parser } = require('json2csv');
const { generatePDF } = require('../services/pdfService');

const getAllCompetitorMonitors = async (req, res) => {
  try {
    const { monitoring_status, business_category, competitor_platform, search, sort_by, sort_order } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    let whereClause = ' WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (monitoring_status) {
      paramCount++;
      whereClause += ` AND monitoring_status = $${paramCount}`;
      params.push(monitoring_status);
    }

    if (business_category) {
      paramCount++;
      whereClause += ` AND business_category = $${paramCount}`;
      params.push(business_category);
    }

    if (competitor_platform) {
      paramCount++;
      whereClause += ` AND competitor_platform = $${paramCount}`;
      params.push(competitor_platform);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (competitor_name ILIKE $${paramCount} OR business_category ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const orderClause = buildSortClause(sort_by, sort_order, ['created_at', 'average_rating', 'sentiment_score', 'competitor_name']);

    const countResult = await pool.query(`SELECT COUNT(*) FROM competitor_monitors${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    const result = await pool.query(
      `SELECT * FROM competitor_monitors${whereClause} ORDER BY ${orderClause} LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    res.json(buildPaginationResponse(result.rows, total, page, limit));
  } catch (error) {
    console.error('Get competitor monitors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCompetitorMonitorById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM competitor_monitors WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Competitor monitor not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get competitor monitor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createCompetitorMonitor = async (req, res) => {
  try {
    const { competitor_name, competitor_platform, business_category, total_reviews, average_rating } = req.body;

    const result = await pool.query(`
      INSERT INTO competitor_monitors (competitor_name, competitor_platform, business_category, total_reviews, average_rating)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [competitor_name, competitor_platform, business_category, total_reviews || 0, average_rating]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create competitor monitor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateCompetitorMonitor = async (req, res) => {
  try {
    const { id } = req.params;
    const { competitor_name, competitor_platform, business_category, total_reviews, average_rating, sentiment_score, strengths, weaknesses, key_differentiators, ai_competitive_analysis, monitoring_status } = req.body;

    const result = await pool.query(`
      UPDATE competitor_monitors
      SET competitor_name = COALESCE($1, competitor_name),
          competitor_platform = COALESCE($2, competitor_platform),
          business_category = COALESCE($3, business_category),
          total_reviews = COALESCE($4, total_reviews),
          average_rating = COALESCE($5, average_rating),
          sentiment_score = COALESCE($6, sentiment_score),
          strengths = COALESCE($7, strengths),
          weaknesses = COALESCE($8, weaknesses),
          key_differentiators = COALESCE($9, key_differentiators),
          ai_competitive_analysis = COALESCE($10, ai_competitive_analysis),
          monitoring_status = COALESCE($11, monitoring_status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `, [competitor_name, competitor_platform, business_category, total_reviews, average_rating, sentiment_score, strengths, weaknesses, key_differentiators, ai_competitive_analysis, monitoring_status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Competitor monitor not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update competitor monitor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteCompetitorMonitor = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM competitor_monitors WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Competitor monitor not found' });
    }

    res.json({ message: 'Competitor monitor deleted successfully' });
  } catch (error) {
    console.error('Delete competitor monitor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const analyzeCompetitor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviews } = req.body;

    const monitorResult = await pool.query(
      'SELECT * FROM competitor_monitors WHERE id = $1',
      [id]
    );

    if (monitorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Competitor monitor not found' });
    }

    const monitor = monitorResult.rows[0];

    const reviewsToAnalyze = reviews || [
      { rating: 5, text: 'Excellent service and great food!' },
      { rating: 4, text: 'Good experience, slightly slow service' },
      { rating: 3, text: 'Average food, decent prices' },
      { rating: 2, text: 'Disappointed with the quality' }
    ];

    const analysis = await aiService.analyzeCompetitor(monitor.competitor_name, reviewsToAnalyze);

    const updateResult = await pool.query(`
      UPDATE competitor_monitors
      SET sentiment_score = $1,
          strengths = $2,
          weaknesses = $3,
          key_differentiators = $4,
          ai_competitive_analysis = $5,
          total_reviews = $6,
          last_scraped = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [
      analysis.sentiment_score,
      analysis.strengths,
      analysis.weaknesses,
      analysis.key_differentiators,
      analysis.competitive_analysis,
      reviewsToAnalyze.length,
      id
    ]);

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Analyze competitor error:', error);
    res.status(500).json({ error: 'Failed to analyze competitor' });
  }
};

const exportCSV = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, competitor_name, competitor_platform, business_category, total_reviews, average_rating, sentiment_score, monitoring_status FROM competitor_monitors ORDER BY created_at DESC');
    const parser = new Parser({ fields: ['id', 'competitor_name', 'competitor_platform', 'business_category', 'total_reviews', 'average_rating', 'sentiment_score', 'monitoring_status'] });
    const csv = parser.parse(result.rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="competitor_monitors.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
};

const exportPDF = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM competitor_monitors ORDER BY created_at DESC');
    generatePDF('Competitor Monitors', [
      { key: 'id', label: 'ID' },
      { key: 'competitor_name', label: 'Competitor' },
      { key: 'business_category', label: 'Category' },
      { key: 'average_rating', label: 'Rating' },
      { key: 'monitoring_status', label: 'Status' }
    ], result.rows, res);
  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    const result = await pool.query('DELETE FROM competitor_monitors WHERE id = ANY($1) RETURNING id', [ids]);
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
    const allowed = ['monitoring_status', 'business_category'];

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
      `UPDATE competitor_monitors SET ${setClauses.join(', ')} WHERE id = ANY($1) RETURNING *`,
      params
    );

    res.json({ message: `${result.rowCount} items updated`, data: result.rows });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Bulk update failed' });
  }
};

module.exports = {
  getAllCompetitorMonitors,
  getCompetitorMonitorById,
  createCompetitorMonitor,
  updateCompetitorMonitor,
  deleteCompetitorMonitor,
  analyzeCompetitor,
  exportCSV,
  exportPDF,
  bulkDelete,
  bulkUpdate
};
