const pool = require('../config/database');
const { parsePagination, buildPaginationResponse, buildSearchClause, buildSortClause } = require('../middleware/pagination');
const { Parser } = require('json2csv');
const { generatePDF } = require('../services/pdfService');

const getAllTemplates = async (req, res) => {
  try {
    const { category, is_active, search, sort_by, sort_order } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    let whereClause = ' WHERE user_id = $1';
    const params = [req.userId];
    let paramCount = 1;

    if (category) {
      paramCount++;
      whereClause += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (is_active !== undefined) {
      paramCount++;
      whereClause += ` AND is_active = $${paramCount}`;
      params.push(is_active === 'true');
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (name ILIKE $${paramCount} OR content ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const orderClause = buildSortClause(sort_by, sort_order, ['name', 'use_count', 'created_at']);

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM templates${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    const result = await pool.query(
      `SELECT * FROM templates${whereClause} ORDER BY ${orderClause} LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    res.json(buildPaginationResponse(result.rows, total, page, limit));
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM templates WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createTemplate = async (req, res) => {
  try {
    const { name, category, content, tone } = req.body;

    if (!name || !category || !content) {
      return res.status(400).json({ error: 'Name, category, and content are required' });
    }

    const result = await pool.query(`
      INSERT INTO templates (user_id, name, category, content, tone)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.userId, name, category, content, tone]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, content, tone, is_active } = req.body;

    const result = await pool.query(`
      UPDATE templates
      SET name = COALESCE($1, name),
          category = COALESCE($2, category),
          content = COALESCE($3, content),
          tone = COALESCE($4, tone),
          is_active = COALESCE($5, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND user_id = $7
      RETURNING *
    `, [name, category, content, tone, is_active, id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM templates WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const incrementUseCount = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE templates
      SET use_count = use_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Increment use count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const exportCSV = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, category, content, tone, use_count, is_active FROM templates WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    const parser = new Parser({ fields: ['id', 'name', 'category', 'content', 'tone', 'use_count', 'is_active'] });
    const csv = parser.parse(result.rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="templates.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
};

const exportPDF = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM templates WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    generatePDF('Templates', [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'category', label: 'Category' },
      { key: 'tone', label: 'Tone' },
      { key: 'use_count', label: 'Uses' },
      { key: 'is_active', label: 'Active' }
    ], result.rows, res);
  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    const result = await pool.query('DELETE FROM templates WHERE id = ANY($1) AND user_id = $2 RETURNING id', [ids, req.userId]);
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
      const allowed = ['category', 'is_active', 'tone'];
      if (allowed.includes(key)) {
        paramCount++;
        setClauses.push(`${key} = $${paramCount}`);
        params.push(value);
      }
    });

    if (setClauses.length === 0) return res.status(400).json({ error: 'No valid updates provided' });

    setClauses.push('updated_at = CURRENT_TIMESTAMP');

    const result = await pool.query(
      `UPDATE templates SET ${setClauses.join(', ')} WHERE id = ANY($1) AND user_id = $2 RETURNING *`,
      params
    );
    res.json({ message: `${result.rowCount} items updated`, data: result.rows });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Bulk update failed' });
  }
};

module.exports = {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  incrementUseCount,
  exportCSV,
  exportPDF,
  bulkDelete,
  bulkUpdate
};
