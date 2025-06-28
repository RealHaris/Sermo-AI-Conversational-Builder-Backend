const SuperDao = require('./SuperDao');
const models = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');

const SalesOrderAuditLog = models.sales_order_audit_log;
const SalesOrder = models.sales_order;
const User = models.user;

class SalesOrderAuditLogDao extends SuperDao {
  constructor() {
    super(SalesOrderAuditLog);
  }

  /**
   * Create an audit log entry
   * @param {Object} data - Audit log data
   * @returns {Promise<SalesOrderAuditLog>}
   */
  async create(data) {
    try {
      return SalesOrderAuditLog.create(data);
    } catch (error) {
      logger.error(`Error creating audit log: ${error.message}`);
      logger.error(error.stack);
      throw error;
    }
  }

  /**
   * Find audit logs for a specific sales order with pagination
   * @param {String} salesOrderUuid - UUID of the sales order
   * @returns {Promise<{rows: Array<SalesOrderAuditLog>, count: Number}>}
   */
  async findBySalesOrderUuid(salesOrderUuid) {
    try {

      const result = await SalesOrderAuditLog.findAndCountAll({
        where: {
          sales_order_uuid: salesOrderUuid,
          is_deleted: false
        },
        order: [['created_at', 'DESC']],
        attributes: {
          exclude: ['is_deleted', 'deleted_at', 'updatedAt', 'createdAt']
        }
      });

      return {
        rows: result.rows || [],
        count: result.count || 0
      };
    } catch (error) {
      logger.error(`Error finding audit logs: ${error.message}`);
      logger.error(error.stack);
      return { rows: [], count: 0 };
    }
  }

  /**
   * Find all audit logs with filters and pagination
   * @param {Object} filter - Filter conditions
   * @param {Number} page - Page number
   * @param {Number} limit - Number of records per page
   * @returns {Promise<{rows: Array<SalesOrderAuditLog>, count: Number}>}
   */
  async findWithPagination(filter = {}, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      const whereClause = { is_deleted: false };

      // Filter by sales order UUID if provided
      if (filter.salesOrderUuid) {
        whereClause.sales_order_uuid = filter.salesOrderUuid;
      }

      // Filter by action if provided
      if (filter.action) {
        whereClause.action = filter.action;
      }

      // Filter by done_by if provided
      if (filter.doneBy) {
        whereClause.done_by = filter.doneBy;
      }

      // Filter by user if provided
      if (filter.userEmail) {
        whereClause.user_email = filter.userEmail;
      }

      // Date range filter
      if (filter.startDate && filter.endDate) {
        whereClause.created_at = {
          [Op.between]: [new Date(filter.startDate), new Date(filter.endDate)]
        };
      }

      const result = await SalesOrderAuditLog.findAndCountAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit, 10),
        offset
      });

      return {
        rows: result.rows || [],
        count: result.count || 0
      };
    } catch (error) {
      logger.error(`Error finding audit logs with pagination: ${error.message}`);
      logger.error(error.stack);
      return { rows: [], count: 0 };
    }
  }

  /**
   * Soft delete audit logs for a sales order
   * @param {String} salesOrderUuid - UUID of the sales order
   * @returns {Promise<Boolean>} - True if successful
   */
  async deleteBySalesOrderUuid(salesOrderUuid) {
    try {
      const now = new Date();
      const result = await SalesOrderAuditLog.update(
        { is_deleted: true, deleted_at: now },
        { where: { sales_order_uuid: salesOrderUuid, is_deleted: false } }
      );

      return result[0] > 0;
    } catch (error) {
      logger.error(`Error deleting audit logs: ${error.message}`);
      logger.error(error.stack);
      return false;
    }
  }
}

module.exports = SalesOrderAuditLogDao; 
