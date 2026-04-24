const pool = require('../config/database');
const aiService = require('../services/aiService');
const { parsePagination, buildPaginationResponse, buildSortClause } = require('../middleware/pagination');
const { Parser } = require('json2csv');
const { generatePDF } = require('../services/pdfService');

const getAllCounterfeitDetections = async (req, res) => {
  try {
    const { risk_level, status, platform, search, sort_by, sort_order } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    let whereClause = ' WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (risk_level) {
      paramCount++;
      whereClause += ` AND risk_level = $${paramCount}`;
      params.push(risk_level);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (platform) {
      paramCount++;
      whereClause += ` AND platform = $${paramCount}`;
      params.push(platform);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (product_name ILIKE $${paramCount} OR seller_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const orderClause = buildSortClause(sort_by, sort_order, ['created_at', 'risk_score', 'product_name']);

    const countResult = await pool.query(`SELECT COUNT(*) FROM counterfeit_detections${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    const result = await pool.query(
      `SELECT * FROM counterfeit_detections${whereClause} ORDER BY ${orderClause} LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    res.json(buildPaginationResponse(result.rows, total, page, limit));
  } catch (error) {
    console.error('Get counterfeit detections error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCounterfeitDetectionById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM counterfeit_detections WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Detection not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get counterfeit detection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createCounterfeitDetection = async (req, res) => {
  try {
    const { product_name, seller_name, platform, review_count } = req.body;

    const result = await pool.query(`
      INSERT INTO counterfeit_detections (product_name, seller_name, platform, review_count)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [product_name, seller_name, platform, review_count || 0]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create counterfeit detection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateCounterfeitDetection = async (req, res) => {
  try {
    const { id } = req.params;
    const { product_name, seller_name, platform, review_count, risk_level, risk_score, warning_signs, suspicious_reviews, ai_analysis, status, action_taken } = req.body;

    const result = await pool.query(`
      UPDATE counterfeit_detections
      SET product_name = COALESCE($1, product_name),
          seller_name = COALESCE($2, seller_name),
          platform = COALESCE($3, platform),
          review_count = COALESCE($4, review_count),
          risk_level = COALESCE($5, risk_level),
          risk_score = COALESCE($6, risk_score),
          warning_signs = COALESCE($7, warning_signs),
          suspicious_reviews = COALESCE($8, suspicious_reviews),
          ai_analysis = COALESCE($9, ai_analysis),
          status = COALESCE($10, status),
          action_taken = COALESCE($11, action_taken),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `, [product_name, seller_name, platform, review_count, risk_level, risk_score, warning_signs, suspicious_reviews, ai_analysis, status, action_taken, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Detection not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update counterfeit detection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteCounterfeitDetection = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM counterfeit_detections WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Detection not found' });
    }

    res.json({ message: 'Detection deleted successfully' });
  } catch (error) {
    console.error('Delete counterfeit detection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const analyzeCounterfeit = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviews } = req.body;

    const detectionResult = await pool.query(
      'SELECT * FROM counterfeit_detections WHERE id = $1',
      [id]
    );

    if (detectionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Detection not found' });
    }

    const detection = detectionResult.rows[0];

    const reviewsToAnalyze = reviews || [
      'Product quality seems different from what I expected',
      'Packaging looked different from the official brand',
      'Great product, exactly as described!'
    ];

    const analysis = await aiService.detectCounterfeit(
      detection.product_name,
      reviewsToAnalyze,
      detection.seller_name
    );

    const updateResult = await pool.query(`
      UPDATE counterfeit_detections
      SET risk_level = $1,
          risk_score = $2,
          warning_signs = $3,
          suspicious_reviews = $4,
          ai_analysis = $5,
          review_count = $6,
          status = 'analyzed',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [
      analysis.risk_level,
      analysis.risk_score,
      analysis.warning_signs,
      analysis.suspicious_reviews,
      analysis.analysis,
      reviewsToAnalyze.length,
      id
    ]);

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Analyze counterfeit error:', error);
    res.status(500).json({ error: 'Failed to analyze for counterfeit' });
  }
};

const exportCSV = async (req, res) => {
  try {
    const { risk_level, status, platform, search } = req.query;

    let whereClause = ' WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (risk_level) {
      paramCount++;
      whereClause += ` AND risk_level = $${paramCount}`;
      params.push(risk_level);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (platform) {
      paramCount++;
      whereClause += ` AND platform = $${paramCount}`;
      params.push(platform);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (product_name ILIKE $${paramCount} OR seller_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const result = await pool.query(
      `SELECT * FROM counterfeit_detections${whereClause} ORDER BY created_at DESC`,
      params
    );

    const fields = ['id', 'product_name', 'seller_name', 'platform', 'risk_level', 'risk_score', 'status'];
    const parser = new Parser({ fields });
    const csv = parser.parse(result.rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="counterfeit_detections.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
};

const exportPDF = async (req, res) => {
  try {
    const { risk_level, status, platform, search } = req.query;

    let whereClause = ' WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (risk_level) {
      paramCount++;
      whereClause += ` AND risk_level = $${paramCount}`;
      params.push(risk_level);
    }

    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (platform) {
      paramCount++;
      whereClause += ` AND platform = $${paramCount}`;
      params.push(platform);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (product_name ILIKE $${paramCount} OR seller_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const result = await pool.query(
      `SELECT * FROM counterfeit_detections${whereClause} ORDER BY created_at DESC`,
      params
    );

    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'product_name', label: 'Product' },
      { key: 'seller_name', label: 'Seller' },
      { key: 'risk_level', label: 'Risk' },
      { key: 'status', label: 'Status' }
    ];

    generatePDF('Counterfeit Detections', columns, result.rows, res);
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
      'DELETE FROM counterfeit_detections WHERE id = ANY($1) RETURNING id',
      [ids]
    );

    res.json({ message: `${result.rowCount} detection(s) deleted successfully`, deleted: result.rows.map(r => r.id) });
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

    const allowedColumns = ['status', 'risk_level'];
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
      `UPDATE counterfeit_detections SET ${setClauses.join(', ')} WHERE id = ANY($1) RETURNING *`,
      params
    );

    res.json({ message: `${result.rowCount} detection(s) updated successfully`, data: result.rows });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Failed to bulk update' });
  }
};

module.exports = {
  getAllCounterfeitDetections,
  getCounterfeitDetectionById,
  createCounterfeitDetection,
  updateCounterfeitDetection,
  deleteCounterfeitDetection,
  analyzeCounterfeit,
  exportCSV,
  exportPDF,
  bulkDelete,
  bulkUpdate
};
