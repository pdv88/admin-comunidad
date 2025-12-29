const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/payments.controller');

const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.post('/', paymentsController.createPayment);
router.get('/', paymentsController.getPayments);
router.put('/:id', paymentsController.updatePaymentStatus);
router.delete('/:id', paymentsController.deletePayment);
router.get('/campaigns', paymentsController.getCampaigns);
router.post('/campaigns', paymentsController.createCampaign);
router.put('/campaigns/:id', paymentsController.updateCampaign);
router.get('/campaigns/:id', paymentsController.getCampaignById);
router.get('/stats', paymentsController.getStats);
router.get('/:id', paymentsController.getPaymentById);

module.exports = router;
