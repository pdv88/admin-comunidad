const express = require('express');
const router = express.Router();
const visitorsController = require('../controllers/visitors.controller');

router.get('/', visitorsController.getAll);
router.post('/', visitorsController.create);
router.patch('/:id/status', visitorsController.updateStatus);
router.delete('/:id', visitorsController.delete);

module.exports = router;
