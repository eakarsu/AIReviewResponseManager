const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { reviewRules, paginationRules, bulkRules } = require('../middleware/validationRules');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { createProviderGate } = require('../governance/providerGate');
const legacyProviderGate = createProviderGate(['/']);

router.get('/stats', reviewController.getReviewStats);
router.get('/export/csv', authMiddleware, reviewController.exportCSV);
router.get('/export/pdf', authMiddleware, reviewController.exportPDF);
router.get('/', validate(paginationRules), reviewController.getAllReviews);
router.get('/:id', reviewController.getReviewById);
router.post('/bulk-delete', authMiddleware, authorize('admin', 'manager'), validate(bulkRules.delete), reviewController.bulkDelete);
router.put('/bulk-update', authMiddleware, authorize('admin', 'manager'), validate(bulkRules.update), reviewController.bulkUpdate);
router.post('/', authMiddleware, legacyProviderGate, validate(reviewRules.create), reviewController.createReview);
router.put('/:id', authMiddleware, validate(reviewRules.update), reviewController.updateReview);
router.delete('/:id', authMiddleware, authorize('admin', 'manager'), reviewController.deleteReview);
router.post('/:id/generate-response', authMiddleware, legacyProviderGate, aiRateLimiter, reviewController.generateAIResponse);

module.exports = router;
