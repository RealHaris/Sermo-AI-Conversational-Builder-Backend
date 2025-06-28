const express = require('express');
const NumberTypeController = require('../controllers/NumberTypeController');
const NumberTypeValidator = require('../validator/NumberTypeValidator');
const { auth, externalAuth } = require('../middlewares/auth');

const router = express.Router();
const numberTypeController = new NumberTypeController();
const numberTypeValidator = new NumberTypeValidator();

// External API endpoint - Get available number types by city ID
router.get(
  '/external/available/:cityId',
  externalAuth(),
  numberTypeController.getAvailableNumberTypesByCityId
);

// Get a number type by slug
router.get(
  '/slug/:slug',
  numberTypeValidator.validateSlug,
  numberTypeController.getNumberTypeBySlug
);

// Create a new number type (requires authentication)
router.post(
  '/',
  auth(),
  numberTypeValidator.createNumberTypeValidator,
  numberTypeController.createNumberType
);

// Get all number types
router.get('/', numberTypeController.getNumberTypes);

// Get a number type by ID
router.get(
  '/:id',
  numberTypeValidator.validateUUID,
  numberTypeController.getNumberTypeById
);

// Update a number type (requires authentication)
router.put(
  '/:id',
  auth(),
  numberTypeValidator.validateUUID,
  numberTypeValidator.updateNumberTypeValidator,
  numberTypeController.updateNumberType
);

// Delete a number type (requires authentication)
router.delete(
  '/:id',
  auth(),
  numberTypeValidator.validateUUID,
  numberTypeController.deleteNumberType
);

module.exports = router; 
