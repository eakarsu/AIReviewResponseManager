const express = require('express');
const router = express.Router();
const solicitorController = require('../controllers/solicitorController');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { solicitorRules, paginationRules, bulkRules } = require('../middleware/validationRules');
const pool = require('../config/database');

const OWNED_BUSINESS_FILTER = 'business_id IN (SELECT id FROM businesses WHERE user_id = $1)';

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

    const result = await pool.query(`
      UPDATE review_solicitations
      SET scheduled_at = $1, scheduled_status = 'scheduled', updated_at = NOW()
      WHERE id = $2 AND business_id IN (SELECT id FROM businesses WHERE user_id = $3)
      RETURNING *
    `, [scheduled_at, id, req.userId]);

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
 * Process all due scheduled solicitations (cron job endpoint).
 * Rows only move out of the queue when the provider accepts the message.
 */
router.post('/process-scheduled', authMiddleware, authorize('admin', 'manager'), async (req, res) => {
  try {
    const dueRes = await pool.query(`
      SELECT * FROM review_solicitations
      WHERE scheduled_at <= NOW()
        AND scheduled_status = 'scheduled'
        AND ${OWNED_BUSINESS_FILTER}
      ORDER BY scheduled_at ASC
      LIMIT 50
    `, [req.userId]);

    const processed = [];
    const failed = [];

    for (const solicitation of dueRes.rows) {
      try {
        const delivery = await solicitorController.deliverSolicitation(solicitation);
        if (!delivery.success) {
          // Keep the row queued so a later run can retry; report the failure.
          failed.push({ id: solicitation.id, error: delivery.error, code: delivery.code });
          continue;
        }
        await pool.query(
          `UPDATE review_solicitations
           SET status = 'sent', sent_at = NOW(), scheduled_status = 'sent', updated_at = NOW()
           WHERE id = $1`,
          [solicitation.id]
        );
        processed.push(solicitation.id);
      } catch (err) {
        await pool.query(
          `UPDATE review_solicitations SET scheduled_status = 'failed', updated_at = NOW() WHERE id = $1`,
          [solicitation.id]
        );
        failed.push({ id: solicitation.id, error: err.message });
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
