const express = require('express');
const router = express.Router();
const communitiesController = require('../controllers/communities.controller');

router.get('/my', communitiesController.getMyCommunity);
router.put('/update', communitiesController.updateCommunity);

module.exports = router;
