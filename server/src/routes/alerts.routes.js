const express = require('express');
const router = express.Router();
const controller = require('../controllers/alerts.controller');

router.get('/', controller.getAlerts);
router.put('/:id/read', controller.markAsRead);
router.delete('/:id', controller.deleteAlert);

module.exports = router;
