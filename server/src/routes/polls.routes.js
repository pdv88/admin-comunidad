const express = require('express');
const router = express.Router();
const pollsController = require('../controllers/polls.controller');

const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', pollsController.getAll);
router.post('/', pollsController.create);
router.post('/vote', pollsController.vote);
router.delete('/:id', pollsController.deletePoll);
router.put('/:id', pollsController.update);

module.exports = router;
