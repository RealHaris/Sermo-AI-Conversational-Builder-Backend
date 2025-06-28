const express = require('express');
const SalesOrderValidator = require('../validator/SalesOrderValidator');
const SalesOrderController = require('../controllers/SalesOrderController');
const { auth, externalAuth } = require('../middlewares/auth');
const { prepareDataAccessFilters } = require('../middlewares/validateRequest');

const router = express.Router();
const salesOrderController = new SalesOrderController();
const salesOrderValidator = new SalesOrderValidator();

// External API endpoint - Create an order
router.post(
  '/external/create',
  externalAuth(),
  salesOrderValidator.createExternalOrderValidator,
  salesOrderController.createExternalOrder
);

// External API - Update order status
router.patch('/external/:uuid/status', externalAuth(), salesOrderValidator.updateOrderStatusValidator, salesOrderController.updateOrderStatus);

// External API - Update transaction details (by UUID in path)
router.patch(
  '/external/:uuid/transaction',
  externalAuth(),
  salesOrderValidator.updateTransactionValidator,
  salesOrderController.updateTransaction
);

// NEW: External API - Update transaction details (by orderId or UUID in query params)
router.post(
  '/external/transaction',
  externalAuth(),
  salesOrderValidator.updateTransactionByIdentifierValidator,
  salesOrderController.updateTransactionByIdentifier
);

// External API - Update payment status
router.patch(
  '/external/:uuid/payment-status',
  externalAuth(),
  salesOrderValidator.updatePaymentStatusValidator,
  salesOrderController.updatePaymentStatus
);

// Get sales order status info by orderId
router.get(
  '/external/:orderId/status-info',
  externalAuth(),
  salesOrderValidator.getSalesOrderByOrderIdValidator,
  salesOrderController.getSalesOrderStatusInfo
);

// Create a sales order
router.post('/', auth(), salesOrderValidator.createSalesOrderValidator, salesOrderController.createSalesOrder);

// Get sales orders with pagination and search
router.get('/', auth(), prepareDataAccessFilters(), salesOrderValidator.getSalesOrdersValidator, salesOrderController.getSalesOrders);

// Get all sales orders without pagination
router.get('/all', auth(), prepareDataAccessFilters(), salesOrderController.getAllSalesOrders);

// Export all sales orders to CSV
router.get('/export-csv', auth(), salesOrderController.exportSalesOrdersToCSV);

// Operations by UUID
router.get('/:uuid', auth(), salesOrderValidator.getSalesOrderValidator, salesOrderController.getSalesOrderByUuid);
router.delete('/:uuid', auth(), salesOrderValidator.deleteSalesOrderValidator, salesOrderController.deleteSalesOrder);

// Update CNIC by UUID
router.patch('/:uuid/cnic', auth(), salesOrderValidator.updateCnicValidator, salesOrderController.updateCnic);

// Update notes by UUID
router.patch('/:uuid/notes', auth(), salesOrderValidator.updateNotesValidator, salesOrderController.updateNotes);

// Update order status by UUID
router.patch('/:uuid/status', auth(), salesOrderValidator.updateOrderStatusValidator, salesOrderController.updateOrderStatus);

// Update city by UUID
router.patch('/:uuid/city', auth(), salesOrderValidator.updateCityValidator, salesOrderController.updateCity);

// Update transaction by UUID (internal)
router.patch('/:uuid/transaction', auth(), salesOrderValidator.updateTransactionValidator, salesOrderController.updateTransaction);

// NEW: Update transaction by orderId or UUID (internal)
router.post('/transaction', auth(), salesOrderValidator.updateTransactionByIdentifierValidator, salesOrderController.updateTransactionByIdentifier);

// Update payment status by UUID (internal)
router.patch('/:uuid/payment-status', auth(), salesOrderValidator.updatePaymentStatusValidator, salesOrderController.updatePaymentStatus);

// Update sales order details
router.patch(
  '/:uuid/details',
  auth(),
  salesOrderValidator.updateSalesOrderDetailsValidator,
  salesOrderController.updateSalesOrderDetails
);

// Update MSISDN in a sales order
router.patch(
  '/:uuid/msisdn',
  auth(),
  salesOrderValidator.updateMsisdnValidator,
  salesOrderController.updateMsisdn
);

module.exports = router; 
