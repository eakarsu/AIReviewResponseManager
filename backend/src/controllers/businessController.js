const pool = require('../config/database');
const { parsePagination, buildPaginationResponse, buildSearchClause, buildSortClause } = require('../middleware/pagination');
const { Parser } = require('json2csv');
const { generatePDF } = require('../services/pdfService');

const getAllBusinesses = async (req, res) => {
  try {
    const { platform, search, sort_by, sort_order } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    let whereClause = ' WHERE user_id = $1';
    const params = [req.userId];
    let paramCount = 1;

    if (platform) {
      paramCount++;
      whereClause += ` AND platform = $${paramCount}`;
      params.push(platform);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (name ILIKE $${paramCount} OR address ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const orderClause = buildSortClause(sort_by, sort_order, ['name', 'rating', 'created_at']);

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM businesses${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    const result = await pool.query(
      `SELECT * FROM businesses${whereClause} ORDER BY ${orderClause} LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    res.json(buildPaginationResponse(result.rows, total, page, limit));
  } catch (error) {
    console.error('Get businesses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM businesses WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Get review stats for this business
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total_reviews,
        ROUND(AVG(rating), 2) as average_rating,
        COUNT(CASE WHEN response_status = 'pending' THEN 1 END) as pending_reviews
      FROM reviews WHERE business_id = $1
    `, [id]);

    res.json({
      ...result.rows[0],
      stats: statsResult.rows[0]
    });
  } catch (error) {
    console.error('Get business error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createBusiness = async (req, res) => {
  try {
    const { name, platform, business_id, address, phone, category } = req.body;

    if (!name || !platform) {
      return res.status(400).json({ error: 'Name and platform are required' });
    }

    const result = await pool.query(`
      INSERT INTO businesses (user_id, name, platform, business_id, address, phone, category)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [req.userId, name, platform, business_id, address, phone, category]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create business error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, platform, business_id, address, phone, category, rating, review_count } = req.body;

    const result = await pool.query(`
      UPDATE businesses
      SET name = COALESCE($1, name),
          platform = COALESCE($2, platform),
          business_id = COALESCE($3, business_id),
          address = COALESCE($4, address),
          phone = COALESCE($5, phone),
          category = COALESCE($6, category),
          rating = COALESCE($7, rating),
          review_count = COALESCE($8, review_count),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND user_id = $10
      RETURNING *
    `, [name, platform, business_id, address, phone, category, rating, review_count, id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update business error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteBusiness = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM businesses WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json({ message: 'Business deleted successfully' });
  } catch (error) {
    console.error('Delete business error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const exportCSV = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, platform, address, phone, rating, review_count FROM businesses WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    const parser = new Parser({ fields: ['id', 'name', 'platform', 'address', 'phone', 'rating', 'review_count'] });
    const csv = parser.parse(result.rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="businesses.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
};

const exportPDF = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM businesses WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    generatePDF('Businesses', [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'platform', label: 'Platform' },
      { key: 'rating', label: 'Rating' },
      { key: 'review_count', label: 'Reviews' }
    ], result.rows, res);
  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    const result = await pool.query('DELETE FROM businesses WHERE id = ANY($1) AND user_id = $2 RETURNING id', [ids, req.userId]);
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
      const allowed = ['platform', 'category'];
      if (allowed.includes(key)) {
        paramCount++;
        setClauses.push(`${key} = $${paramCount}`);
        params.push(value);
      }
    });

    if (setClauses.length === 0) return res.status(400).json({ error: 'No valid updates provided' });

    setClauses.push('updated_at = CURRENT_TIMESTAMP');

    const result = await pool.query(
      `UPDATE businesses SET ${setClauses.join(', ')} WHERE id = ANY($1) AND user_id = $2 RETURNING *`,
      params
    );
    res.json({ message: `${result.rowCount} items updated`, data: result.rows });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Bulk update failed' });
  }
};

module.exports = {
  getAllBusinesses,
  getBusinessById,
  createBusiness,
  updateBusiness,
  deleteBusiness,
  exportCSV,
  exportPDF,
  bulkDelete,
  bulkUpdate
};
