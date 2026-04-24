const express = require('express');
const router = express.Router();
const competitorController = require('../controllers/competitorController');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { competitorRules, paginationRules, bulkRules } = require('../middleware/validationRules');

router.get('/export/csv', authMiddleware, competitorController.exportCSV);
router.get('/export/pdf', authMiddleware, competitorController.exportPDF);
router.get('/', validate(paginationRules), competitorController.getAllCompetitorMonitors);
router.get('/:id', competitorController.getCompetitorMonitorById);
router.post('/bulk-delete', authMiddleware, authorize('admin', 'manager'), validate(bulkRules.delete), competitorController.bulkDelete);
router.put('/bulk-update', authMiddleware, authorize('admin', 'manager'), validate(bulkRules.update), competitorController.bulkUpdate);
router.post('/', authMiddleware, validate(competitorRules.create), competitorController.createCompetitorMonitor);
router.put('/:id', authMiddleware, competitorController.updateCompetitorMonitor);
router.delete('/:id', authMiddleware, authorize('admin', 'manager'), competitorController.deleteCompetitorMonitor);
router.post('/:id/analyze', authMiddleware, competitorController.analyzeCompetitor);

module.exports = router;
