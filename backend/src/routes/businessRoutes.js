const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { businessRules, paginationRules, bulkRules } = require('../middleware/validationRules');

router.use(authMiddleware);

router.get('/export/csv', businessController.exportCSV);
router.get('/export/pdf', businessController.exportPDF);
router.get('/', validate(paginationRules), businessController.getAllBusinesses);
router.get('/:id', businessController.getBusinessById);
router.post('/bulk-delete', authorize('admin', 'manager'), validate(bulkRules.delete), businessController.bulkDelete);
router.put('/bulk-update', authorize('admin', 'manager'), validate(bulkRules.update), businessController.bulkUpdate);
router.post('/', validate(businessRules.create), businessController.createBusiness);
router.put('/:id', validate(businessRules.update), businessController.updateBusiness);
router.delete('/:id', authorize('admin', 'manager'), businessController.deleteBusiness);

module.exports = router;
