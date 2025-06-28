const express = require('express');
const RegionController = require('../controllers/RegionController');
const RegionValidator = require('../validator/RegionValidator');
const { auth } = require('../middlewares/auth');

const router = express.Router();
const regionController = new RegionController();
const regionValidator = new RegionValidator();

// Create a new region (requires authentication)
router.post(
  '/',
  auth(),
  regionValidator.createRegionValidator,
  regionController.createRegion
);

// Get all regions
router.get('/', regionController.getRegions);

// Get all regions with their cities
router.get('/with-cities', regionController.getRegionsWithCities);

// Get a region by ID
router.get(
  '/:id',
  regionValidator.validateUUID,
  regionController.getRegionById
);

// Update a region (requires authentication)
router.patch(
  '/:id',
  auth(),
  regionValidator.validateUUID,
  regionValidator.updateRegionValidator,
  regionController.updateRegion
);

// Delete a region (requires authentication)
router.delete(
  '/:id',
  auth(),
  regionValidator.validateUUID,
  regionController.deleteRegion
);

module.exports = router; 
