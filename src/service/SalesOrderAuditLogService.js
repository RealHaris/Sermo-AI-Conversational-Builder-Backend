const httpStatus = require('http-status');
const { v4: uuidv4 } = require('uuid');
const SalesOrderAuditLogDao = require('../dao/SalesOrderAuditLogDao');
const SalesOrderDao = require('../dao/SalesOrderDao');
const responseHandler = require('../helper/responseHandler');
const logger = require('../config/logger');

class SalesOrderAuditLogService {
  constructor() {
    this.salesOrderAuditLogDao = new SalesOrderAuditLogDao();
    this.salesOrderDao = new SalesOrderDao();
  }

  /**
   * Create an audit log entry for a sales order action
   * @param {Object} data - Log data including sales order uuid, user info, action, etc.
   * @returns {Promise<Object>} - Created log entry
   */
  createAuditLog = async (data) => {
    try {
      // Check if the sales order exists
      if (data.sales_order_uuid) {
        const salesOrder = await this.salesOrderDao.findByUuid(data.sales_order_uuid);
        if (!salesOrder) {
          logger.error(`Cannot create audit log: Sales order ${data.sales_order_uuid} not found`);
          return null;
        }
        // Set the sales_order_id based on the UUID
        data.sales_order_id = salesOrder.id;
      }

      // Generate UUID for the log entry
      const logData = {
        ...data,
        uuid: uuidv4(),
        created_at: new Date(),
        is_deleted: false
      };

      // For system actions, set default values if not provided
      if (data.done_by === 'system' && !data.user_full_name) {
        logData.user_full_name = 'Bot';
        logData.user_email = null;
      }

      // Create the log entry
      const log = await this.salesOrderAuditLogDao.create(logData);

      if (!log) {
        logger.error('Failed to create audit log entry');
        return null;
      }

      return log;
    } catch (error) {
      logger.error(`Error in createAuditLog: ${error.message}`);
      logger.error(error.stack);
      return null;
    }
  };

  /**
   * Get audit logs for a specific sales order with pagination
   * @param {String} salesOrderUuid - UUID of the sales order
   * @param {Number} page - Page number
   * @param {Number} limit - Items per page
   * @returns {Object} - Response object with logs
   */
  getAuditLogsBySalesOrderUuid = async (salesOrderUuid,) => {
    try {
      // Check if the sales order exists
      const salesOrder = await this.salesOrderDao.findByUuid(salesOrderUuid);
      if (!salesOrder) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Sales order not found'
        );
      }

      // Get audit logs for the sales order
      const logs = await this.salesOrderAuditLogDao.findBySalesOrderUuid(salesOrderUuid);

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Audit logs retrieved successfully',
        logs.rows || []
      );
    } catch (error) {
      logger.error(`Error in getAuditLogsBySalesOrderUuid: ${error.message}`);
      logger.error(error.stack);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Get all audit logs with filtering and pagination
   * @param {Object} query - Query parameters for filtering and pagination
   * @returns {Object} - Response object with logs
   */
  getAllAuditLogs = async (query) => {
    try {
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 10;
      const { page: _, limit: __, ...filter } = query;

      // Get audit logs with filters
      const logs = await this.salesOrderAuditLogDao.findWithPagination(filter, page, limit);

      // Calculate pagination details
      const total = logs.count || 0;
      const totalPages = Math.ceil(total / limit) || 0;
      const pagination = {
        total,
        current_page: page,
        per_page: limit,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1
      };

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Audit logs retrieved successfully',
        {
          content: logs.rows || [],
          pagination
        }
      );
    } catch (error) {
      logger.error(`Error in getAllAuditLogs: ${error.message}`);
      logger.error(error.stack);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };
}

module.exports = SalesOrderAuditLogService; 
