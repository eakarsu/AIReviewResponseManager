const express = require('express');
const router = express.Router();
const solicitorController = require('../controllers/solicitorController');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { solicitorRules, paginationRules, bulkRules } = require('../middleware/validationRules');
const pool = require('../config/database');

router.get('/export/csv', authMiddleware, solicitorController.exportCSV);
router.get('/export/pdf', authMiddleware, solicitorController.exportPDF);
router.get('/', validate(paginationRules), solicitorController.getAllReviewSolicitations);
router.get('/:id', solicitorController.getReviewSolicitationById);
router.post('/bulk-delete', authMiddleware, authorize('admin', 'manager'), validate(bulkRules.delete), solicitorController.bulkDelete);
router.put('/bulk-update', authMiddleware, authorize('admin', 'manager'), validate(bulkRules.update), solicitorController.bulkUpdate);
router.post('/', authMiddleware, validate(solicitorRules.create), solicitorController.createReviewSolicitation);
router.put('/:id', authMiddleware, solicitorController.updateReviewSolicitation);
router.delete('/:id', authMiddleware, authorize('admin', 'manager'), solicitorController.deleteReviewSolicitation);
router.post('/:id/analyze', authMiddleware, solicitorController.generateSolicitation);
router.post('/:id/send', authMiddleware, solicitorController.sendSolicitation);

/**
 * POST /api/solicitations/:id/schedule
 * Schedule a solicitation to be sent at a specific time
 */
router.post('/:id/schedule', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduled_at } = req.body;

    if (!scheduled_at) {
      return res.status(400).json({ error: 'scheduled_at is required (ISO 8601 datetime)' });
    }

    // Add scheduled_at column if it doesn't exist
    await pool.query(`
      ALTER TABLE review_solicitations
        ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS scheduled_status VARCHAR(50) DEFAULT 'pending'
    `).catch(() => {});

    const result = await pool.query(`
      UPDATE review_solicitations
      SET scheduled_at = $1, scheduled_status = 'scheduled', updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [scheduled_at, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitation not found' });
    }

    res.json({ message: 'Solicitation scheduled', solicitation: result.rows[0] });
  } catch (error) {
    console.error('Schedule solicitation error:', error);
    res.status(500).json({ error: 'Failed to schedule solicitation' });
  }
});

/**
 * POST /api/solicitations/process-scheduled
 * Process all due scheduled solicitations (cron job endpoint)
 */
router.post('/process-scheduled', authMiddleware, authorize('admin', 'manager'), async (req, res) => {
  try {
    await pool.query(`
      ALTER TABLE review_solicitations
        ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS scheduled_status VARCHAR(50) DEFAULT 'pending'
    `).catch(() => {});

    const dueRes = await pool.query(`
      SELECT * FROM review_solicitations
      WHERE scheduled_at <= NOW()
        AND scheduled_status = 'scheduled'
      ORDER BY scheduled_at ASC
      LIMIT 50
    `);

    const processed = [];
    const failed = [];

    for (const sol of dueRes.rows) {
      try {
        // Mark as processing
        await pool.query(
          `UPDATE review_solicitations SET scheduled_status = 'sent', updated_at = NOW() WHERE id = $1`,
          [sol.id]
        );
        processed.push(sol.id);
        // In production: trigger email send here via emailService
      } catch (err) {
        await pool.query(
          `UPDATE review_solicitations SET scheduled_status = 'failed', updated_at = NOW() WHERE id = $1`,
          [sol.id]
        );
        failed.push({ id: sol.id, error: err.message });
      }
    }

    res.json({
      message: `Processed ${processed.length} scheduled solicitations`,
      processed,
      failed,
      total_due: dueRes.rows.length
    });
  } catch (error) {
    console.error('Process scheduled solicitations error:', error);
    res.status(500).json({ error: 'Failed to process scheduled solicitations' });
  }
});

module.exports = router;
