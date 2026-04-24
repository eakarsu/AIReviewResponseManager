const express = require('express');
const router = express.Router();
const fakeReviewController = require('../controllers/fakeReviewController');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { fakeReviewRules, paginationRules, bulkRules } = require('../middleware/validationRules');

router.get('/export/csv', authMiddleware, fakeReviewController.exportCSV);
router.get('/export/pdf', authMiddleware, fakeReviewController.exportPDF);
router.get('/', validate(paginationRules), fakeReviewController.getAllFakeReviewDetections);
router.get('/:id', fakeReviewController.getFakeReviewDetectionById);
router.post('/bulk-delete', authMiddleware, authorize('admin', 'manager'), validate(bulkRules.delete), fakeReviewController.bulkDelete);
router.put('/bulk-update', authMiddleware, authorize('admin', 'manager'), validate(bulkRules.update), fakeReviewController.bulkUpdate);
router.post('/', authMiddleware, validate(fakeReviewRules.create), fakeReviewController.createFakeReviewDetection);
router.put('/:id', authMiddleware, fakeReviewController.updateFakeReviewDetection);
router.delete('/:id', authMiddleware, authorize('admin', 'manager'), fakeReviewController.deleteFakeReviewDetection);
router.post('/:id/analyze', authMiddleware, fakeReviewController.analyzeReview);

module.exports = router;
