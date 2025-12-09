const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');

router.get('/', usersController.listUsers);
router.post('/invite', usersController.inviteUser);
router.put('/:id', usersController.updateUser);

module.exports = router;
