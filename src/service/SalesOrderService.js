const httpStatus = require('http-status');
const { v4: uuidv4 } = require('uuid');
const SalesOrderDao = require('../dao/SalesOrderDao');
const SimInventoryDao = require('../dao/SimInventoryDao');
const BundleDao = require('../dao/BundleDao');
const OrderStatusDao = require('../dao/OrderStatusDao');
const EventStatusMappingService = require('./EventStatusMappingService');
const CityDao = require('../dao/CityDao');
const NumberTypeDao = require('../dao/NumberTypeDao');
const SalesOrderAuditLogService = require('./SalesOrderAuditLogService');
const responseHandler = require('../helper/responseHandler');
const logger = require('../config/logger');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');
const { encrypt } = require('../helper/EncryptionHelper');

class SalesOrderService {
  constructor() {
    this.salesOrderDao = new SalesOrderDao();
    this.simInventoryDao = new SimInventoryDao();
    this.bundleDao = new BundleDao();
    this.orderStatusDao = new OrderStatusDao();
    this.eventStatusMappingService = new EventStatusMappingService();
    this.cityDao = new CityDao();
    this.numberTypeDao = new NumberTypeDao();
    this.salesOrderAuditLogService = new SalesOrderAuditLogService();
  }

  /**
   * Create an audit log entry for a sales order action
   * @param {Object} data - Log data including sales order uuid, user info, etc.
   * @returns {Promise<Object|null>} - Created log entry or null if failed
   */
  createAuditLog = async (data) => {
    try {
      return await this.salesOrderAuditLogService.createAuditLog(data);
    } catch (error) {
      logger.error(`Error creating audit log: ${error.message}`);
      logger.error(error.stack);
      return null;
    }
  };

  /**
   * Generate a new unique order ID
   * @returns {String} - New order ID
   */
  generateOrderId = async () => {
    const latestOrderId = await this.salesOrderDao.getLatestOrderId();

    if (!latestOrderId) {
      return 'SO-1000'; // Initial order ID
    }

    const currentNumber = parseInt(latestOrderId.split('-')[1], 10);
    return `SO-${currentNumber + 1}`;
  };

  /**
   * Get the order status ID for a specific event
   * @param {String} event - Event name
   * @returns {Number|null} - Order status ID or null if not found
   */
  getStatusIdForEvent = async (event) => {
    try {
      const statusIds = await this.eventStatusMappingService.getStatusIdsForEvent(event);
      // Return the first status ID mapped to this event, or null if none found
      return statusIds.length > 0 ? statusIds[0] : null;
    } catch (error) {
      logger.error(`Error getting status for event ${event}:`, error);
      return null;
    }
  };

  /**
   * Check if a status is mapped to a specific event
   * @param {Number} statusId - Order status ID
   * @param {String} event - Event name
   * @returns {Boolean} - True if status is mapped to the event
   */
  isStatusMappedToEvent = async (statusId, event) => {
    try {
      return await this.eventStatusMappingService.isStatusMappedToEvent(statusId, event);
    } catch (error) {
      logger.error(`Error checking if status ${statusId} is mapped to event ${event}:`, error);
      return false;
    }
  };

  /**
   * Create a sales order
   * @param {Object} data - Sales order data
   * @returns {Object} - Response object
   */
  createSalesOrder = async (data) => {
    try {
      // Validate personal phone is provided
      if (!data.personalPhone) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Personal phone number is required'
        );
      }

