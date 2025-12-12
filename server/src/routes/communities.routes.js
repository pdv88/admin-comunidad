const express = require('express');
const router = express.Router();
const communitiesController = require('../controllers/communities.controller');

router.get('/my', communitiesController.getMyCommunity);
router.put('/my', communitiesController.updateCommunity);

module.exports = router;
