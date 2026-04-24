const express = require('express');
const router = express.Router();
const trendAnalysisController = require('../controllers/trendAnalysisController');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { trendRules, paginationRules, bulkRules } = require('../middleware/validationRules');

router.get('/export/csv', authMiddleware, trendAnalysisController.exportCSV);
router.get('/export/pdf', authMiddleware, trendAnalysisController.exportPDF);
router.get('/', validate(paginationRules), trendAnalysisController.getAllTrendAnalyses);
router.get('/:id', trendAnalysisController.getTrendAnalysisById);
router.post('/bulk-delete', authMiddleware, authorize('admin', 'manager'), validate(bulkRules.delete), trendAnalysisController.bulkDelete);
router.put('/bulk-update', authMiddleware, authorize('admin', 'manager'), validate(bulkRules.update), trendAnalysisController.bulkUpdate);
router.post('/', authMiddleware, validate(trendRules.create), trendAnalysisController.createTrendAnalysis);
router.put('/:id', authMiddleware, trendAnalysisController.updateTrendAnalysis);
router.delete('/:id', authMiddleware, authorize('admin', 'manager'), trendAnalysisController.deleteTrendAnalysis);
router.post('/:id/analyze', authMiddleware, trendAnalysisController.runAnalysis);

module.exports = router;
