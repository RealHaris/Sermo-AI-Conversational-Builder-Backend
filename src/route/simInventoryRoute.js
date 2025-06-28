const express = require('express');
const SimInventoryController = require('../controllers/SimInventoryController');
const SimInventoryValidator = require('../validator/SimInventoryValidator');
const { auth, externalAuth } = require('../middlewares/auth');
const { prepareDataAccessFilters } = require('../middlewares/validateRequest');

const router = express.Router();
const simInventoryController = new SimInventoryController();
const simInventoryValidator = new SimInventoryValidator();

// External API endpoint - Get available SIMs by city ID and number type
router.get(
  '/external/available',
  externalAuth(),
  simInventoryValidator.validateExternalAvailableSimsRequest,
  simInventoryController.getAvailableSimsByFilter
);

// Create multiple sim inventory items (requires authentication)
router.post(
  '/bulk',
  auth(),
  simInventoryValidator.createBulkSimInventoryValidator,
  simInventoryController.createBulkSimInventory
);

// Bulk delete sim inventory items (requires authentication)
router.delete(
  '/bulk',
  auth(),
  simInventoryValidator.bulkDeleteValidator,
  simInventoryController.bulkDeleteSimInventory
);

// Get all sim inventory items by number type slug (using query parameters)
router.get(
  '/number-type',
  simInventoryValidator.validateNumberTypeQuery,
  simInventoryController.getSimInventoriesByNumberType
);

// Create a new sim inventory item (requires authentication)
router.post(
  '/',
  auth(),
  simInventoryValidator.createSimInventoryValidator,
  simInventoryController.createSimInventory
);

// Get all sim inventory items with pagination
router.get(
  '/',
  auth(),
  prepareDataAccessFilters(),
  simInventoryValidator.validatePagination,
  simInventoryController.getSimInventories
);

// Get a sim inventory item by ID
router.get(
  '/:id',
  auth(),
  simInventoryValidator.validateUUID,
  simInventoryController.getSimInventoryById
);

// Update a sim inventory item (requires authentication)
router.put(
  '/:id',
  auth(),
  simInventoryValidator.validateUUID,
  simInventoryValidator.updateSimInventoryValidator,
  simInventoryController.updateSimInventory
);

// Change status of a sim inventory item (requires authentication)
router.patch(
  '/:id/status',
  auth(),
  simInventoryValidator.validateUUID,
  simInventoryValidator.changeStatusValidator,
  simInventoryController.changeSimInventoryStatus
);

// Change city of a sim inventory item (requires authentication)
router.patch(
  '/:id/city',
  auth(),
  simInventoryValidator.validateUUID,
  simInventoryValidator.changeCityValidator,
  simInventoryController.changeSimInventoryCity
);

// Delete a sim inventory item (requires authentication)
router.delete(
  '/:id',
  auth(),
  simInventoryValidator.validateUUID,
  simInventoryController.deleteSimInventory
);

module.exports = router; 
