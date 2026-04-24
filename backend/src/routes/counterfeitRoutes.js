const express = require('express');
const router = express.Router();
const counterfeitController = require('../controllers/counterfeitController');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { counterfeitRules, paginationRules, bulkRules } = require('../middleware/validationRules');

router.get('/export/csv', authMiddleware, counterfeitController.exportCSV);
router.get('/export/pdf', authMiddleware, counterfeitController.exportPDF);
router.get('/', validate(paginationRules), counterfeitController.getAllCounterfeitDetections);
router.get('/:id', counterfeitController.getCounterfeitDetectionById);
router.post('/bulk-delete', authMiddleware, authorize('admin', 'manager'), validate(bulkRules.delete), counterfeitController.bulkDelete);
router.put('/bulk-update', authMiddleware, authorize('admin', 'manager'), validate(bulkRules.update), counterfeitController.bulkUpdate);
router.post('/', authMiddleware, validate(counterfeitRules.create), counterfeitController.createCounterfeitDetection);
router.put('/:id', authMiddleware, counterfeitController.updateCounterfeitDetection);
router.delete('/:id', authMiddleware, authorize('admin', 'manager'), counterfeitController.deleteCounterfeitDetection);
router.post('/:id/analyze', authMiddleware, counterfeitController.analyzeCounterfeit);

module.exports = router;
