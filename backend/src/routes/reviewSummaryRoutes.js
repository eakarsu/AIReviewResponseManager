const express = require('express');
const router = express.Router();
const reviewSummaryController = require('../controllers/reviewSummaryController');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { summaryRules, paginationRules, bulkRules } = require('../middleware/validationRules');

router.get('/export/csv', authMiddleware, reviewSummaryController.exportCSV);
router.get('/export/pdf', authMiddleware, reviewSummaryController.exportPDF);
router.get('/', validate(paginationRules), reviewSummaryController.getAllReviewSummaries);
router.get('/:id', reviewSummaryController.getReviewSummaryById);
router.post('/bulk-delete', authMiddleware, authorize('admin', 'manager'), validate(bulkRules.delete), reviewSummaryController.bulkDelete);
router.put('/bulk-update', authMiddleware, authorize('admin', 'manager'), validate(bulkRules.update), reviewSummaryController.bulkUpdate);
router.post('/', authMiddleware, validate(summaryRules.create), reviewSummaryController.createReviewSummary);
router.put('/:id', authMiddleware, reviewSummaryController.updateReviewSummary);
router.delete('/:id', authMiddleware, authorize('admin', 'manager'), reviewSummaryController.deleteReviewSummary);
router.post('/:id/analyze', authMiddleware, reviewSummaryController.generateSummary);

module.exports = router;
