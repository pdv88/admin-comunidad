const express = require('express');
const router = express.Router();
const pollsController = require('../controllers/polls.controller');

router.get('/', pollsController.getAll);
router.post('/', pollsController.create);
router.post('/vote', pollsController.vote);

module.exports = router;
