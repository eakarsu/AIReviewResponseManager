const pool = require('../config/database');
const aiService = require('../services/aiService');
const { parsePagination, buildPaginationResponse, buildSortClause } = require('../middleware/pagination');
const { Parser } = require('json2csv');
const { generatePDF } = require('../services/pdfService');

const getAllTrendAnalyses = async (req, res) => {
  try {
    const { business_name, trend_direction, search, sort_by, sort_order } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    let whereClause = ' WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (business_name) {
      paramCount++;
      whereClause += ` AND business_name ILIKE $${paramCount}`;
      params.push(`%${business_name}%`);
    }

    if (trend_direction) {
      paramCount++;
      whereClause += ` AND trend_direction = $${paramCount}`;
      params.push(trend_direction);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (analysis_name ILIKE $${paramCount} OR business_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const orderClause = buildSortClause(sort_by, sort_order, ['created_at', 'sentiment_change', 'analysis_name']);

    const countResult = await pool.query(`SELECT COUNT(*) FROM trend_analyses${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    const result = await pool.query(
      `SELECT * FROM trend_analyses${whereClause} ORDER BY ${orderClause} LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    res.json(buildPaginationResponse(result.rows, total, page, limit));
  } catch (error) {
    console.error('Get trend analyses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getTrendAnalysisById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM trend_analyses WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get trend analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createTrendAnalysis = async (req, res) => {
  try {
    const { analysis_name, business_name, date_range_start, date_range_end } = req.body;

    const result = await pool.query(`
      INSERT INTO trend_analyses (analysis_name, business_name, date_range_start, date_range_end)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [analysis_name, business_name, date_range_start, date_range_end]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create trend analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateTrendAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const { analysis_name, business_name, date_range_start, date_range_end, trend_direction, sentiment_change, emerging_topics, declining_topics, seasonal_patterns, ai_prediction, recommendations } = req.body;

    const result = await pool.query(`
      UPDATE trend_analyses
      SET analysis_name = COALESCE($1, analysis_name),
          business_name = COALESCE($2, business_name),
          date_range_start = COALESCE($3, date_range_start),
          date_range_end = COALESCE($4, date_range_end),
          trend_direction = COALESCE($5, trend_direction),
          sentiment_change = COALESCE($6, sentiment_change),
          emerging_topics = COALESCE($7, emerging_topics),
          declining_topics = COALESCE($8, declining_topics),
          seasonal_patterns = COALESCE($9, seasonal_patterns),
          ai_prediction = COALESCE($10, ai_prediction),
          recommendations = COALESCE($11, recommendations),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `, [analysis_name, business_name, date_range_start, date_range_end, trend_direction, sentiment_change, emerging_topics, declining_topics, seasonal_patterns, ai_prediction, recommendations, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update trend analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteTrendAnalysis = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM trend_analyses WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json({ message: 'Analysis deleted successfully' });
  } catch (error) {
    console.error('Delete trend analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const runAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const { review_data } = req.body;

    const analysisResult = await pool.query(
      'SELECT * FROM trend_analyses WHERE id = $1',
      [id]
    );

    if (analysisResult.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const analysis = analysisResult.rows[0];

    const reviewData = review_data || {
      total_reviews: 150,
      average_rating_start: 4.2,
      average_rating_end: 4.5,
      sentiment_scores: [65, 68, 72, 75, 78],
      monthly_reviews: [20, 25, 30, 35, 40]
    };

    const aiAnalysis = await aiService.analyzeTrends(
      analysis.business_name,
      reviewData,
      { start: analysis.date_range_start, end: analysis.date_range_end }
    );

    const updateResult = await pool.query(`
      UPDATE trend_analyses
      SET trend_direction = $1,
          sentiment_change = $2,
          emerging_topics = $3,
          declining_topics = $4,
          seasonal_patterns = $5,
          ai_prediction = $6,
          recommendations = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [
      aiAnalysis.trend_direction,
      parseFloat(String(aiAnalysis.sentiment_change).replace(/[^-\d.]/g, '')) || 0,
      aiAnalysis.emerging_topics,
      aiAnalysis.declining_topics,
      aiAnalysis.seasonal_patterns,
      aiAnalysis.prediction,
      aiAnalysis.recommendations,
      id
    ]);

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Run trend analysis error:', error);
    res.status(500).json({ error: 'Failed to run analysis' });
  }
};

const exportCSV = async (req, res) => {
  try {
    const { business_name, trend_direction, search } = req.query;

    let whereClause = ' WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (business_name) {
      paramCount++;
      whereClause += ` AND business_name ILIKE $${paramCount}`;
      params.push(`%${business_name}%`);
    }

    if (trend_direction) {
      paramCount++;
      whereClause += ` AND trend_direction = $${paramCount}`;
      params.push(trend_direction);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (analysis_name ILIKE $${paramCount} OR business_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const result = await pool.query(
      `SELECT * FROM trend_analyses${whereClause} ORDER BY created_at DESC`,
      params
    );

    const fields = ['id', 'analysis_name', 'business_name', 'trend_direction', 'sentiment_change', 'date_range_start', 'date_range_end'];
    const parser = new Parser({ fields });
    const csv = parser.parse(result.rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="trend_analyses.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
};

const exportPDF = async (req, res) => {
  try {
    const { business_name, trend_direction, search } = req.query;

    let whereClause = ' WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (business_name) {
      paramCount++;
      whereClause += ` AND business_name ILIKE $${paramCount}`;
      params.push(`%${business_name}%`);
    }

    if (trend_direction) {
      paramCount++;
      whereClause += ` AND trend_direction = $${paramCount}`;
      params.push(trend_direction);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (analysis_name ILIKE $${paramCount} OR business_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const result = await pool.query(
      `SELECT * FROM trend_analyses${whereClause} ORDER BY created_at DESC`,
      params
    );

    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'analysis_name', label: 'Analysis' },
      { key: 'business_name', label: 'Business' },
      { key: 'trend_direction', label: 'Trend' },
      { key: 'sentiment_change', label: 'Change' }
    ];

    generatePDF('Trend Analyses', columns, result.rows, res);
  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const result = await pool.query(
      'DELETE FROM trend_analyses WHERE id = ANY($1) RETURNING id',
      [ids]
    );

    res.json({ message: `${result.rowCount} analysis(es) deleted successfully`, deleted: result.rows.map(r => r.id) });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Failed to bulk delete' });
  }
};

const bulkUpdate = async (req, res) => {
  try {
    const { ids, updates } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'updates object is required' });
    }

    const allowedColumns = ['trend_direction'];
    const setClauses = [];
    const params = [ids];
    let paramCount = 1;

    for (const key of Object.keys(updates)) {
      if (allowedColumns.includes(key)) {
        paramCount++;
        setClauses.push(`${key} = $${paramCount}`);
        params.push(updates[key]);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid columns to update' });
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');

    const result = await pool.query(
      `UPDATE trend_analyses SET ${setClauses.join(', ')} WHERE id = ANY($1) RETURNING *`,
      params
    );

    res.json({ message: `${result.rowCount} analysis(es) updated successfully`, data: result.rows });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Failed to bulk update' });
  }
};

module.exports = {
  getAllTrendAnalyses,
  getTrendAnalysisById,
  createTrendAnalysis,
  updateTrendAnalysis,
  deleteTrendAnalysis,
  runAnalysis,
  exportCSV,
  exportPDF,
  bulkDelete,
  bulkUpdate
};
