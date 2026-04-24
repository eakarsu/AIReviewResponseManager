const pool = require('../config/database');
const aiService = require('../services/aiService');
const { parsePagination, buildPaginationResponse, buildSortClause } = require('../middleware/pagination');
const { Parser } = require('json2csv');
const { generatePDF } = require('../services/pdfService');

const getAllFakeReviewDetections = async (req, res) => {
  try {
    const { status, platform, search, sort_by, sort_order } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    let whereClause = ' WHERE 1=1';
    const params = [];
    let paramCount = 0;

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
      whereClause += ` AND (review_text ILIKE $${paramCount} OR reviewer_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const orderClause = buildSortClause(sort_by, sort_order, ['created_at', 'fake_probability', 'confidence_score']);

    const countResult = await pool.query(`SELECT COUNT(*) FROM fake_review_detections${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    const result = await pool.query(
      `SELECT * FROM fake_review_detections${whereClause} ORDER BY ${orderClause} LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    res.json(buildPaginationResponse(result.rows, total, page, limit));
  } catch (error) {
    console.error('Get fake review detections error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getFakeReviewDetectionById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM fake_review_detections WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Detection not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get fake review detection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createFakeReviewDetection = async (req, res) => {
  try {
    const { review_text, reviewer_name, platform } = req.body;

    const result = await pool.query(`
      INSERT INTO fake_review_detections (review_text, reviewer_name, platform)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [review_text, reviewer_name, platform]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create fake review detection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateFakeReviewDetection = async (req, res) => {
  try {
    const { id } = req.params;
    const { review_text, reviewer_name, platform, fake_probability, confidence_score, red_flags, ai_analysis, status, verified_by, is_fake } = req.body;

    const result = await pool.query(`
      UPDATE fake_review_detections
      SET review_text = COALESCE($1, review_text),
          reviewer_name = COALESCE($2, reviewer_name),
          platform = COALESCE($3, platform),
          fake_probability = COALESCE($4, fake_probability),
          confidence_score = COALESCE($5, confidence_score),
          red_flags = COALESCE($6, red_flags),
          ai_analysis = COALESCE($7, ai_analysis),
          status = COALESCE($8, status),
          verified_by = COALESCE($9, verified_by),
          is_fake = COALESCE($10, is_fake),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [review_text, reviewer_name, platform, fake_probability, confidence_score, red_flags, ai_analysis, status, verified_by, is_fake, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Detection not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update fake review detection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteFakeReviewDetection = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM fake_review_detections WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Detection not found' });
    }

    res.json({ message: 'Detection deleted successfully' });
  } catch (error) {
    console.error('Delete fake review detection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const analyzeReview = async (req, res) => {
  try {
    const { id } = req.params;

    const detectionResult = await pool.query(
      'SELECT * FROM fake_review_detections WHERE id = $1',
      [id]
    );

    if (detectionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Detection not found' });
    }

    const detection = detectionResult.rows[0];
    const analysis = await aiService.detectFakeReview(
      detection.review_text,
      detection.reviewer_name,
      detection.platform
    );

    const updateResult = await pool.query(`
      UPDATE fake_review_detections
      SET fake_probability = $1,
          confidence_score = $2,
          red_flags = $3,
          ai_analysis = $4,
          status = 'analyzed',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [
      analysis.fake_probability,
      analysis.confidence_score,
      analysis.red_flags,
      analysis.analysis,
      id
    ]);

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Analyze review error:', error);
    res.status(500).json({ error: 'Failed to analyze review' });
  }
};

const exportCSV = async (req, res) => {
  try {
    const { status, platform, search } = req.query;

    let whereClause = ' WHERE 1=1';
    const params = [];
    let paramCount = 0;

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
      whereClause += ` AND (review_text ILIKE $${paramCount} OR reviewer_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const result = await pool.query(
      `SELECT * FROM fake_review_detections${whereClause} ORDER BY created_at DESC`,
      params
    );

    const fields = ['id', 'review_text', 'reviewer_name', 'platform', 'fake_probability', 'confidence_score', 'status'];
    const parser = new Parser({ fields });
    const csv = parser.parse(result.rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="fake_review_detections.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
};

const exportPDF = async (req, res) => {
  try {
    const { status, platform, search } = req.query;

    let whereClause = ' WHERE 1=1';
    const params = [];
    let paramCount = 0;

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
      whereClause += ` AND (review_text ILIKE $${paramCount} OR reviewer_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const result = await pool.query(
      `SELECT * FROM fake_review_detections${whereClause} ORDER BY created_at DESC`,
      params
    );

    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'reviewer_name', label: 'Reviewer' },
      { key: 'platform', label: 'Platform' },
      { key: 'fake_probability', label: 'Fake %' },
      { key: 'status', label: 'Status' }
    ];

    generatePDF('Fake Review Detections', columns, result.rows, res);
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
      'DELETE FROM fake_review_detections WHERE id = ANY($1) RETURNING id',
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

    const allowedColumns = ['status'];
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
      `UPDATE fake_review_detections SET ${setClauses.join(', ')} WHERE id = ANY($1) RETURNING *`,
      params
    );

    res.json({ message: `${result.rowCount} detection(s) updated successfully`, data: result.rows });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Failed to bulk update' });
  }
};

module.exports = {
  getAllFakeReviewDetections,
  getFakeReviewDetectionById,
  createFakeReviewDetection,
  updateFakeReviewDetection,
  deleteFakeReviewDetection,
  analyzeReview,
  exportCSV,
  exportPDF,
  bulkDelete,
  bulkUpdate
};
