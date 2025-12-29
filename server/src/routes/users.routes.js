const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');

const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware); // Apply to all routes in this router

router.get('/', usersController.listUsers);
router.post('/invite', usersController.inviteUser);
router.put('/:id', usersController.updateUser);
router.delete('/:id', usersController.deleteUser);

module.exports = router;
