const express = require('express');
const router = express.Router();
const communitiesController = require('../controllers/communities.controller');

const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/public-info', communitiesController.getPublicInfo);
router.get('/my', communitiesController.getMyCommunity);
router.put('/update', communitiesController.updateCommunity);
router.post('/create', communitiesController.createCommunity);
router.delete('/:id', communitiesController.deleteCommunity);


module.exports = router;
