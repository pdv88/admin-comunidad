const express = require('express');
const router = express.Router();
const noticesController = require('../controllers/notices.controller');

// Define routes explicitly matching the controller
router.get('/', noticesController.getAll);
router.post('/', noticesController.create);
router.delete('/:id', noticesController.delete);

module.exports = router;
