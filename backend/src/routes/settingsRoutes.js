const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const settingsController = require('../controllers/settingsController');

router.use(authMiddleware);

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);

module.exports = router;
