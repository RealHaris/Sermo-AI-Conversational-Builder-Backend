const express = require('express');
const StatsController = require('../controllers/StatsController');
const { auth } = require('../middlewares/auth');

const router = express.Router();

// Stats info: total orders, delivery, cancellation, SIM inventory, sales, most used types
router.get('/info', auth(), StatsController.getStatsInfo);

// Chart endpoints
router.get('/orders/status', auth(), StatsController.getOrdersByStatus);
router.get('/orders/status-city', auth(), StatsController.getOrdersByStatusAndCity);
router.get('/inventory/number-types', auth(), StatsController.getInventoryByNumberType);
router.get('/sims-sold/number-types', auth(), StatsController.getSIMsSoldByNumberType);
router.get('/sims-available/number-types', auth(), StatsController.getAvailableSIMsByNumberType);
router.get('/sims-sold/regions', auth(), StatsController.getSIMsSoldByRegion);
router.get('/sims-sold/cities', auth(), StatsController.getSIMsSoldByCity);
router.get('/sims-sold/last15days', auth(), StatsController.getSIMsSoldLast15Days);
router.get('/bundles-sold/last15days', auth(), StatsController.getBundlesSoldLast15Days);

module.exports = router; 
