const express = require('express');
const router = express.Router();
const draftController = require('../controllers/draftController');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { draftRules, paginationRules, bulkRules } = require('../middleware/validationRules');
const { createProviderGate } = require('../governance/providerGate');
const legacyProviderGate = createProviderGate(['/']);

router.use(authMiddleware);

router.get('/export/csv', draftController.exportCSV);
router.get('/export/pdf', draftController.exportPDF);
router.get('/', validate(paginationRules), draftController.getAllDrafts);
router.get('/:id', draftController.getDraftById);
router.post('/bulk-delete', authorize('admin', 'manager'), validate(bulkRules.delete), draftController.bulkDelete);
router.put('/bulk-update', authorize('admin', 'manager'), validate(bulkRules.update), draftController.bulkUpdate);
router.post('/', validate(draftRules.create), draftController.createDraft);
router.put('/:id', validate(draftRules.update), draftController.updateDraft);
router.delete('/:id', authorize('admin', 'manager'), draftController.deleteDraft);
router.post('/:id/approve', draftController.approveDraft);
router.post('/:id/send', legacyProviderGate, draftController.sendDraft);

module.exports = router;
