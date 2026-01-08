const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');

const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

// Define routes explicitly matching the controller
router.get('/', reportsController.getAll);
router.post('/', reportsController.create);
router.put('/:id', reportsController.update); // for status and edit
router.delete('/:id', reportsController.delete);

// Notes
router.post('/:id/notes', reportsController.addNote);
router.get('/:id/notes', reportsController.getNotes);

// Images
router.post('/:id/images', reportsController.addImage);
router.get('/:id/images', reportsController.getImages);
router.delete('/:id/images/:imageId', reportsController.deleteImage);

module.exports = router;
