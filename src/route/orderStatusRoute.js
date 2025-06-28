const express = require('express');
const OrderStatusController = require('../controllers/OrderStatusController');
const OrderStatusValidator = require('../validator/OrderStatusValidator');
const { auth, externalAuth } = require('../middlewares/auth');

const router = express.Router();
const orderStatusController = new OrderStatusController();
const orderStatusValidator = new OrderStatusValidator();

// Create a new order status (requires authentication)
router.post(
  '/',
  auth(),
  orderStatusValidator.createOrderStatusValidator,
  orderStatusController.createOrderStatus
);

// Get all order statuses
router.get('/',
  auth(),
  orderStatusController.getOrderStatuses);

// External API endpoint - Get all order statuses
router.get(
  '/external',
  externalAuth(),
  orderStatusController.getOrderStatuses
);

// Get an order status by event
router.get(
  '/event/:event',
  auth(),
  orderStatusController.getOrderStatusByEvent
);

// External API - Get an order status by event
router.get(
  '/external/event/:event',
  externalAuth(),
  orderStatusController.getOrderStatusByEvent
);

// Get an order status by ID
router.get(
  '/:id',
  auth(),
  orderStatusValidator.validateUUID,
  orderStatusController.getOrderStatusById
);

// Update an order status (requires authentication)
router.patch(
  '/:id',
  auth(),
  orderStatusValidator.validateUUID,
  orderStatusValidator.updateOrderStatusValidator,
  orderStatusController.updateOrderStatus
);

// Update event mapping for an order status
router.patch(
  '/:id/event',
  auth(),
  orderStatusValidator.validateUUID,
  orderStatusValidator.updateEventMappingValidator,
  orderStatusController.updateEventMapping
);

// Delete an order status (requires authentication)
router.delete(
  '/:id',
  auth(),
  orderStatusValidator.validateUUID,
  orderStatusController.deleteOrderStatus
);

module.exports = router; 
