const httpStatus = require('http-status');
const SalesOrderAuditLogService = require('../service/SalesOrderAuditLogService');
const logger = require('../config/logger');

class SalesOrderAuditLogController {
  constructor() {
    this.salesOrderAuditLogService = new SalesOrderAuditLogService();
  }

  /**
   * Get audit logs for a specific sales order
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getAuditLogsBySalesOrderUuid = async (req, res) => {
    try {
      const { uuid } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const result = await this.salesOrderAuditLogService.getAuditLogsBySalesOrderUuid(
        uuid
      );

      res.status(result.statusCode).json(result.response);
    } catch (error) {
      logger.error(`Error in getAuditLogsBySalesOrderUuid: ${error.message}`);
      logger.error(error.stack);
      res.status(httpStatus.BAD_REQUEST).json({
        status: false,
        statusCode: httpStatus.BAD_REQUEST,
        message: 'Something went wrong while retrieving audit logs',
        data: null
      });
    }
  };

  /**
   * Get all audit logs with filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getAllAuditLogs = async (req, res) => {
    try {
      const result = await this.salesOrderAuditLogService.getAllAuditLogs(req.query);
      res.status(result.statusCode).json(result.response);
    } catch (error) {
      logger.error(`Error in getAllAuditLogs: ${error.message}`);
      logger.error(error.stack);
      res.status(httpStatus.BAD_REQUEST).json({
        status: false,
        statusCode: httpStatus.BAD_REQUEST,
        message: 'Something went wrong while retrieving audit logs',
        data: null
      });
    }
  };
}

module.exports = SalesOrderAuditLogController; 
