const express = require('express');
const EventStatusMappingController = require('../controllers/EventStatusMappingController');
const EventStatusMappingValidator = require('../validator/EventStatusMappingValidator');
const { auth } = require('../middlewares/auth');

const router = express.Router();
const eventStatusMappingController = new EventStatusMappingController();
const eventStatusMappingValidator = new EventStatusMappingValidator();

// Get all event mappings
router.get(
  '/',
  auth(),
  eventStatusMappingController.getAllEventMappings
);

// Get all statuses for a specific event
router.get(
  '/:event',
  auth(),
  eventStatusMappingValidator.validateEvent,
  eventStatusMappingController.getStatusesByEvent
);

// Update mappings for an event (bulk update)
router.post(
  '/:event',
  auth(),
  eventStatusMappingValidator.validateEvent,
  eventStatusMappingValidator.validateBulkUpdate,
  eventStatusMappingController.updateEventMappings
);

module.exports = router; 
