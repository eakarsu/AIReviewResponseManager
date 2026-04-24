const pool = require('../config/database');
const aiService = require('../services/aiService');
const { parsePagination, buildPaginationResponse, buildSortClause } = require('../middleware/pagination');
const { Parser } = require('json2csv');
const { generatePDF } = require('../services/pdfService');

const getAllReviewSolicitations = async (req, res) => {
  try {
    const { status, channel, search, sort_by, sort_order } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    let whereClause = ' WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (channel) {
      paramCount++;
      whereClause += ` AND channel = $${paramCount}`;
      params.push(channel);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (customer_name ILIKE $${paramCount} OR customer_email ILIKE $${paramCount} OR product_service ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const orderClause = buildSortClause(sort_by, sort_order, ['created_at', 'customer_name', 'purchase_date', 'optimal_send_time']);

    const countResult = await pool.query(`SELECT COUNT(*) FROM review_solicitations${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    const result = await pool.query(
      `SELECT * FROM review_solicitations${whereClause} ORDER BY ${orderClause} LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    res.json(buildPaginationResponse(result.rows, total, page, limit));
  } catch (error) {
    console.error('Get review solicitations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getReviewSolicitationById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM review_solicitations WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get review solicitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createReviewSolicitation = async (req, res) => {
  try {
    const { customer_name, customer_email, customer_phone, purchase_date, product_service } = req.body;

    const result = await pool.query(`
      INSERT INTO review_solicitations (customer_name, customer_email, customer_phone, purchase_date, product_service)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [customer_name, customer_email, customer_phone, purchase_date, product_service]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create review solicitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateReviewSolicitation = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, customer_email, customer_phone, purchase_date, product_service, optimal_send_time, channel, message_template, personalized_message, ai_timing_reason, status, sent_at, response_received } = req.body;

    const result = await pool.query(`
      UPDATE review_solicitations
      SET customer_name = COALESCE($1, customer_name),
          customer_email = COALESCE($2, customer_email),
          customer_phone = COALESCE($3, customer_phone),
          purchase_date = COALESCE($4, purchase_date),
          product_service = COALESCE($5, product_service),
          optimal_send_time = COALESCE($6, optimal_send_time),
          channel = COALESCE($7, channel),
          message_template = COALESCE($8, message_template),
          personalized_message = COALESCE($9, personalized_message),
          ai_timing_reason = COALESCE($10, ai_timing_reason),
          status = COALESCE($11, status),
          sent_at = COALESCE($12, sent_at),
          response_received = COALESCE($13, response_received),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `, [customer_name, customer_email, customer_phone, purchase_date, product_service, optimal_send_time, channel, message_template, personalized_message, ai_timing_reason, status, sent_at, response_received, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update review solicitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteReviewSolicitation = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM review_solicitations WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitation not found' });
    }

    res.json({ message: 'Solicitation deleted successfully' });
  } catch (error) {
    console.error('Delete review solicitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const generateSolicitation = async (req, res) => {
  try {
    const { id } = req.params;

    const solicitationResult = await pool.query(
      'SELECT * FROM review_solicitations WHERE id = $1',
      [id]
    );

    if (solicitationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitation not found' });
    }

    const solicitation = solicitationResult.rows[0];

    const customer = {
      name: solicitation.customer_name,
      email: solicitation.customer_email,
      phone: solicitation.customer_phone,
      purchase_date: solicitation.purchase_date,
      product_service: solicitation.product_service
    };

    const analysis = await aiService.generateSolicitation(customer);

    // Calculate optimal send time (e.g., 3 days after purchase at 10am)
    const purchaseDate = new Date(solicitation.purchase_date);
    const optimalTime = new Date(purchaseDate);
    optimalTime.setDate(optimalTime.getDate() + 3);
    optimalTime.setHours(10, 0, 0, 0);

    const updateResult = await pool.query(`
      UPDATE review_solicitations
      SET optimal_send_time = $1,
          channel = $2,
          message_template = $3,
          personalized_message = $4,
          ai_timing_reason = $5,
          status = 'ready',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [
      optimalTime,
      analysis.recommended_channel,
      analysis.message_template,
      analysis.personalized_message,
      analysis.timing_reason,
      id
    ]);

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Generate solicitation error:', error);
    res.status(500).json({ error: 'Failed to generate solicitation' });
  }
};

const sendSolicitation = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE review_solicitations
      SET status = 'sent',
          sent_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Send solicitation error:', error);
    res.status(500).json({ error: 'Failed to send solicitation' });
  }
};

const exportCSV = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, customer_name, customer_email, product_service, channel, status, purchase_date, optimal_send_time FROM review_solicitations ORDER BY created_at DESC');
    const parser = new Parser({ fields: ['id', 'customer_name', 'customer_email', 'product_service', 'channel', 'status', 'purchase_date', 'optimal_send_time'] });
    const csv = parser.parse(result.rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="review_solicitations.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
};

const exportPDF = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM review_solicitations ORDER BY created_at DESC');
    generatePDF('Review Solicitations', [
      { key: 'id', label: 'ID' },
      { key: 'customer_name', label: 'Customer' },
      { key: 'product_service', label: 'Product' },
      { key: 'channel', label: 'Channel' },
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
    const result = await pool.query('DELETE FROM review_solicitations WHERE id = ANY($1) RETURNING id', [ids]);
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
    const allowed = ['status', 'channel'];

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
      `UPDATE review_solicitations SET ${setClauses.join(', ')} WHERE id = ANY($1) RETURNING *`,
      params
    );

    res.json({ message: `${result.rowCount} items updated`, data: result.rows });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Bulk update failed' });
  }
};

module.exports = {
  getAllReviewSolicitations,
  getReviewSolicitationById,
  createReviewSolicitation,
  updateReviewSolicitation,
  deleteReviewSolicitation,
  generateSolicitation,
  sendSolicitation,
  exportCSV,
  exportPDF,
  bulkDelete,
  bulkUpdate
};
