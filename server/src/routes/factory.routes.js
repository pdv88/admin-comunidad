const express = require('express');
const router = express.Router();

const createRoutes = (controller) => {
    router.get('/', controller.getAll);
    router.post('/', controller.create);
    router.get('/:id', controller.getById);
    return router;
};

module.exports = createRoutes;