      // Check msisdn (sim) if provided
      let msisdnId = null;
      if (data.msisdn) {
        const simInventory = await this.simInventoryDao.findOneByWhere({
          number: data.msisdn,
          status: 'Available',
          is_deleted: false
        });

        if (!simInventory) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'MSISDN not found or not available'
          );
        }
        msisdnId = simInventory.id;

        // Check if the MSISDN is already associated with another order
        const existingOrders = await this.salesOrderDao.findByMsisdnId(msisdnId);
        if (existingOrders && existingOrders.length > 0) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'This MSISDN is already associated with another order'
          );
        }
      }

      // Check bundle if provided
      let bundleId = null;
      if (data.bundleId) {
        const bundle = await this.bundleDao.findByUuid(data.bundleId);
        if (!bundle) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'Bundle not found'
          );
        }
        bundleId = bundle.id;
      }

      // Check city if provided
      let cityId = null;
      if (data.city_uuid) {
        const city = await this.cityDao.findOneWithRegionIncludeInactive({ uuid: data.city_uuid });
        if (!city) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'City not found'
          );
        }
        cityId = city.id;
      }

      // Get order status mapped to ORDER_CREATION event
      let orderStatusId = await this.getStatusIdForEvent('ORDER_CREATION');

      // If no status is mapped to ORDER_CREATION, look for a default status
      if (!orderStatusId) {
        const defaultOrderStatus = await this.orderStatusDao.findOneByWhere({
          name: 'Draft',
          is_deleted: false
        });

        if (!defaultOrderStatus) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'No status mapped to ORDER_CREATION event and no default status found'
          );
        }

        orderStatusId = defaultOrderStatus.id;
      }

      // Generate order ID
      const orderId = await this.generateOrderId();

      // Encrypt CNIC if provided
      const encryptedCnic = data.cnic ? encrypt(data.cnic) : null;

      // Create sales order object
      const salesOrderData = {
        uuid: uuidv4(),
        orderId,
        customerName: data.customerName,
        personalPhone: data.personalPhone,
        alternatePhone: data.alternatePhone || null,
        cnic: encryptedCnic,
        msisdn_id: msisdnId,
        bundle_id: bundleId,
        city_id: cityId,
        order_status_id: orderStatusId,
        notes: data.notes || '',
        address: data.address || null,
        created_date: new Date(),
        is_deleted: false,
        payment_status: 'unpaid',
        total_transaction_price: data.total_transaction_price || 0
      };

      const salesOrder = await this.salesOrderDao.create(salesOrderData);

      if (!salesOrder) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to create sales order'
        );
      }

      // If msisdn is provided, update its status to "Sold"
      if (msisdnId) {
        await this.simInventoryDao.updateStatusByUuid(
          msisdnId,
          'Sold'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.CREATED,
        'Sales order created successfully',
        salesOrder
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Get all sales orders with pagination and filtering
   * @param {Object} query - Query parameters for filtering and pagination
   * @param {Object} dataAccessFilters - User's data access filters
   * @returns {Object} - Response object with sales orders
   */
  getSalesOrders = async (query, dataAccessFilters = {}) => {
    try {
      logger.info(`Getting sales orders with query: ${JSON.stringify(query)}`);

      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 10;
      const { page: _, limit: __, ...filter } = query;

      // Convert city_uuid to city_id if provided
      if (filter.city_uuid) {
        const city = await this.cityDao.findOneWithRegionIncludeInactive({ uuid: filter.city_uuid });
        if (city) {
          filter.city_id = city.id;
        }
        delete filter.city_uuid;
      }

      // Add data access filters to the query
      filter.dataAccessFilters = dataAccessFilters;

      // Add date range filters if provided
      if (filter.startDate && filter.endDate) {
        filter.dateRange = {
          start: new Date(filter.startDate),
          end: new Date(filter.endDate)
        };
        delete filter.startDate;
        delete filter.endDate;
      }

      const salesOrders = await this.salesOrderDao.findWithPagination(page, limit, filter);

      logger.info(`Sales orders retrieved count: ${salesOrders.count}, rows length: ${salesOrders.rows ? salesOrders.rows.length : 0}`);

      // Ensure we have a valid total before calculating pages
      const total = salesOrders.count || 0;
      const totalPages = Math.ceil(total / limit) || 0;

      const pagination = {
        total,
        current_page: page,
        per_page: limit,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1
      };

      // Make sure content is always an array even if no results
      const content = salesOrders.rows || [];

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Sales orders retrieved successfully',
        {
          content,
          pagination
        }
      );
    } catch (e) {
      logger.error(`Error getting sales orders: ${e.message}`);
      logger.error(e.stack);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Get all sales orders without pagination
   * @param {Object} dataAccessFilters - User's data access filters
   * @returns {Object} - Response object with all sales orders
   */
  getAllSalesOrders = async (dataAccessFilters = {}) => {
    try {
      const salesOrders = await this.salesOrderDao.findAll({ dataAccessFilters });

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Sales orders retrieved successfully',
        salesOrders
      );
    } catch (e) {
      logger.error(`Error getting all sales orders: ${e.message}`);
      logger.error(e.stack);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Export all sales orders to CSV
   * @returns {Object} - Response object with CSV file path
   */
  exportSalesOrdersToCSV = async () => {
    try {
      const salesOrders = await this.salesOrderDao.findAll();

      if (!salesOrders || salesOrders.length === 0) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'No sales orders found to export'
        );
      }

      // Create directory if it doesn't exist
      const uploadDir = path.join(process.env.PWD, 'public', 'exports');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Generate file name with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const fileName = `sales-order-${currentDate}.csv`;
      const filePath = path.join(uploadDir, fileName);

      console.log(salesOrders);

      // Transform data for CSV
      const records = salesOrders.map(order => {
        const simNumber = order.sim_inventory ? order.sim_inventory.number : '';
        const numberType = order.sim_inventory && order.sim_inventory.number_type ? order.sim_inventory.number_type.name : '';
        const simFinalPrice = order.sim_inventory ? order.sim_inventory.final_sim_price : '';
        const bundleFinalPrice = order.bundle ? order.bundle.bundle_final_price : '';
        const bundleOfferId = order.bundle ? order.bundle.offerId : '';
        const bundleName = order.bundle ? order.bundle.bundleName : '';
        const bundleId = order.bundle ? order.bundle.bundleId : '';
        const orderStatus = order.order_status ? order.order_status.name : '';
        const cityName = order.city ? order.city.name : '';
        const regionName = order.city && order.city.region ? order.city.region.name : '';

        return {
          orderId: order.orderId,
          customerName: order.customerName,
          cnic: order.cnic || '',
          personalPhone: order.personalPhone,
          alternatePhone: order.alternatePhone || '',
          address: order.address || '',
          simNumber,
          simFinalPrice,
          bundleFinalPrice,
          bundleId,
          bundleOfferId,
          final_total_price: Number(simFinalPrice) + Number(bundleFinalPrice) || 0,
          numberType,
          bundleName,
          city: cityName,
          region: regionName,
          orderStatus,
          paymentStatus: order.payment_status,
          totalTransactionPrice: order.total_transaction_price,
          paymentMethod: order.payment_method || '',
          transactionRef: order.transaction_ref || '',
          notes: order.notes || '',
          createdDate: order.created_date ? new Date(order.created_date).toISOString() : ''
        };
      });

      // Define CSV columns
      const csvWriter = createCsvWriter({
        path: filePath,
        header: [
          { id: 'orderId', title: 'Order ID' },
          { id: 'customerName', title: 'Customer Name' },
          { id: 'cnic', title: 'CNIC' },
          { id: 'personalPhone', title: 'Phone Number' },
          { id: 'alternatePhone', title: 'Alternate Phone' },
          { id: 'address', title: 'Address' },
          { id: 'simNumber', title: 'SIM Number' },
          { id: 'simFinalPrice', title: 'SIM Final Price' },
          { id: 'bundleFinalPrice', title: 'Bundle Final Price' },
          { id: 'bundleId', title: 'Bundle ID' },
          { id: 'bundleOfferId', title: 'Bundle Offer ID' },
          { id: 'final_total_price', title: 'Final Total Price' },
          { id: 'numberType', title: 'Number Type' },
          { id: 'bundleName', title: 'Bundle' },
          { id: 'city', title: 'City' },
          { id: 'region', title: 'Region' },
          { id: 'orderStatus', title: 'Order Status' },
          { id: 'paymentStatus', title: 'Payment Status' },
          { id: 'totalTransactionPrice', title: 'Transaction Amount' },
          { id: 'paymentMethod', title: 'Payment Method' },
          { id: 'transactionRef', title: 'Transaction Reference' },
          { id: 'notes', title: 'Notes' },
          { id: 'createdDate', title: 'Created Date' }
        ]
      });

      await csvWriter.writeRecords(records);

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Sales orders exported successfully',
        {
          fileName,
          downloadUrl: `/exports/${fileName}`
        }
      );
    } catch (e) {
      logger.error(`Error exporting sales orders: ${e.message}`);
      logger.error(e.stack);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong during export!'
      );
    }
  };

  /**
   * Get a sales order by UUID
   * @param {String} uuid - Sales order UUID
   * @returns {Object} - Response object with sales order
   */
  getSalesOrderByUuid = async (uuid) => {
    try {
      const salesOrder = await this.salesOrderDao.findByUuid(uuid);

      if (!salesOrder) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Sales order not found'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Sales order retrieved successfully',
        salesOrder
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Update CNIC of a sales order
   * @param {String} uuid - Sales order UUID
   * @param {String} cnic - New CNIC
   * @param {Object} user - User performing the action (null for system actions)
   * @returns {Object} - Response object
   */
  updateCnic = async (uuid, cnic, user = null) => {
    try {
      const salesOrder = await this.salesOrderDao.findByUuid(uuid);

      if (!salesOrder) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Sales order not found'
        );
      }

      // Validate CNIC format if needed
      if (cnic && cnic.length > 15) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'CNIC should be maximum 15 characters'
        );
      }

      // Encrypt the CNIC before saving
      const encryptedCnic = cnic ? encrypt(cnic) : null;

      const updated = await this.salesOrderDao.updateCnic(uuid, encryptedCnic);

      if (!updated[0]) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to update CNIC'
        );
      }

      // Create audit log for CNIC update
      await this.createAuditLog({
        sales_order_uuid: uuid,
        user_full_name: user ? user.full_name : 'Bot',
        user_email: user ? user.email : null,
        done_by: user ? 'user' : 'system',
        action: 'cnic_updated',
        // Don't log the actual CNIC for security
        details: 'CNIC information was updated'
      });

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'CNIC updated successfully',
        {}
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Update notes of a sales order
   * @param {String} uuid - Sales order UUID
   * @param {String} notes - New notes
   * @param {Object} user - User performing the action (null for system actions)
   * @returns {Object} - Response object
   */
  updateNotes = async (uuid, notes, user = null) => {
    try {
      const salesOrder = await this.salesOrderDao.findByUuid(uuid);

      if (!salesOrder) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Sales order not found'
        );
      }

      const previousNotes = salesOrder.notes || '';

      const updated = await this.salesOrderDao.updateNotes(uuid, notes);

      if (!updated[0]) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to update notes'
        );
      }

      // Create audit log for notes update
      await this.createAuditLog({
        sales_order_uuid: uuid,
        user_full_name: user ? user.full_name : 'Bot',
        user_email: user ? user.email : null,
        done_by: user ? 'user' : 'system',
        action: 'notes_updated',
        previous_value: previousNotes,
        new_value: notes,
        details: 'Order notes were updated'
      });

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Notes updated successfully',
        {}
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Update order status of a sales order
   * @param {String} uuid - Sales order UUID
   * @param {String} orderStatusUuid - UUID of the new order status
   * @param {Object} user - User performing the action (null for system actions)
   * @returns {Object} - Response object
   */
  updateOrderStatus = async (uuid, orderStatusUuid, user = null) => {
    try {
      const salesOrder = await this.salesOrderDao.findByUuid(uuid);

      if (!salesOrder) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Sales order not found'
        );
      }

      // Find the order status by UUID
      const orderStatus = await this.orderStatusDao.findByUuid(orderStatusUuid);

      if (!orderStatus) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Order status not found'
        );
      }

      // Find the previous order status for audit log
      const previousOrderStatus = salesOrder.order_status ?
        salesOrder.order_status.name :
        'Unknown';

      // Check if the new status is mapped to RELEASE_INVENTORY event
      const isReleaseInventory = await this.isStatusMappedToEvent(orderStatus.id, 'RELEASE_INVENTORY');

      // If the status is mapped to RELEASE_INVENTORY and there's a MSISDN
      if (isReleaseInventory && salesOrder.msisdn_id) {
        // Release the MSISDN by changing its status to Available
        await this.simInventoryDao.updateStatusByUuid(
          salesOrder.sim_inventory.uuid,
          'Available'
        );

        // Remove MSISDN from the order
        await this.salesOrderDao.update(uuid, { msisdn_id: null, bundle_id: null });

        logger.info(`Released MSISDN for order ${uuid} when status changed to ${orderStatus.name}`);

        // Create audit log for releasing inventory
        await this.createAuditLog({
          sales_order_uuid: uuid,
          user_full_name: user ? user.full_name : 'Bot',
          user_email: user ? user.email : null,
          done_by: user ? 'user' : 'system',
          action: 'release_inventory',
          details: `SIM Number ${salesOrder.sim_inventory.number} was released due to status change to ${orderStatus.name}`
        });
      }

      const updated = await this.salesOrderDao.updateOrderStatus(uuid, orderStatus.id);

      if (!updated[0]) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to update order status'
        );
      }

      // Create audit log for status change
      await this.createAuditLog({
        sales_order_uuid: uuid,
        user_full_name: user ? user.full_name : 'Bot',
        user_email: user ? user.email : null,
        done_by: user ? 'user' : 'system',
        action: 'status_changed',
        previous_value: previousOrderStatus,
        new_value: orderStatus.name,
        details: `Order status changed from ${previousOrderStatus} to ${orderStatus.name}`
      });

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Order status updated successfully',
        {}
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Update city of a sales order
   * @param {String} uuid - Sales order UUID
   * @param {String} cityUuid - UUID of the new city
   * @param {Object} user - User performing the action (null for system actions)
   * @returns {Object} - Response object
   */
  updateCity = async (uuid, cityUuid, user = null) => {
    try {
      const salesOrder = await this.salesOrderDao.findByUuid(uuid);

      if (!salesOrder) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Sales order not found'
        );
      }

      // Find the city by UUID
      const city = await this.cityDao.findOneWithRegionIncludeInactive({ uuid: cityUuid });

      if (!city) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'City not found'
        );
      }

      const updated = await this.salesOrderDao.updateCity(uuid, city.id);

      if (!updated[0]) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to update city'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'City updated successfully',
        {}
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Delete a sales order
   * @param {String} uuid - Sales order UUID
   * @returns {Object} - Response object
   */
  deleteSalesOrder = async (uuid) => {
    try {
      const salesOrder = await this.salesOrderDao.findByUuid(uuid);

      if (!salesOrder) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Sales order not found'
        );
      }

      // If there's a MSISDN associated, we need to set it back to "Available"
      if (salesOrder.msisdn_id) {
        await this.simInventoryDao.updateStatusByUuid(
          salesOrder.msisdn_id,
          'Available'
        );
      }

      const deleted = await this.salesOrderDao.delete(uuid);

      if (!deleted) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to delete sales order'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Sales order deleted successfully',
        {}
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Create an order through external API
   * @param {Object} data - Order data
   * @param {Object} user - User performing the action (null for system/external actions)
   * @returns {Promise<Object>}
   */
  createExternalOrder = async (data, user = null) => {
    try {
      // Check msisdn (sim) exists and is available
      const simInventory = await this.simInventoryDao.findOneByWhere({
        uuid: data.selectedMsisdnId,
        status: 'Available',
        is_deleted: false
      });

      if (!simInventory) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Selected MSISDN not found or not available'
        );
      }

      const msisdnId = simInventory.id;

      // Check if the MSISDN is already associated with another order
      const existingOrders = await this.salesOrderDao.findByMsisdnId(msisdnId);
      if (existingOrders && existingOrders.length > 0) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'This MSISDN is already associated with another order'
        );
      }

      // Check bundle if provided (now optional)
      let bundleId = null;
      if (data.bundleId) {
        const bundle = await this.bundleDao.findByUuid(data.bundleId);
        if (!bundle) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'Bundle not found'
          );
        }
        bundleId = bundle.id;
      }

      // Check city
      let cityId = null;
      const city = await this.cityDao.findOneWithRegionIncludeInactive({ uuid: data.cityId });
      if (!city) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'City not found'
        );
      }
      cityId = city.id;

      // Get order status mapped to ORDER_CREATION event
      let orderStatusId = await this.getStatusIdForEvent('ORDER_CREATION');

      // If no status is mapped to ORDER_CREATION, look for a default status
      if (!orderStatusId) {
        // Check for "Draft" status as fallback
        let orderStatus = await this.orderStatusDao.findOneByWhere({
          name: 'Draft',
          is_deleted: false
        });

        if (!orderStatus) {
          // Create the "Draft" status
          const newOrderStatusData = {
            uuid: uuidv4(),
            name: 'Draft',
            is_deleted: false
          };
          orderStatus = await this.orderStatusDao.create(newOrderStatusData);

          if (!orderStatus) {
            return responseHandler.returnError(
              httpStatus.BAD_REQUEST,
              'Failed to create order status'
            );
          }
        }

        orderStatusId = orderStatus.id;
      }

      // Generate order ID
      const orderId = await this.generateOrderId();

      // Encrypt CNIC if provided
      const encryptedCnic = data.cnic ? encrypt(data.cnic) : null;

      // Create sales order object
      const orderUuid = uuidv4();
      const salesOrderData = {
        uuid: orderUuid,
        orderId,
        customerName: data.name,
        personalPhone: data.customerContactNumber,
        alternatePhone: data.alternateContactNumber || null,
        cnic: encryptedCnic,
        msisdn_id: msisdnId,
        bundle_id: bundleId,
        city_id: cityId,
        order_status_id: orderStatusId,
        address: data.address || null,
        notes: data.notes || '',
        created_date: new Date(),
        is_deleted: false,
        // New transaction fields
        total_transaction_price: data.total_transaction_price || 0,
        payment_method: data.payment_method || null,
        transaction_ref: data.transaction_ref || null,
        payment_status: data.payment_status || 'unpaid'
      };

      const salesOrder = await this.salesOrderDao.create(salesOrderData);

      if (!salesOrder) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to create order'
        );
      }

      // Update sim inventory status to "Sold"
      await this.simInventoryDao.updateStatusByUuid(
        simInventory.uuid,
        'Sold'
      );

      // Log order creation
      await this.createAuditLog({
        sales_order_uuid: orderUuid,
        user_full_name: 'Bot',
        user_email: null,
        done_by: 'system',
        action: 'order_created',
        details: `Order created with order ID ${orderId}`
      });

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Order created successfully',
        { orderId: salesOrder.orderId }
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(
        httpStatus.BAD_GATEWAY,
        'Something went wrong!'
      );
    }
  };

  /**
   * Find a sales order by orderId or UUID
   * @param {Object} identifier - Either orderId or uuid
   * @returns {Object} - Sales order or null
   */
  findOrderByIdentifier = async (identifier) => {
    if (!identifier.orderId && !identifier.uuid) {
      return null;
    }

    let salesOrder = null;

    // If UUID is provided, try to find by UUID first
    if (identifier.uuid) {
      salesOrder = await this.salesOrderDao.findByUuid(identifier.uuid);
    }

    // If no order found by UUID and orderId is provided, try to find by orderId
    if (!salesOrder && identifier.orderId) {
      salesOrder = await this.salesOrderDao.findByOrderId(identifier.orderId);
    }

    return salesOrder;
  };

  /**
   * Update transaction details by orderId or UUID
   * @param {Object} identifier - Contains either orderId or uuid
   * @param {Object} transactionData - Transaction data
   * @param {Object} user - User performing the action (null for system actions)
   * @returns {Object} - Response object
   */
  updateTransactionByIdentifier = async (identifier, transactionData, user = null) => {
    try {
      const salesOrder = await this.findOrderByIdentifier(identifier);

      if (!salesOrder) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Sales order not found'
        );
      }

      // Get previous payment status for audit log
      const previousPaymentStatus = salesOrder.payment_status || 'unknown';

      // Update transaction details
      const updateData = {
        total_transaction_price: transactionData.total_transaction_price,
        payment_method: transactionData.payment_method,
        transaction_ref: transactionData.transaction_ref,
        transaction_created_date: transactionData.transaction_created_date || new Date(),
        payment_status: transactionData.payment_status || 'unpaid'
      };

      let result;
      let auditActions = [];

      // Handle payment status changes and related event mapping
      if (transactionData.payment_status === 'payment_failed') {
        // Get status mapped to PAYMENT_FAILED event
        const failedStatusId = await this.getStatusIdForEvent('PAYMENT_FAILED');

        if (failedStatusId) {
          // Get old status for audit log
          const oldOrderStatus = await this.orderStatusDao.findById(salesOrder.order_status_id);
          const oldOrderStatusName = oldOrderStatus ? oldOrderStatus.name : 'Unknown';

          // Update order status to the PAYMENT_FAILED status
          await this.salesOrderDao.updateOrderStatus(salesOrder.uuid, failedStatusId);

          // Get new status for audit log
          const newOrderStatus = await this.orderStatusDao.findById(failedStatusId);

          // Add to audit actions
          auditActions.push({
            action: 'status_changed',
            previous_value: oldOrderStatusName,
            new_value: newOrderStatus.name,
            details: `Order status changed from ${oldOrderStatusName} to ${newOrderStatus.name} due to failed payment`
          });

          // Check if the new status is also mapped to RELEASE_INVENTORY event
          const shouldReleaseInventory = await this.isStatusMappedToEvent(failedStatusId, 'RELEASE_INVENTORY');

          // If status is mapped to RELEASE_INVENTORY or if there's a separate status for RELEASE_INVENTORY
          if (shouldReleaseInventory || await this.getStatusIdForEvent('RELEASE_INVENTORY')) {
            // If there's a MSISDN, change status back to Available
            if (salesOrder.msisdn_id) {
              // Gather SIM details for audit log before releasing
              const simDetails = {
                simNumber: salesOrder.sim_inventory ? salesOrder.sim_inventory.number : 'Unknown',
                simType: salesOrder.sim_inventory && salesOrder.sim_inventory.number_type ?
                  salesOrder.sim_inventory.number_type.name : 'Unknown',
                bundleName: salesOrder.bundle ? salesOrder.bundle.bundleName : 'No bundle'
              };

              await this.simInventoryDao.updateStatusByUuid(
                salesOrder.sim_inventory.uuid,
                'Available'
              );

              // Remove MSISDN and bundle_id from order
              await this.salesOrderDao.update(salesOrder.uuid, {
                msisdn_id: null,
                bundle_id: null
              });

              // Add to audit actions
              auditActions.push({
                action: 'release_inventory',
                details: `SIM Number ${simDetails.simNumber} was released due to payment failure`
              });
            }
          }
        } else {
          // Fallback to looking for legacy status name if no event mapping exists
          let cancelledStatus = await this.orderStatusDao.findOneByWhere({
            name: 'Cancelled: Payment Failed',
            is_deleted: false
          });

          if (!cancelledStatus) {
            // Create the status
            const newStatusData = {
              uuid: uuidv4(),
              name: 'Cancelled: Payment Failed',
              is_deleted: false,
              event: 'PAYMENT_FAILED' // Automatically map to the appropriate event
            };
            cancelledStatus = await this.orderStatusDao.create(newStatusData);
          }

          // Get old status for audit log
          const oldOrderStatus = await this.orderStatusDao.findById(salesOrder.order_status_id);
          const oldOrderStatusName = oldOrderStatus ? oldOrderStatus.name : 'Unknown';

          // Update order status to cancelled
          await this.salesOrderDao.updateOrderStatus(salesOrder.uuid, cancelledStatus.id);

          // Add to audit actions
          auditActions.push({
            action: 'status_changed',
            previous_value: oldOrderStatusName,
            new_value: cancelledStatus.name,
            details: `Order status changed from ${oldOrderStatusName} to ${cancelledStatus.name} due to failed payment`
          });

          // If there's a MSISDN, change status back to Available
          if (salesOrder.msisdn_id) {
            // Gather SIM details for audit log before releasing
            const simDetails = {
              simNumber: salesOrder.sim_inventory ? salesOrder.sim_inventory.number : 'Unknown',
              simType: salesOrder.sim_inventory && salesOrder.sim_inventory.number_type ?
                salesOrder.sim_inventory.number_type.name : 'Unknown',
              bundleName: salesOrder.bundle ? salesOrder.bundle.bundleName : 'No bundle'
            };

            await this.simInventoryDao.updateStatusByUuid(
              salesOrder.sim_inventory.uuid,
              'Available'
            );

            // Remove MSISDN and bundle_id from order
            await this.salesOrderDao.update(salesOrder.uuid, {
              msisdn_id: null,
              bundle_id: null
            });

            // Add to audit actions
            auditActions.push({
              action: 'release_inventory',
              details: `SIM Number ${simDetails.simNumber} was released due to payment failure`
            });
          }
        }

        // Add transaction failed audit action
        auditActions.push({
          action: 'transaction_failed',
          details: `Transaction failed for order ${salesOrder.orderId}`
        });

      } else if (transactionData.payment_status === 'paid') {
        // Get status mapped to PAYMENT_SUCCESSFUL event
        const successStatusId = await this.getStatusIdForEvent('PAYMENT_SUCCESSFUL');

        if (successStatusId) {
          // Get old status for audit log
          const oldOrderStatus = await this.orderStatusDao.findById(salesOrder.order_status_id);
          const oldOrderStatusName = oldOrderStatus ? oldOrderStatus.name : 'Unknown';

          // Update order status to the PAYMENT_SUCCESSFUL status
          await this.salesOrderDao.updateOrderStatus(salesOrder.uuid, successStatusId);

          // Get new status for audit log
          const newOrderStatus = await this.orderStatusDao.findById(successStatusId);

          // Add to audit actions
          auditActions.push({
            action: 'status_changed',
            previous_value: oldOrderStatusName,
            new_value: newOrderStatus.name,
            details: `Order status changed from ${oldOrderStatusName} to ${newOrderStatus.name} due to successful payment`
          });
        } else {
          // Fallback to legacy behavior
          const newOrderStatus = await this.orderStatusDao.findOneByWhere({
            name: 'New Order',
            is_deleted: false
          });

          if (newOrderStatus) {
            // Get old status for audit log
            const oldOrderStatus = await this.orderStatusDao.findById(salesOrder.order_status_id);
            const oldOrderStatusName = oldOrderStatus ? oldOrderStatus.name : 'Unknown';

            await this.salesOrderDao.updateOrderStatus(salesOrder.uuid, newOrderStatus.id);

            // Add to audit actions
            auditActions.push({
              action: 'status_changed',
              previous_value: oldOrderStatusName,
              new_value: newOrderStatus.name,
              details: `Order status changed from ${oldOrderStatusName} to ${newOrderStatus.name} due to successful payment`
            });
          }
        }

        // Add transaction successful audit action
        auditActions.push({
          action: 'transaction_successful',
          details: `Transaction successful for order ${salesOrder.orderId}`
        });
      }

      // Update transaction details
      result = await this.salesOrderDao.updateTransaction(salesOrder.uuid, updateData);

      if (!result[0]) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to update transaction details'
        );
      }

      // Add payment status change to audit actions
      if (previousPaymentStatus !== transactionData.payment_status) {
        auditActions.push({
          action: 'payment_status_changed',
          previous_value: previousPaymentStatus,
          new_value: transactionData.payment_status,
          details: `Payment status changed from ${previousPaymentStatus} to ${transactionData.payment_status}`
        });
      }

      // Create all audit logs
      for (const auditAction of auditActions) {
        await this.createAuditLog({
          sales_order_uuid: salesOrder.uuid,
          user_full_name: user ? user.full_name : 'Bot',
          user_email: user ? user.email : null,
          done_by: user ? 'user' : 'system',
          ...auditAction
        });
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Transaction details updated successfully',
        {}
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Create or update transaction details for a sales order
   * @param {String} uuid - Sales order UUID
   * @param {Object} transactionData - Transaction data
   * @param {Object} user - User performing the action (null for system actions)
   * @returns {Object} - Response object
   */
  updateTransaction = async (uuid, transactionData) => {
    try {
      const salesOrder = await this.salesOrderDao.findByUuid(uuid);

      if (!salesOrder) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Sales order not found'
        );
      }

      // Update transaction details
      const updateData = {
        total_transaction_price: transactionData.total_transaction_price,
        payment_method: transactionData.payment_method,
        transaction_ref: transactionData.transaction_ref,
        transaction_created_date: transactionData.transaction_created_date || new Date(),
        payment_status: transactionData.payment_status || 'unpaid'
      };

      let result;

      // Handle payment status changes and related event mapping
      if (transactionData.payment_status === 'payment_failed') {
        // Get status mapped to PAYMENT_FAILED event
        const failedStatusId = await this.getStatusIdForEvent('PAYMENT_FAILED');

        if (failedStatusId) {
          // Update order status to the PAYMENT_FAILED status
          await this.salesOrderDao.updateOrderStatus(uuid, failedStatusId);

          // Check if the new status is also mapped to RELEASE_INVENTORY event
          const shouldReleaseInventory = await this.isStatusMappedToEvent(failedStatusId, 'RELEASE_INVENTORY');

          // If status is mapped to RELEASE_INVENTORY or if there's a separate status for RELEASE_INVENTORY
          if (shouldReleaseInventory || await this.getStatusIdForEvent('RELEASE_INVENTORY')) {
            // If there's a MSISDN, change status back to Available
            if (salesOrder.msisdn_id) {
              await this.simInventoryDao.updateStatusByUuid(
                salesOrder.sim_inventory.uuid,
                'Available'
              );

              // Remove MSISDN and bundle_id from order
              await this.salesOrderDao.update(uuid, {
                msisdn_id: null,
                bundle_id: null
              });
            }
          }
        } else {
          // Fallback to looking for legacy status name if no event mapping exists
          let cancelledStatus = await this.orderStatusDao.findOneByWhere({
            name: 'Cancelled: Payment Failed',
            is_deleted: false
          });

          if (!cancelledStatus) {
            // Create the status
            const newStatusData = {
              uuid: uuidv4(),
              name: 'Cancelled: Payment Failed',
              is_deleted: false,
              event: 'PAYMENT_FAILED' // Automatically map to the appropriate event
            };
            cancelledStatus = await this.orderStatusDao.create(newStatusData);
          }

          // Update order status to cancelled
          await this.salesOrderDao.updateOrderStatus(uuid, cancelledStatus.id);

          // If there's a MSISDN, change status back to Available
          if (salesOrder.msisdn_id) {
            await this.simInventoryDao.updateStatusByUuid(
              salesOrder.sim_inventory.uuid,
              'Available'
            );

            // Remove MSISDN and bundle_id from order
            await this.salesOrderDao.update(uuid, {
              msisdn_id: null,
              bundle_id: null
            });
          }
        }
      } else if (transactionData.payment_status === 'paid') {
        // Get status mapped to PAYMENT_SUCCESSFUL event
        const successStatusId = await this.getStatusIdForEvent('PAYMENT_SUCCESSFUL');

        if (successStatusId) {
          // Update order status to the PAYMENT_SUCCESSFUL status
          await this.salesOrderDao.updateOrderStatus(uuid, successStatusId);
        } else {
          // Fallback to legacy behavior
          const newOrderStatus = await this.orderStatusDao.findOneByWhere({
            name: 'New Order',
            is_deleted: false
          });

          if (newOrderStatus) {
            await this.salesOrderDao.updateOrderStatus(uuid, newOrderStatus.id);
          }
        }
      }

      // Update transaction details
      result = await this.salesOrderDao.updateTransaction(uuid, updateData);

      if (!result[0]) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to update transaction details'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Transaction details updated successfully',
        {}
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Update payment status for a sales order
   * @param {String} uuid - Sales order UUID
   * @param {String} paymentStatus - New payment status
   * @param {Object} user - User performing the action (null for system actions)
   * @returns {Object} - Response object
   */
  updatePaymentStatus = async (uuid, paymentStatus, user = null) => {
    try {
      const salesOrder = await this.salesOrderDao.findByUuid(uuid);

      if (!salesOrder) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Sales order not found'
        );
      }

      // Store previous payment status for audit log
      const previousPaymentStatus = salesOrder.payment_status || 'unknown';

      // Validate payment status
      if (!['paid', 'unpaid', 'payment_failed'].includes(paymentStatus)) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Invalid payment status. Must be "paid", "unpaid", or "payment_failed"'
        );
      }

      // List to store audit actions
      const auditActions = [];

      // Handle payment status changes based on event mappings
      if (paymentStatus === 'payment_failed') {
        // Get status mapped to PAYMENT_FAILED event
        const failedStatusId = await this.getStatusIdForEvent('PAYMENT_FAILED');

        if (failedStatusId) {
          // Get old status for audit log
          const oldOrderStatus = await this.orderStatusDao.findById(salesOrder.order_status_id);
          const oldOrderStatusName = oldOrderStatus ? oldOrderStatus.name : 'Unknown';

          // Update order status to the PAYMENT_FAILED status
          await this.salesOrderDao.updateOrderStatus(uuid, failedStatusId);

          // Get new status for audit log
          const newOrderStatus = await this.orderStatusDao.findById(failedStatusId);

          // Add status change to audit actions
          auditActions.push({
            action: 'status_changed',
            previous_value: oldOrderStatusName,
            new_value: newOrderStatus.name,
            details: `Order status changed from ${oldOrderStatusName} to ${newOrderStatus.name} due to failed payment`
          });

          // Check if the new status is also mapped to RELEASE_INVENTORY event
          const shouldReleaseInventory = await this.isStatusMappedToEvent(failedStatusId, 'RELEASE_INVENTORY');

          // If status is mapped to RELEASE_INVENTORY or if there's a separate status for RELEASE_INVENTORY
          if (shouldReleaseInventory || await this.getStatusIdForEvent('RELEASE_INVENTORY')) {
            // If there's a MSISDN, change status back to Available
            if (salesOrder.msisdn_id) {
              // Gather SIM details for audit log before releasing
              const simDetails = {
                simNumber: salesOrder.sim_inventory ? salesOrder.sim_inventory.number : 'Unknown',
                simType: salesOrder.sim_inventory && salesOrder.sim_inventory.number_type ?
                  salesOrder.sim_inventory.number_type.name : 'Unknown',
                bundleName: salesOrder.bundle ? salesOrder.bundle.bundleName : 'No bundle'
              };

              await this.simInventoryDao.updateStatusByUuid(
                salesOrder.sim_inventory.uuid,
                'Available'
              );

              // Remove MSISDN and bundle_id from order
              await this.salesOrderDao.update(uuid, {
                msisdn_id: null,
                bundle_id: null
              });

              // Add inventory release to audit actions
              auditActions.push({
                action: 'release_inventory',
                details: `SIM Number ${simDetails.simNumber} was released due to payment failure`
              });
            }
          }
        } else {
          // Fallback to legacy behavior
          let cancelledStatus = await this.orderStatusDao.findOneByWhere({
            name: 'Cancelled: Payment Failed',
            is_deleted: false
          });

          if (!cancelledStatus) {
            // Create the status
            const newStatusData = {
              uuid: uuidv4(),
              name: 'Cancelled: Payment Failed',
              is_deleted: false,
              event: 'PAYMENT_FAILED' // Automatically map to the appropriate event
            };
            cancelledStatus = await this.orderStatusDao.create(newStatusData);
          }

          // Get old status for audit log
          const oldOrderStatus = await this.orderStatusDao.findById(salesOrder.order_status_id);
          const oldOrderStatusName = oldOrderStatus ? oldOrderStatus.name : 'Unknown';

          // Update order status to cancelled
          await this.salesOrderDao.updateOrderStatus(uuid, cancelledStatus.id);

          // Add status change to audit actions
          auditActions.push({
            action: 'status_changed',
            previous_value: oldOrderStatusName,
            new_value: cancelledStatus.name,
            details: `Order status changed from ${oldOrderStatusName} to ${cancelledStatus.name} due to failed payment`
          });

          // If there's a MSISDN, change status back to Available
          if (salesOrder.msisdn_id) {
            // Gather SIM details for audit log before releasing
            const simDetails = {
              simNumber: salesOrder.sim_inventory ? salesOrder.sim_inventory.number : 'Unknown',
              simType: salesOrder.sim_inventory && salesOrder.sim_inventory.number_type ?
                salesOrder.sim_inventory.number_type.name : 'Unknown',
              bundleName: salesOrder.bundle ? salesOrder.bundle.bundleName : 'No bundle'
            };

            await this.simInventoryDao.updateStatusByUuid(
              salesOrder.sim_inventory.uuid,
              'Available'
            );

            // Remove MSISDN and bundle_id from order
            await this.salesOrderDao.update(uuid, {
              msisdn_id: null,
              bundle_id: null
            });

            // Add inventory release to audit actions
            auditActions.push({
              action: 'release_inventory',
              details: `SIM Number ${simDetails.simNumber} was released due to payment failure`
            });
          }
        }

        // Add transaction failed to audit actions
        auditActions.push({
          action: 'transaction_failed',
          details: `Payment failed for order ${salesOrder.orderId}`
        });
      } else if (paymentStatus === 'paid') {
        // Get status mapped to PAYMENT_SUCCESSFUL event
        const successStatusId = await this.getStatusIdForEvent('PAYMENT_SUCCESSFUL');

        if (successStatusId) {
          // Get old status for audit log
          const oldOrderStatus = await this.orderStatusDao.findById(salesOrder.order_status_id);
          const oldOrderStatusName = oldOrderStatus ? oldOrderStatus.name : 'Unknown';

          // Update order status to the PAYMENT_SUCCESSFUL status
          await this.salesOrderDao.updateOrderStatus(uuid, successStatusId);

          // Get new status for audit log
          const newOrderStatus = await this.orderStatusDao.findById(successStatusId);

          // Add status change to audit actions
          auditActions.push({
            action: 'status_changed',
            previous_value: oldOrderStatusName,
            new_value: newOrderStatus.name,
            details: `Order status changed from ${oldOrderStatusName} to ${newOrderStatus.name} due to successful payment`
          });
        } else {
          // Fallback to legacy behavior
          const newOrderStatus = await this.orderStatusDao.findOneByWhere({
            name: 'New Order',
            is_deleted: false
          });

          if (newOrderStatus) {
            // Get old status for audit log
            const oldOrderStatus = await this.orderStatusDao.findById(salesOrder.order_status_id);
            const oldOrderStatusName = oldOrderStatus ? oldOrderStatus.name : 'Unknown';

            await this.salesOrderDao.updateOrderStatus(uuid, newOrderStatus.id);

            // Add status change to audit actions
            auditActions.push({
              action: 'status_changed',
              previous_value: oldOrderStatusName,
              new_value: newOrderStatus.name,
              details: `Order status changed from ${oldOrderStatusName} to ${newOrderStatus.name} due to successful payment`
            });
          }
        }

        // Add transaction successful to audit actions
        auditActions.push({
          action: 'transaction_successful',
          details: `Payment successful for order ${salesOrder.orderId}`
        });
      }

      const updated = await this.salesOrderDao.updatePaymentStatus(uuid, paymentStatus);

      if (!updated[0]) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to update payment status'
        );
      }

      // Add payment status change to audit actions if not already added
      if (previousPaymentStatus !== paymentStatus) {
        auditActions.push({
          action: 'payment_status_changed',
          previous_value: previousPaymentStatus,
          new_value: paymentStatus,
          details: `Payment status changed from ${previousPaymentStatus} to ${paymentStatus}`
        });
      }

      // Create all audit logs
      for (const auditAction of auditActions) {
        await this.createAuditLog({
          sales_order_uuid: uuid,
          user_full_name: user ? user.full_name : 'Bot',
          user_email: user ? user.email : null,
          done_by: user ? 'user' : 'system',
          ...auditAction
        });
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Payment status updated successfully',
        {}
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Update sales order details
   * @param {String} uuid - Sales order UUID
   * @param {Object} updateData - Data to update: customerName, personalPhone, alternatePhone, cnic, address
   * @param {Object} user - User performing the action (null for system actions)
   * @returns {Object} - Response object
   */
  updateSalesOrderDetails = async (uuid, updateData, user = null) => {
    try {
      const salesOrder = await this.salesOrderDao.findByUuid(uuid);

      if (!salesOrder) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Sales order not found'
        );
      }

      // Store original values for audit log
      const originalValues = {
        customerName: salesOrder.customerName,
        personalPhone: salesOrder.personalPhone,
        alternatePhone: salesOrder.alternatePhone,
        address: salesOrder.address
      };

      // List of fields that were changed
      const changedFields = [];

      // Encrypt CNIC if provided
      if (updateData.cnic !== undefined) {
        changedFields.push('cnic');
        updateData.cnic = updateData.cnic ? encrypt(updateData.cnic) : null;
      }

      // Check for changed fields
      if (updateData.customerName !== undefined && updateData.customerName !== salesOrder.customerName) {
        changedFields.push('customerName');
      }

      if (updateData.personalPhone !== undefined && updateData.personalPhone !== salesOrder.personalPhone) {
        changedFields.push('personalPhone');
      }

      if (updateData.alternatePhone !== undefined && updateData.alternatePhone !== salesOrder.alternatePhone) {
        changedFields.push('alternatePhone');
      }

      if (updateData.address !== undefined && updateData.address !== salesOrder.address) {
        changedFields.push('address');
      }

      // Prepare the update data
      const dataToUpdate = {
        customerName: updateData.customerName,
        personalPhone: updateData.personalPhone,
        alternatePhone: updateData.alternatePhone || null,
        address: updateData.address || null
      };

      // Only include CNIC if it was provided
      if (updateData.cnic !== undefined) {
        dataToUpdate.cnic = updateData.cnic;
      }

      const updated = await this.salesOrderDao.update(uuid, dataToUpdate);

      if (!updated[0]) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to update sales order details'
        );
      }

      // Create audit log for the update
      await this.createAuditLog({
        sales_order_uuid: uuid,
        user_full_name: user ? user.full_name : 'Bot',
        user_email: user ? user.email : null,
        done_by: user ? 'user' : 'system',
        action: 'order_details_updated',
        details: `Updated fields: ${changedFields.join(', ')}`
      });

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Sales order details updated successfully'
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Update MSISDN of a sales order
   * @param {String} uuid - Sales order UUID
   * @param {String} msisdnUuid - UUID of the new MSISDN
   * @param {String} bundleId - UUID of the bundle (optional)
   * @param {Object} user - User performing the action (null for system actions)
   * @returns {Object} - Response object
   */
  updateMsisdn = async (uuid, msisdnUuid, bundleId = null, user = null) => {
    try {
      const salesOrder = await this.salesOrderDao.findByUuid(uuid);

      if (!salesOrder) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Sales order not found'
        );
      }

      // Check if the order already has a MSISDN
      if (salesOrder.msisdn_id) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'This sales order already has a MSISDN assigned. Consider creating a new order instead.'
        );
      }

      // Validate the new MSISDN exists and is available
      const simInventory = await this.simInventoryDao.findOneByWhere({
        uuid: msisdnUuid,
        is_deleted: false
      });

      if (!simInventory) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'MSISDN not found'
        );
      }

      // Check if the MSISDN status is Available
      if (simInventory.status !== 'Available') {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          `This MSISDN is already ${simInventory.status.toLowerCase()}. Only MSISDNs with 'Available' status can be assigned.`
        );
      }

      // Check if the MSISDN is already associated with another order
      const existingOrders = await this.salesOrderDao.findByMsisdnId(simInventory.id);
      if (existingOrders && existingOrders.length > 0) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'This MSISDN is already associated with another order'
        );
      }

      // Prepare update data
      const updateData = { msisdn_id: simInventory.id };

      // Get number type for audit log
      let numberType = 'Unknown';
      if (simInventory.number_type_id) {
        const numberTypeObj = await this.numberTypeDao.findById(simInventory.number_type_id);
        if (numberTypeObj) {
          numberType = numberTypeObj.name;
        }
      }

      // Handle bundle if provided
      let bundleDetails = null;
      if (bundleId) {
        const bundle = await this.bundleDao.findByUuid(bundleId);
        if (!bundle) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'Bundle not found'
          );
        }
        updateData.bundle_id = bundle.id;
        bundleDetails = bundle;
      }

      // Check if there's a status mapped to ASSIGN_NUMBER event
      const assignNumberStatusIds = await this.eventStatusMappingService.getStatusIdsForEvent('ASSIGN_NUMBER');

      if (assignNumberStatusIds && assignNumberStatusIds.length > 0) {
        // Update order status to the first mapped status
        updateData.order_status_id = assignNumberStatusIds[0];

        // Get the status name for audit trail
        const newOrderStatus = await this.orderStatusDao.findById(assignNumberStatusIds[0]);
        const oldOrderStatus = await this.orderStatusDao.findById(salesOrder.order_status_id);

        // Add to audit log after successful update
        if (newOrderStatus) {
          // Store this for audit log
          updateData.newStatusName = newOrderStatus.name;
          updateData.oldStatusName = oldOrderStatus ? oldOrderStatus.name : 'Unknown';
        }
      }

      // Update the sales order with the new MSISDN
      const updated = await this.salesOrderDao.update(uuid, updateData);

      if (!updated[0]) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to update MSISDN'
        );
      }

      // Update the new MSISDN's status to "Sold"
      await this.simInventoryDao.updateStatusByUuid(
        msisdnUuid,
        'Sold'
      );

      // Create audit log for MSISDN assignment
      await this.createAuditLog({
        sales_order_uuid: uuid,
        user_full_name: user ? user.full_name : 'Bot',
        user_email: user ? user.email : null,
        done_by: user ? 'user' : 'system',
        action: 'sim_assigned',
        details: `SIM Number ${simInventory.number} was assigned to order ${salesOrder.orderId}`
      });

      // If bundle was provided, create an audit log for that too
      if (bundleDetails) {
        await this.createAuditLog({
          sales_order_uuid: uuid,
          user_full_name: user ? user.full_name : 'Bot',
          user_email: user ? user.email : null,
          done_by: user ? 'user' : 'system',
          action: 'bundle_selected',
          details: `Bundle ${bundleDetails.bundleName} was selected for order ${salesOrder.orderId}`
        });
      }

      // Add audit log for status change if it happened
      if (updateData.newStatusName) {
        await this.createAuditLog({
          sales_order_uuid: uuid,
          user_full_name: user ? user.full_name : 'Bot',
          user_email: user ? user.email : null,
          done_by: user ? 'user' : 'system',
          action: 'status_changed',
          previous_value: updateData.oldStatusName,
          new_value: updateData.newStatusName,
          details: `Order status changed from ${updateData.oldStatusName} to ${updateData.newStatusName} due to MSISDN assignment`
        });
      }

      // Get the updated sales order
      const updatedSalesOrder = await this.salesOrderDao.findByUuid(uuid);

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'MSISDN updated successfully',
        updatedSalesOrder
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Get sales order status info by orderId
   * @param {String} orderId - Sales order ID
   * @returns {Object} - Response object with sales order status info
   */
  getSalesOrderStatusInfo = async (orderId) => {
    try {
      const salesOrder = await this.salesOrderDao.findByOrderId(orderId);

      if (!salesOrder) {
        return responseHandler.returnError(httpStatus.NOT_FOUND, 'Sales order not found');
      }

      const orderStatus = salesOrder.order_status;
      if (!orderStatus) {
        return responseHandler.returnError(httpStatus.INTERNAL_SERVER_ERROR, 'Order status not found for this order');
      }

      const isOrderInventoryAutoReleased = await this.isStatusMappedToEvent(
        orderStatus.id,
        'AUTO_RELEASE_INVENTORY'
      );

      const response = {
        currentStatus: orderStatus.name,
        isOrderInventoryAutoReleased,
      };

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Sales order status info retrieved successfully',
        response
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
    }
  };
}

module.exports = SalesOrderService; 
