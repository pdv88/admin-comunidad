const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenance.controller');

// Admin Routes
router.post('/generate', maintenanceController.generateMonthlyFees);
router.get('/status', maintenanceController.getCommunityStatus);
router.put('/:feeId/pay', maintenanceController.markAsPaid);

// Resident Routes
router.get('/my-statement', maintenanceController.getMyStatement);

module.exports = router;
