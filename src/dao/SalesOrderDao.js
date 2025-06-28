const SuperDao = require('./SuperDao');
const models = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');

const SalesOrder = models.sales_order;
const SimInventory = models.sim_inventory;
const Bundle = models.bundle;
const OrderStatus = models.order_status;
const City = models.city;
const NumberType = models.number_type;

class SalesOrderDao extends SuperDao {
  constructor() {
    super(SalesOrder);
  }

  /**
   * Create a sales order
   * @param {Object} data
   * @returns {Promise<SalesOrder>}
   */
  async create(data) {
    return SalesOrder.create(data);
  }

  /**
   * Find all sales orders with pagination and optional filtering
   * @param {Number} page - Page number
   * @param {Number} limit - Items per page
   * @param {Object} filter - Filter conditions
   * @returns {Promise<{rows: Array<SalesOrder>, count: Number}>}
   */
  async findWithPagination(page = 1, limit = 10, filter = {}) {
    try {
      logger.info(`SalesOrder findWithPagination - page: ${page}, limit: ${limit}, filters: ${JSON.stringify(filter)}`);

      const offset = (page - 1) * limit;
      const whereClause = { is_deleted: false };

      // Copy filter to avoid modifying the original
      const filterCopy = { ...filter };

      // Extract data access filters if present
      const dataAccessFilters = filterCopy.dataAccessFilters || {};
      delete filterCopy.dataAccessFilters;

      // Handle search queries for CNIC, personal_phone, and alternate_phone
      if (filterCopy.search) {
        whereClause[Op.or] = [
          { cnic: { [Op.like]: `%${filterCopy.search}%` } },
          { personalPhone: { [Op.like]: `%${filterCopy.search}%` } },
          { alternatePhone: { [Op.like]: `%${filterCopy.search}%` } },
          { customerName: { [Op.like]: `%${filterCopy.search}%` } },
          { orderId: { [Op.like]: `%${filterCopy.search}%` } }
        ];
      }

      // Specific field filters
      if (filterCopy.cnic) {
        whereClause.cnic = { [Op.like]: `%${filterCopy.cnic}%` };
      }

      if (filterCopy.personalPhone) {
        whereClause.personalPhone = { [Op.like]: `%${filterCopy.personalPhone}%` };
      }

      if (filterCopy.alternatePhone) {
        whereClause.alternatePhone = { [Op.like]: `%${filterCopy.alternatePhone}%` };
      }

      // Replace city string filter with city_id filter
      if (filterCopy.city_id) {
        whereClause.city_id = parseInt(filterCopy.city_id, 10);
      }

      // Filter by order status id
      if (filterCopy.orderStatusId) {
        whereClause.order_status_id = parseInt(filterCopy.orderStatusId, 10);
      }

      // Filter by order status name
      let orderStatusInclude = {
        model: OrderStatus,
        as: 'order_status',
        attributes: ['id', 'uuid', 'name'],
        where: { is_deleted: false },
        required: false
      };

      if (filterCopy.orderStatusName) {
        orderStatusInclude.where = {
          ...orderStatusInclude.where,
          name: { [Op.like]: `%${filterCopy.orderStatusName}%` }
        };
        orderStatusInclude.required = true; // Make this an inner join
        logger.info(`Filtering by order status name: ${filterCopy.orderStatusName}`);
      }

      // Filter by payment status
      if (filterCopy.payment_status) {
        whereClause.payment_status = filterCopy.payment_status;
      }

      // Date range filter for created_date
      if (filterCopy.dateRange && filterCopy.dateRange.start && filterCopy.dateRange.end) {
        const startDate = new Date(filterCopy.dateRange.start);
        // Add one day to end date to include the end date in results
        const endDate = new Date(filterCopy.dateRange.end);
        endDate.setDate(endDate.getDate() + 1);

        whereClause.created_date = {
          [Op.between]: [startDate, endDate]
        };
      }

      // Determine sort parameters
      let sortBy = 'created_at';
      let sortOrder = 'DESC';

      if (filterCopy.sortBy) {
        sortBy = filterCopy.sortBy;
      }

      if (filterCopy.sortOrder) {
        sortOrder = filterCopy.sortOrder;
      }

      logger.info(`SalesOrder findWithPagination - whereClause: ${JSON.stringify(whereClause)}`);

      // Define base include for city with region
      const cityInclude = {
        model: City,
        as: 'city',
        attributes: ['id', 'uuid', 'name'],
        where: { is_deleted: false, status: true },
        required: false,
        include: [
          {
            model: models.region,
            as: 'region',
            attributes: ['id', 'uuid', 'name'],
            where: { is_deleted: false },
            required: false
          }
        ]
      };

      // Apply data access filters
      if (dataAccessFilters.cityIds && dataAccessFilters.cityIds.length > 0) {
        // If user has city-level access, filter by their city IDs
        whereClause.city_id = {
          [Op.in]: dataAccessFilters.cityIds
        };
      } else if (dataAccessFilters.regionIds && dataAccessFilters.regionIds.length > 0) {
        // If user has region-level access, filter by cities in their regions
        cityInclude.required = true;
        cityInclude.include[0].required = true;
        cityInclude.include[0].where.id = {
          [Op.in]: dataAccessFilters.regionIds
        };
      }

      // Execute the query with all relationships
      const result = await SalesOrder.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: SimInventory,
            as: 'sim_inventory',
            attributes: ['id', 'uuid', 'number', 'sim_price', 'final_sim_price'],
            where: { is_deleted: false },
            required: false,
            include: [
              {
                model: NumberType,
                as: 'number_type',
                attributes: ['id', 'uuid', 'name'],
                where: { is_deleted: false },
                required: false
              }
            ]
          },
          {
            model: Bundle,
            as: 'bundle',
            attributes: ['id', 'uuid', 'bundleId', 'bundleName', 'bundle_price', 'bundle_final_price'],
            where: { is_deleted: false },
            required: false
          },
          orderStatusInclude,
          cityInclude
        ],
        limit: parseInt(limit, 10),
        offset,
        order: [[sortBy, sortOrder]]
      });

      logger.info(`SalesOrder findWithPagination - result count: ${result.count}`);

      return {
        rows: result.rows || [],
        count: result.count || 0
      };
    } catch (error) {
      logger.error(`Error in SalesOrder findWithPagination: ${error.message}`);
      logger.error(error.stack);
      return { rows: [], count: 0 };
    }
  }

  /**
   * Find all sales orders without pagination
   * @param {Object} options - Optional filters
   * @returns {Promise<Array<SalesOrder>>}
   */
  async findAll(options = {}) {
    try {
      const whereClause = { is_deleted: false };

      // Extract data access filters if present
      const dataAccessFilters = options.dataAccessFilters || {};

      // Define base include for city with region
      const cityInclude = {
        model: City,
        as: 'city',
        attributes: ['id', 'uuid', 'name'],
        where: { is_deleted: false, status: true },
        required: false,
        include: [
          {
            model: models.region,
            as: 'region',
            attributes: ['id', 'uuid', 'name'],
            where: { is_deleted: false },
            required: false
          }
        ]
      };

      // Define order status include with optional filter
      let orderStatusInclude = {
        model: OrderStatus,
        as: 'order_status',
        attributes: ['id', 'uuid', 'name'],
        where: { is_deleted: false },
        required: false
      };

      if (options.orderStatusName) {
        orderStatusInclude.where = {
          ...orderStatusInclude.where,
          name: { [Op.like]: `%${options.orderStatusName}%` }
        };
        orderStatusInclude.required = true;
        logger.info(`Filtering by order status name: ${options.orderStatusName}`);
      }

      // Apply data access filters
      if (dataAccessFilters.cityIds && dataAccessFilters.cityIds.length > 0) {
        // If user has city-level access, filter by their city IDs
        whereClause.city_id = {
          [Op.in]: dataAccessFilters.cityIds
        };
      } else if (dataAccessFilters.regionIds && dataAccessFilters.regionIds.length > 0) {
        // If user has region-level access, filter by cities in their regions
        cityInclude.required = true;
        cityInclude.include[0].required = true;
        cityInclude.include[0].where.id = {
          [Op.in]: dataAccessFilters.regionIds
        };
      }

      return SalesOrder.findAll({
        where: whereClause,
        include: [
          {
            model: SimInventory,
            as: 'sim_inventory',
            attributes: ['id', 'uuid', 'number', 'sim_price', 'final_sim_price'],
            where: { is_deleted: false },
            required: false,
            include: [
              {
                model: NumberType,
                as: 'number_type',
                attributes: ['id', 'uuid', 'name'],
                where: { is_deleted: false },
                required: false
              }
            ]
          },
          {
            model: Bundle,
            as: 'bundle',
            attributes: ['id', 'uuid', 'bundleId', 'bundleName', 'bundle_price', 'bundle_final_price'],
            where: { is_deleted: false },
            required: false
          },
          orderStatusInclude,
          cityInclude
        ],
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      logger.error(`Error in SalesOrder findAll: ${error.message}`);
      logger.error(error.stack);
      return [];
    }
  }

  /**
   * Find a sales order by UUID
   * @param {String} uuid
   * @returns {Promise<SalesOrder>}
   */
  async findByUuid(uuid) {
    return SalesOrder.findOne({
      where: { uuid, is_deleted: false },
      include: [
        {
          model: SimInventory,
          as: 'sim_inventory',
          attributes: ['id', 'uuid', 'number', 'sim_price', 'final_sim_price', 'discount'],
          where: { is_deleted: false },
          required: false,
          include: [
            {
              model: NumberType,
              as: 'number_type',
              attributes: ['id', 'uuid', 'name'],
              where: { is_deleted: false },
              required: false
            }
          ]
        },
        {
          model: Bundle,
          as: 'bundle',
          attributes: ['id', 'uuid', 'bundleId', 'bundleName', 'bundle_price', 'bundle_final_price', 'discount'],
          where: { is_deleted: false },
          required: false
        },
        {
          model: OrderStatus,
          as: 'order_status',
          attributes: ['id', 'uuid', 'name'],
          where: { is_deleted: false },
          required: false
        },
        {
          model: City,
          as: 'city',
          attributes: ['id', 'uuid', 'name'],
          where: { is_deleted: false, status: true },
          required: false,
          include: [
            {
              model: models.region,
              as: 'region',
              attributes: ['uuid', 'name'],
              where: { is_deleted: false },
              required: false
            }
          ]
        }
      ]
    });
  }

  /**
   * Find a sales order by order ID
   * @param {String} orderId
   * @returns {Promise<SalesOrder>}
   */
  async findByOrderId(orderId) {
    return SalesOrder.findOne({
      where: { orderId, is_deleted: false },
      include: [
        {
          model: SimInventory,
          as: 'sim_inventory',
          attributes: ['id', 'uuid', 'number'],
          where: { is_deleted: false },
          required: false
        },
        {
          model: Bundle,
          as: 'bundle',
          attributes: ['id', 'uuid', 'bundleId', 'bundleName'],
          where: { is_deleted: false },
          required: false
        },
        {
          model: OrderStatus,
          as: 'order_status',
          attributes: ['id', 'uuid', 'name'],
          where: { is_deleted: false },
          required: false
        },
        {
          model: City,
          as: 'city',
          attributes: ['id', 'uuid', 'name'],
          where: { is_deleted: false, status: true },
          required: false,
          include: [
            {
              model: models.region,
              as: 'region',
              attributes: ['uuid', 'name'],
              where: { is_deleted: false },
              required: false
            }
          ]
        }
      ]
    });
  }

  /**
   * Update a sales order by UUID
   * @param {String} uuid
   * @param {Object} updateBody
   * @returns {Promise<Number>}
   */
  async update(uuid, updateBody) {
    return SalesOrder.update(updateBody, {
      where: { uuid, is_deleted: false }
    });
  }

  /**
   * Update CNIC of a sales order by UUID
   * @param {String} uuid
   * @param {String} cnic
   * @returns {Promise<Number>}
   */
  async updateCnic(uuid, cnic) {
    return SalesOrder.update({ cnic }, {
      where: { uuid, is_deleted: false }
    });
  }

  /**
   * Update notes of a sales order by UUID
   * @param {String} uuid
   * @param {String} notes
   * @returns {Promise<Number>}
   */
  async updateNotes(uuid, notes) {
    return SalesOrder.update({ notes }, {
      where: { uuid, is_deleted: false }
    });
  }

  /**
   * Update order status of a sales order by UUID
   * @param {String} uuid
   * @param {Number} orderStatusId
   * @returns {Promise<Number>}
   */
  async updateOrderStatus(uuid, orderStatusId) {
    return SalesOrder.update({ order_status_id: orderStatusId }, {
      where: { uuid, is_deleted: false }
    });
  }

  /**
   * Update city of a sales order by UUID
   * @param {String} uuid
   * @param {Number} cityId
   * @returns {Promise<Number>}
   */
  async updateCity(uuid, cityId) {
    return SalesOrder.update({ city_id: cityId }, {
      where: { uuid, is_deleted: false }
    });
  }

  /**
   * Update transaction details of a sales order by UUID
   * @param {String} uuid
   * @param {Object} transactionData
   * @returns {Promise<Number>}
   */
  async updateTransaction(uuid, transactionData) {
    return SalesOrder.update(transactionData, {
      where: { uuid, is_deleted: false }
    });
  }

  /**
   * Update payment status of a sales order by UUID
   * @param {String} uuid
   * @param {String} paymentStatus
   * @returns {Promise<Number>}
   */
  async updatePaymentStatus(uuid, paymentStatus) {
    return SalesOrder.update({ payment_status: paymentStatus }, {
      where: { uuid, is_deleted: false }
    });
  }

  /**
   * Delete a sales order (soft delete)
   * @param {String} uuid
   * @returns {Promise<Boolean>}
   */
  async delete(uuid) {
    const now = new Date();
    return SalesOrder.update(
      { is_deleted: true, deleted_at: now },
      { where: { uuid, is_deleted: false } }
    ).then(([affectedCount]) => affectedCount > 0);
  }

  /**
   * Get the latest order ID
   * @returns {Promise<String>}
   */
  async getLatestOrderId() {
    const order = await SalesOrder.findOne({
      where: {
        orderId: {
          [Op.like]: 'SO-%'
        },
        is_deleted: false
      },
      order: [['orderId', 'DESC']]
    });

    return order ? order.orderId : null;
  }

  /**
   * Find orders with specific MSISDN
   * @param {Number} msisdnId
   * @returns {Promise<Array<SalesOrder>>}
   */
  async findByMsisdnId(msisdnId) {
    return SalesOrder.findAll({
      where: {
        msisdn_id: msisdnId,
        is_deleted: false
      }
    });
  }

  /**
   * Find orders by order status IDs with payment and sim inventory filtering
   * @param {Array<Number>} orderStatusIds - Array of order status IDs to filter by
   * @param {String} paymentStatus - Payment status to filter by
   * @param {Boolean} hasSimInventory - Whether to filter for orders with sim inventory
   * @returns {Promise<Array<SalesOrder>>}
   */
  async findOrdersByStatusAndPayment(orderStatusIds, paymentStatus, hasSimInventory = true) {
    try {
      const whereClause = {
        is_deleted: false,
        order_status_id: orderStatusIds
      };

      // Add payment status condition
      if (paymentStatus) {
        whereClause.payment_status = {
          [Op.ne]: paymentStatus
        };
      }

      // Add sim inventory condition if required
      if (hasSimInventory) {
        whereClause.msisdn_id = {
          [Op.ne]: null
        };
      }

      return await SalesOrder.findAll({
        where: whereClause,
        include: [
          {
            model: SimInventory,
            as: 'sim_inventory',
            attributes: ['id', 'uuid', 'number', 'sim_price', 'final_sim_price', 'discount'],
            where: { is_deleted: false },
            required: false,
            include: [
              {
                model: NumberType,
                as: 'number_type',
                attributes: ['id', 'uuid', 'name'],
                where: { is_deleted: false },
                required: false
              }
            ]
          },
          {
            model: Bundle,
            as: 'bundle',
            attributes: ['id', 'uuid', 'bundleId', 'bundleName', 'bundle_price', 'bundle_final_price', 'discount'],
            where: { is_deleted: false },
            required: false
          },
          {
            model: OrderStatus,
            as: 'order_status',
            attributes: ['id', 'uuid', 'name'],
            where: { is_deleted: false },
            required: false
          }
        ]
      });
    } catch (error) {
      logger.error('Error in SalesOrderDao.findOrdersByStatusAndPayment:', error);
      throw error;
    }
  }

  /**
   * Find orders by order status IDs with payment, sim inventory, and date filtering
   * @param {Array<Number>} orderStatusIds - Array of order status IDs to filter by
   * @param {String} paymentStatus - Payment status to filter by
   * @param {Boolean} hasSimInventory - Whether to filter for orders with sim inventory
   * @param {Date} cutoffDate - Only return orders created before this date
   * @returns {Promise<Array<SalesOrder>>}
   */
  async findOrdersByStatusPaymentAndDate(orderStatusIds, paymentStatus, hasSimInventory = true, cutoffDate = null) {
    try {
      const whereClause = {
        is_deleted: false,
        order_status_id: orderStatusIds
      };

      // Add payment status condition
      if (paymentStatus) {
        whereClause.payment_status = {
          [Op.ne]: paymentStatus
        };
      }

      // Add sim inventory condition if required
      if (hasSimInventory) {
        whereClause.msisdn_id = {
          [Op.ne]: null
        };
      }

      // Add date filtering condition
      if (cutoffDate) {
        whereClause.created_date = {
          [Op.lt]: cutoffDate
        };
      }

      return await SalesOrder.findAll({
        where: whereClause,
        include: [
          {
            model: SimInventory,
            as: 'sim_inventory',
            attributes: ['id', 'uuid', 'number', 'sim_price', 'final_sim_price', 'discount'],
            where: { is_deleted: false },
            required: false,
            include: [
              {
                model: NumberType,
                as: 'number_type',
                attributes: ['id', 'uuid', 'name'],
                where: { is_deleted: false },
                required: false
              }
            ]
          },
          {
            model: Bundle,
            as: 'bundle',
            attributes: ['id', 'uuid', 'bundleId', 'bundleName', 'bundle_price', 'bundle_final_price', 'discount'],
            where: { is_deleted: false },
            required: false
          },
          {
            model: OrderStatus,
            as: 'order_status',
            attributes: ['id', 'uuid', 'name'],
            where: { is_deleted: false },
            required: false
          }
        ]
      });
    } catch (error) {
      logger.error('Error in SalesOrderDao.findOrdersByStatusPaymentAndDate:', error);
      throw error;
    }
  }
}

module.exports = SalesOrderDao;
