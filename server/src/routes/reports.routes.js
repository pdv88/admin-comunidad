const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');

const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

// Define routes explicitly matching the controller
router.get('/', reportsController.getAll);
router.post('/', reportsController.create);
router.put('/:id', reportsController.update); // for status updates
router.delete('/:id', reportsController.delete);

module.exports = router;
