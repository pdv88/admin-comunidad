const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenance.controller');

const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

// Admin Routes
router.post('/generate', maintenanceController.generateMonthlyFees);
router.get('/stats', maintenanceController.getFinancialStats);
router.get('/status', maintenanceController.getCommunityStatus);

// Bulk Actions (before parameterized routes)
router.delete('/bulk', maintenanceController.bulkDeleteFees);
router.put('/bulk/pay', maintenanceController.bulkMarkAsPaid);

// Single Fee Actions
router.put('/:feeId/pay', maintenanceController.markAsPaid);
router.put('/:feeId/revert', maintenanceController.revertToPending);
router.delete('/:feeId', maintenanceController.deleteFee);

// Resident Routes
router.get('/balance', maintenanceController.getBalance);
router.get('/my-statement', maintenanceController.getMyStatement);

router.post('/:feeId/email', maintenanceController.resendFeeEmail);

module.exports = router;
