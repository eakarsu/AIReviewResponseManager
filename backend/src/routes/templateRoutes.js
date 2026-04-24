const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { templateRules, paginationRules, bulkRules } = require('../middleware/validationRules');

router.use(authMiddleware);

router.get('/export/csv', templateController.exportCSV);
router.get('/export/pdf', templateController.exportPDF);
router.get('/', validate(paginationRules), templateController.getAllTemplates);
router.get('/:id', templateController.getTemplateById);
router.post('/bulk-delete', authorize('admin', 'manager'), validate(bulkRules.delete), templateController.bulkDelete);
router.put('/bulk-update', authorize('admin', 'manager'), validate(bulkRules.update), templateController.bulkUpdate);
router.post('/', validate(templateRules.create), templateController.createTemplate);
router.put('/:id', validate(templateRules.update), templateController.updateTemplate);
router.delete('/:id', authorize('admin', 'manager'), templateController.deleteTemplate);
router.post('/:id/use', templateController.incrementUseCount);

module.exports = router;
