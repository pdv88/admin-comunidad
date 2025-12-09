const createRoutes = require('./factory.routes');
const noticesController = require('../controllers/notices.controller');

module.exports = createRoutes(noticesController);
