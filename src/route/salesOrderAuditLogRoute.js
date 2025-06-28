const express = require('express');
const SalesOrderAuditLogValidator = require('../validator/SalesOrderAuditLogValidator');
const SalesOrderAuditLogController = require('../controllers/SalesOrderAuditLogController');
const { auth } = require('../middlewares/auth');

const router = express.Router();
const salesOrderAuditLogController = new SalesOrderAuditLogController();
const salesOrderAuditLogValidator = new SalesOrderAuditLogValidator();

// Get audit logs for a specific sales order
router.get(
  '/sales-order/:uuid',
  auth(),
  salesOrderAuditLogValidator.getAuditLogsBySalesOrderUuidValidator,
  salesOrderAuditLogController.getAuditLogsBySalesOrderUuid
);

// Get all audit logs with filtering
router.get(
  '/',
  auth(),
  salesOrderAuditLogValidator.getAllAuditLogsValidator,
  salesOrderAuditLogController.getAllAuditLogs
);

module.exports = router; 
