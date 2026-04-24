const express = require('express');
const router = express.Router();
const solicitorController = require('../controllers/solicitorController');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { solicitorRules, paginationRules, bulkRules } = require('../middleware/validationRules');

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

module.exports = router;
