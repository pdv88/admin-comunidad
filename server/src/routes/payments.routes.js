const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/payments.controller');

router.post('/', paymentsController.createPayment);
router.get('/', paymentsController.getPayments);
router.put('/:id', paymentsController.updatePaymentStatus);
router.delete('/:id', paymentsController.deletePayment);
router.get('/campaigns', paymentsController.getCampaigns);
router.post('/campaigns', paymentsController.createCampaign);
router.put('/campaigns/:id', paymentsController.updateCampaign);
router.get('/stats', paymentsController.getStats);

module.exports = router;
