const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenance.controller');

// Admin Routes
router.post('/generate', maintenanceController.generateMonthlyFees);
router.get('/status', maintenanceController.getCommunityStatus);
router.put('/:feeId/pay', maintenanceController.markAsPaid);
router.delete('/:feeId', maintenanceController.deleteFee);

// Resident Routes
router.get('/my-statement', maintenanceController.getMyStatement);

router.post('/:feeId/email', maintenanceController.resendFeeEmail);

module.exports = router;
