const express = require('express');
const router = express.Router();
const amenitiesController = require('../controllers/amenities.controller');

// Amenities Management
router.get('/', amenitiesController.getAmenities);
router.post('/', amenitiesController.createAmenity);
router.put('/:id', amenitiesController.updateAmenity);
router.delete('/:id', amenitiesController.deleteAmenity);

// Reservations
router.get('/reservations', amenitiesController.getReservations);
router.post('/reservations', amenitiesController.createReservation);
router.put('/reservations/:id', amenitiesController.updateReservationStatus);

module.exports = router;
