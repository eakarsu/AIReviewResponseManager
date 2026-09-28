const express = require('express');
const PDFDocument = require('pdfkit');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All endpoints require auth
router.use(authMiddleware);

// ============================================================
// 1) VIZ: Review Volume Timeline
//    GET /api/custom-views/volume-timeline?business_id=&days=30
// ============================================================
router.get('/volume-timeline', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 30, 365);
    const businessId = req.query.business_id ? parseInt(req.query.business_id, 10) : null;

    const params = [days, req.userId];
    let where = `WHERE r.review_date >= NOW() - ($1 || ' days')::interval AND b.user_id = $2`;
    if (businessId) {
      where += ` AND r.business_id = $3`;
      params.push(businessId);
    }
    const q = `
      SELECT DATE(r.review_date) AS day,
             COUNT(*)::int AS count,
             COALESCE(AVG(r.rating),0)::float AS avg_rating
      FROM reviews r
      JOIN businesses b ON r.business_id = b.id
      ${where}
      GROUP BY DATE(r.review_date)
      ORDER BY day ASC
    `;
    const r = await pool.query(q, params);
    const timeline = r.rows.map(row => ({
      day: row.day,
      count: row.count,
      avg_rating: Number((row.avg_rating || 0).toFixed(2)),
    }));
    const total = timeline.reduce((s, row) => s + row.count, 0);
    const ratingWeighted = timeline.reduce((s, row) => s + row.avg_rating * row.count, 0);
    const avgRating = total > 0 ? Number((ratingWeighted / total).toFixed(2)) : 0;
    const peakDay = timeline.reduce((max, row) => (row.count > (max?.count || 0) ? row : max), null);

    res.json({
      success: true,
      days,
      business_id: businessId,
      summary: {
        total_reviews: total,
        average_rating: avgRating,
        peak_day: peakDay?.day || null,
        peak_count: peakDay?.count || 0,
      },
      timeline,
    });
  } catch (err) {
    console.error('volume-timeline error:', err);
    res.status(500).json({ success: false, error: 'Failed to load timeline' });
  }
});

// ============================================================
// 2) VIZ: Sentiment Heatmap (platform x rating)
//    GET /api/custom-views/sentiment-heatmap?business_id=
// ============================================================
router.get('/sentiment-heatmap', async (req, res) => {
  try {
    const businessId = req.query.business_id ? parseInt(req.query.business_id, 10) : null;

    const platforms = ['google', 'yelp', 'tripadvisor', 'facebook'];
    const ratings = [1, 2, 3, 4, 5];
    const matrix = {};
    let totalCells = 0;

    const params = [req.userId];
    let where = `WHERE b.user_id = $1`;
    if (businessId) {
      where += ` AND r.business_id = $2`;
      params.push(businessId);
    }
    const q = `
      SELECT LOWER(r.platform) AS platform, r.rating, COUNT(*)::int AS cnt
      FROM reviews r
      JOIN businesses b ON r.business_id = b.id
      ${where}
      GROUP BY LOWER(r.platform), r.rating
    `;
    const r = await pool.query(q, params);

    platforms.forEach(p => {
      matrix[p] = {};
      ratings.forEach(rt => { matrix[p][rt] = 0; });
    });
    r.rows.forEach(row => {
      const p = row.platform || 'unknown';
      if (!matrix[p]) {
        matrix[p] = {};
        ratings.forEach(rt => { matrix[p][rt] = 0; });
      }
      matrix[p][row.rating] = row.cnt;
      totalCells += row.cnt;
    });

    // Compute sentiment buckets per platform
    const sentimentByPlatform = {};
    Object.keys(matrix).forEach(p => {
      const negative = (matrix[p][1] || 0) + (matrix[p][2] || 0);
      const neutral = matrix[p][3] || 0;
      const positive = (matrix[p][4] || 0) + (matrix[p][5] || 0);
      sentimentByPlatform[p] = { negative, neutral, positive };
    });

    res.json({
      success: true,
      business_id: businessId,
      platforms: Object.keys(matrix),
      ratings,
      matrix,
      sentiment_by_platform: sentimentByPlatform,
      total_reviews: totalCells,
    });
  } catch (err) {
    console.error('sentiment-heatmap error:', err);
    res.status(500).json({ success: false, error: 'Failed to load heatmap' });
  }
});

// ============================================================
// 3) NON-VIZ: Response Template Library PDF
//    GET /api/custom-views/template-library/pdf?category=
// ============================================================
router.get('/template-library/pdf', async (req, res) => {
  try {
    const category = req.query.category || null;

    const params = [req.userId];
    let where = 'WHERE is_active = TRUE AND user_id = $1';
    if (category) {
      params.push(category);
      where += ` AND category = $${params.length}`;
    }
    const q = `
      SELECT id, name, category, content, tone, use_count
      FROM templates
      ${where}
      ORDER BY category, name
    `;
    const r = await pool.query(q, params);
    const templates = r.rows;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="response-template-library.pdf"');

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    doc.fontSize(22).fillColor('#1e40af').text('Response Template Library', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#6b7280').text(
      `Generated ${new Date().toISOString().slice(0, 10)}  |  ${templates.length} templates` +
      (category ? `  |  Category: ${category}` : ''),
      { align: 'center' }
    );
    doc.moveDown(1.2);

    if (templates.length === 0) {
      doc.fontSize(12).fillColor('#000').text('No templates available.');
    }

    templates.forEach((t, idx) => {
      doc.fontSize(13).fillColor('#111827').text(`${idx + 1}. ${t.name}`, { continued: false });
      doc.fontSize(9).fillColor('#6b7280').text(
        `Category: ${t.category || '-'}   Tone: ${t.tone || '-'}   Used: ${t.use_count || 0}x`
      );
      doc.moveDown(0.2);
      doc.fontSize(11).fillColor('#374151').text(t.content || '', {
        indent: 16,
        align: 'left',
      });
      doc.moveDown(0.8);
    });

    doc.end();
  } catch (err) {
    console.error('template-library/pdf error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Failed to generate PDF' });
    }
  }
});

module.exports = router;
