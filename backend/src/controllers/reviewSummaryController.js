const pool = require('../config/database');
const aiService = require('../services/aiService');
const { parsePagination, buildPaginationResponse, buildSortClause } = require('../middleware/pagination');
const { Parser } = require('json2csv');
const { generatePDF } = require('../services/pdfService');

const getAllReviewSummaries = async (req, res) => {
  try {
    const { product_category, search, sort_by, sort_order } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    let whereClause = ' WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (product_category) {
      paramCount++;
      whereClause += ` AND product_category = $${paramCount}`;
      params.push(product_category);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (product_name ILIKE $${paramCount} OR summary_text ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const orderClause = buildSortClause(sort_by, sort_order, ['created_at', 'average_rating', 'total_reviews', 'product_name']);

    const countResult = await pool.query(`SELECT COUNT(*) FROM review_summaries${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    const result = await pool.query(
      `SELECT * FROM review_summaries${whereClause} ORDER BY ${orderClause} LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    res.json(buildPaginationResponse(result.rows, total, page, limit));
  } catch (error) {
    console.error('Get review summaries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getReviewSummaryById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM review_summaries WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get review summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createReviewSummary = async (req, res) => {
  try {
    const { product_name, product_category, total_reviews, average_rating } = req.body;

    const result = await pool.query(`
      INSERT INTO review_summaries (product_name, product_category, total_reviews, average_rating)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [product_name, product_category, total_reviews, average_rating]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create review summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateReviewSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const { product_name, product_category, total_reviews, average_rating, summary_text, pros, cons, common_themes, sentiment_breakdown, ai_insights } = req.body;

    const result = await pool.query(`
      UPDATE review_summaries
      SET product_name = COALESCE($1, product_name),
          product_category = COALESCE($2, product_category),
          total_reviews = COALESCE($3, total_reviews),
          average_rating = COALESCE($4, average_rating),
          summary_text = COALESCE($5, summary_text),
          pros = COALESCE($6, pros),
          cons = COALESCE($7, cons),
          common_themes = COALESCE($8, common_themes),
          sentiment_breakdown = COALESCE($9, sentiment_breakdown),
          ai_insights = COALESCE($10, ai_insights),
          last_updated = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [product_name, product_category, total_reviews, average_rating, summary_text, pros, cons, common_themes, sentiment_breakdown, ai_insights, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update review summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteReviewSummary = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM review_summaries WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    res.json({ message: 'Summary deleted successfully' });
  } catch (error) {
    console.error('Delete review summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const generateSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviews } = req.body; // Array of { rating, text }

    const summaryResult = await pool.query(
      'SELECT * FROM review_summaries WHERE id = $1',
      [id]
    );

    if (summaryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    const summary = summaryResult.rows[0];

    // Use provided reviews or generate realistic sample data
    const reviewsToAnalyze = reviews || [
      { rating: 5, text: `Absolutely love this ${summary.product_name}! The build quality is outstanding and it exceeded all my expectations. Setup was a breeze and it works perfectly right out of the box. Customer support was also very responsive when I had a question. Would definitely buy again.` },
      { rating: 4, text: `Really solid ${summary.product_name}. Great value for the price point. The design is sleek and modern. Only minor complaint is that the instructions could be clearer, but once you figure it out, everything works great. Shipping was fast too.` },
      { rating: 5, text: `Best purchase I've made this year. The ${summary.product_name} delivers exactly what's promised. Performance is top-notch and I've been using it daily for two weeks now with zero issues. Highly recommend to anyone considering it.` },
      { rating: 3, text: `It's decent for the price but nothing extraordinary. The ${summary.product_name} does what it's supposed to do but feels a bit cheap compared to premium alternatives. Battery life could be better and it takes a while to charge. Okay for casual use.` },
      { rating: 2, text: `Somewhat disappointed with this ${summary.product_name}. The product arrived with minor cosmetic damage and the performance is inconsistent. Some features advertised don't work as expected. Customer service was slow to respond. Might return it.` },
      { rating: 4, text: `Good product overall. The ${summary.product_name} has a nice design and feels premium. Features work well for the most part. I wish it had better compatibility with other devices, but for the price, it's a solid choice. My family loves it.` },
      { rating: 1, text: `Very unhappy with this purchase. The ${summary.product_name} stopped working after just one week. Build quality feels flimsy and the packaging was poor. Tried contacting support but still waiting for a response. Would not recommend.` },
      { rating: 5, text: `This ${summary.product_name} is a game changer! Incredible quality, intuitive to use, and the results are amazing. I've recommended it to all my friends and colleagues. The company clearly put a lot of thought into the design and functionality.` },
      { rating: 4, text: `Very happy with my ${summary.product_name}. It arrived on time and was well packaged. Performance is reliable and consistent. The only thing I'd improve is adding more color options. Great product at a fair price.` },
      { rating: 3, text: `Mixed feelings about the ${summary.product_name}. On one hand, the core functionality works fine. On the other hand, the software/app experience needs improvement and there are occasional glitches. It's average but has potential if they push updates.` }
    ];

    const analysis = await aiService.summarizeReviews(summary.product_name, reviewsToAnalyze);

    const updateResult = await pool.query(`
      UPDATE review_summaries
      SET summary_text = $1,
          pros = $2,
          cons = $3,
          common_themes = $4,
          sentiment_breakdown = $5,
          ai_insights = $6,
          total_reviews = $7,
          last_updated = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [
      analysis.summary,
      analysis.pros,
      analysis.cons,
      analysis.common_themes,
      analysis.sentiment_breakdown,
      analysis.insights,
      reviewsToAnalyze.length,
      id
    ]);

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Generate summary error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
};

const exportCSV = async (req, res) => {
  try {
    const { product_category, search } = req.query;

    let whereClause = ' WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (product_category) {
      paramCount++;
      whereClause += ` AND product_category = $${paramCount}`;
      params.push(product_category);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (product_name ILIKE $${paramCount} OR summary_text ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const result = await pool.query(
      `SELECT * FROM review_summaries${whereClause} ORDER BY created_at DESC`,
      params
    );

    const fields = ['id', 'product_name', 'product_category', 'total_reviews', 'average_rating', 'summary_text'];
    const parser = new Parser({ fields });
    const csv = parser.parse(result.rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="review_summaries.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
};

const exportPDF = async (req, res) => {
  try {
    const { product_category, search } = req.query;

    let whereClause = ' WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (product_category) {
      paramCount++;
      whereClause += ` AND product_category = $${paramCount}`;
      params.push(product_category);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (product_name ILIKE $${paramCount} OR summary_text ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const result = await pool.query(
      `SELECT * FROM review_summaries${whereClause} ORDER BY created_at DESC`,
      params
    );

    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'product_name', label: 'Product' },
      { key: 'product_category', label: 'Category' },
      { key: 'average_rating', label: 'Rating' },
      { key: 'total_reviews', label: 'Reviews' }
    ];

    generatePDF('Review Summaries', columns, result.rows, res);
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
      'DELETE FROM review_summaries WHERE id = ANY($1) RETURNING id',
      [ids]
    );

    res.json({ message: `${result.rowCount} summary(ies) deleted successfully`, deleted: result.rows.map(r => r.id) });
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

    const allowedColumns = ['product_category'];
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
      `UPDATE review_summaries SET ${setClauses.join(', ')} WHERE id = ANY($1) RETURNING *`,
      params
    );

    res.json({ message: `${result.rowCount} summary(ies) updated successfully`, data: result.rows });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Failed to bulk update' });
  }
};

module.exports = {
  getAllReviewSummaries,
  getReviewSummaryById,
  createReviewSummary,
  updateReviewSummary,
  deleteReviewSummary,
  generateSummary,
  exportCSV,
  exportPDF,
  bulkDelete,
  bulkUpdate
};
