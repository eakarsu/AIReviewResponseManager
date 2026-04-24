const express = require('express');
const router = express.Router();
const personalizerController = require('../controllers/personalizerController');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { personalizerRules, paginationRules, bulkRules } = require('../middleware/validationRules');

router.get('/export/csv', authMiddleware, personalizerController.exportCSV);
router.get('/export/pdf', authMiddleware, personalizerController.exportPDF);
router.get('/', validate(paginationRules), personalizerController.getAllPersonalizedResponses);
router.get('/:id', personalizerController.getPersonalizedResponseById);
router.post('/bulk-delete', authMiddleware, authorize('admin', 'manager'), validate(bulkRules.delete), personalizerController.bulkDelete);
router.put('/bulk-update', authMiddleware, authorize('admin', 'manager'), validate(bulkRules.update), personalizerController.bulkUpdate);
router.post('/', authMiddleware, validate(personalizerRules.create), personalizerController.createPersonalizedResponse);
router.put('/:id', authMiddleware, personalizerController.updatePersonalizedResponse);
router.delete('/:id', authMiddleware, authorize('admin', 'manager'), personalizerController.deletePersonalizedResponse);
router.post('/:id/analyze', authMiddleware, personalizerController.generatePersonalizedResponse);

module.exports = router;
