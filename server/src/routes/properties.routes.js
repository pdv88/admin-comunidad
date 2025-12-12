const express = require('express');
const router = express.Router();
const propertiesController = require('../controllers/properties.controller');

router.get('/blocks', propertiesController.getAllBlocks);
router.post('/blocks', propertiesController.createBlock);
router.put('/blocks/:id', propertiesController.updateBlock); // New route for assigning rep
router.put('/units/:id', propertiesController.updateUnit);
router.post('/units', propertiesController.createUnit);
router.delete('/units/:id', propertiesController.deleteUnit); // Delete unit
router.post('/assign-unit', propertiesController.assignUnitToUser);
router.get('/users', propertiesController.getUsers); // Helper to get list of potential reps
router.delete('/blocks/:id', propertiesController.deleteBlock); // Delete block

module.exports = router;
