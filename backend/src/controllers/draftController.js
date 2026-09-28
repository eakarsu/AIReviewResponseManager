const pool = require('../config/database');
const { parsePagination, buildPaginationResponse, buildSearchClause, buildSortClause } = require('../middleware/pagination');
const { Parser } = require('json2csv');
const { generatePDF } = require('../services/pdfService');

const getAllDrafts = async (req, res) => {
  try {
    const { review_id, is_approved, is_sent, search, sort_by, sort_order } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    let whereClause = ' WHERE b.user_id = $1';
    const params = [req.userId];
    let paramCount = 1;

    if (review_id) {
      paramCount++;
      whereClause += ` AND d.review_id = $${paramCount}`;
      params.push(parseInt(review_id));
    }

    if (is_approved !== undefined) {
      paramCount++;
      whereClause += ` AND d.is_approved = $${paramCount}`;
      params.push(is_approved === 'true');
    }

    if (is_sent !== undefined) {
      paramCount++;
      whereClause += ` AND d.is_sent = $${paramCount}`;
      params.push(is_sent === 'true');
    }

    if (search) {
      paramCount++;
      whereClause += ` AND d.draft_text ILIKE $${paramCount}`;
      params.push(`%${search}%`);
    }

    const orderClause = buildSortClause(sort_by, sort_order, ['created_at']);

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM response_drafts d JOIN reviews r ON d.review_id = r.id JOIN businesses b ON r.business_id = b.id${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    const result = await pool.query(
      `SELECT d.*, r.reviewer_name, r.review_text, r.rating, r.platform
       FROM response_drafts d
       JOIN reviews r ON d.review_id = r.id
       JOIN businesses b ON r.business_id = b.id
       ${whereClause}
       ORDER BY d.${orderClause}
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    res.json(buildPaginationResponse(result.rows, total, page, limit));
  } catch (error) {
    console.error('Get drafts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getDraftById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT d.*, r.reviewer_name, r.review_text, r.rating, r.platform, r.business_id
      FROM response_drafts d
      JOIN reviews r ON d.review_id = r.id
      JOIN businesses b ON r.business_id = b.id
      WHERE d.id = $1 AND b.user_id = $2
    `, [id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get draft error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createDraft = async (req, res) => {
  try {
    const { review_id, draft_text, tone } = req.body;

    if (!review_id || !draft_text) {
      return res.status(400).json({ error: 'Review ID and draft text are required' });
    }

    const ownedReview = await pool.query(
      `SELECT r.id FROM reviews r
       JOIN businesses b ON r.business_id = b.id
       WHERE r.id = $1 AND b.user_id = $2`,
      [review_id, req.userId]
    );
    if (ownedReview.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const result = await pool.query(`
      INSERT INTO response_drafts (review_id, draft_text, tone)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [review_id, draft_text, tone || 'professional']);

    // Update review status to draft
    await pool.query(`
      UPDATE reviews SET response_status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = $1
    `, [review_id]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create draft error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const { draft_text, tone, is_approved, is_sent } = req.body;

    if (is_sent !== undefined) {
      return res.status(400).json({ error: 'is_sent is set by delivery, not by direct update' });
    }

    const result = await pool.query(`
      UPDATE response_drafts
      SET draft_text = COALESCE($1, draft_text),
          tone = COALESCE($2, tone),
          is_approved = COALESCE($3, is_approved),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
        AND review_id IN (
          SELECT r.id FROM reviews r JOIN businesses b ON r.business_id = b.id WHERE b.user_id = $5
        )
      RETURNING *
    `, [draft_text, tone, is_approved, id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update draft error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteDraft = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM response_drafts
       WHERE id = $1
         AND review_id IN (
           SELECT r.id FROM reviews r JOIN businesses b ON r.business_id = b.id WHERE b.user_id = $2
         )
       RETURNING *`,
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json({ message: 'Draft deleted successfully' });
  } catch (error) {
    console.error('Delete draft error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const approveDraft = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE response_drafts
      SET is_approved = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND review_id IN (
          SELECT r.id FROM reviews r JOIN businesses b ON r.business_id = b.id WHERE b.user_id = $2
        )
      RETURNING *
    `, [id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Approve draft error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const sendDraft = async (req, res) => {
  try {
    const { id } = req.params;

    // Publishing responses back to Google/Yelp requires a configured platform
    // integration. Until one exists this must fail loudly instead of marking
    // the draft as sent.
    const owned = await pool.query(
      `SELECT d.id FROM response_drafts d
       JOIN reviews r ON d.review_id = r.id
       JOIN businesses b ON r.business_id = b.id
       WHERE d.id = $1 AND b.user_id = $2`,
      [id, req.userId]
    );
    if (owned.rows.length === 0) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    return res.status(501).json({
      error: 'Publishing responses to review platforms is not configured',
      code: 'platform_delivery_unavailable',
      detail: 'No Google/Yelp publishing integration is configured, so this draft was not sent.',
    });
  } catch (error) {
    console.error('Send draft error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const exportCSV = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.id, d.draft_text, d.tone, d.is_approved, d.is_sent, d.created_at
      FROM response_drafts d
      JOIN reviews r ON d.review_id = r.id
      JOIN businesses b ON r.business_id = b.id
      WHERE b.user_id = $1
      ORDER BY d.created_at DESC
    `, [req.userId]);
    const parser = new Parser({ fields: ['id', 'draft_text', 'tone', 'is_approved', 'is_sent', 'created_at'] });
    const csv = parser.parse(result.rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="drafts.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
};

const exportPDF = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, r.reviewer_name, r.platform
      FROM response_drafts d
      JOIN reviews r ON d.review_id = r.id
      JOIN businesses b ON r.business_id = b.id
      WHERE b.user_id = $1
      ORDER BY d.created_at DESC
    `, [req.userId]);
    generatePDF('Response Drafts', [
      { key: 'id', label: 'ID' },
      { key: 'reviewer_name', label: 'Reviewer' },
      { key: 'tone', label: 'Tone' },
      { key: 'is_approved', label: 'Approved' },
      { key: 'is_sent', label: 'Sent' },
      { key: 'created_at', label: 'Created' }
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
      `DELETE FROM response_drafts
       WHERE id = ANY($1)
         AND review_id IN (
           SELECT r.id FROM reviews r JOIN businesses b ON r.business_id = b.id WHERE b.user_id = $2
         )
       RETURNING id`,
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
      const allowed = ['is_approved', 'tone'];
      if (allowed.includes(key)) {
        paramCount++;
        setClauses.push(`${key} = $${paramCount}`);
        params.push(value);
      }
    });

    if (setClauses.length === 0) return res.status(400).json({ error: 'No valid updates provided' });

    setClauses.push('updated_at = CURRENT_TIMESTAMP');

    const result = await pool.query(
      `UPDATE response_drafts SET ${setClauses.join(', ')}
       WHERE id = ANY($1)
         AND review_id IN (
           SELECT r.id FROM reviews r JOIN businesses b ON r.business_id = b.id WHERE b.user_id = $2
         )
       RETURNING *`,
      params
    );
    res.json({ message: `${result.rowCount} items updated`, data: result.rows });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Bulk update failed' });
  }
};

module.exports = {
  getAllDrafts,
  getDraftById,
  createDraft,
  updateDraft,
  deleteDraft,
  approveDraft,
  sendDraft,
  exportCSV,
  exportPDF,
  bulkDelete,
  bulkUpdate
};
