const createRoutes = require('./factory.routes');
const reportsController = require('../controllers/reports.controller');

module.exports = createRoutes(reportsController);
