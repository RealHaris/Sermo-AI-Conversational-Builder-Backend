const httpStatus = require('http-status');
const SalesOrderService = require('../service/SalesOrderService');
const logger = require('../config/logger');
const path = require('path');

class SalesOrderController {
  constructor() {
    this.salesOrderService = new SalesOrderService();
  }

  /**
   * Create a new sales order
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  createSalesOrder = async (req, res) => {
    try {
      const salesOrder = await this.salesOrderService.createSalesOrder(req.body, req.user);
      res.status(salesOrder.statusCode).send(salesOrder.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Get all sales orders with pagination and filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getSalesOrders = async (req, res) => {
    try {
      const salesOrders = await this.salesOrderService.getSalesOrders(
        req.query,
        req.dataAccessFilters
      );
      res.status(salesOrders.statusCode).send(salesOrders.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Get all sales orders without pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getAllSalesOrders = async (req, res) => {
    try {
      const salesOrders = await this.salesOrderService.getAllSalesOrders(req.dataAccessFilters);
      res.status(salesOrders.statusCode).send(salesOrders.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Export all sales orders to CSV
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  exportSalesOrdersToCSV = async (req, res) => {
    try {
      const result = await this.salesOrderService.exportSalesOrdersToCSV();

      if (result.statusCode === httpStatus.OK) {
        // Send the file path to download
        const downloadUrl = result.response.data.downloadUrl;
        const filePath = path.join(process.env.PWD, 'public', downloadUrl);
        res.status(httpStatus.OK).json(result.response);
      } else {
        res.status(result.statusCode).json(result.response);
      }
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Get a sales order by UUID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getSalesOrderByUuid = async (req, res) => {
    try {
      const salesOrder = await this.salesOrderService.getSalesOrderByUuid(req.params.uuid);
      res.status(salesOrder.statusCode).send(salesOrder.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Get sales order status info by orderId
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getSalesOrderStatusInfo = async (req, res) => {
    try {
      const result = await this.salesOrderService.getSalesOrderStatusInfo(req.params.orderId);
      res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Update CNIC of a sales order
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  updateCnic = async (req, res) => {
    try {
      const result = await this.salesOrderService.updateCnic(
        req.params.uuid,
        req.body.cnic,
        req.user
      );
      res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Update notes of a sales order
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  updateNotes = async (req, res) => {
    try {
      const result = await this.salesOrderService.updateNotes(
        req.params.uuid,
        req.body.notes,
        req.user
      );
      res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Update order status of a sales order
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  updateOrderStatus = async (req, res) => {
    try {
      const result = await this.salesOrderService.updateOrderStatus(
        req.params.uuid,
        req.body.orderStatusUuid,
        req.user
      );
      res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Update city of a sales order
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  updateCity = async (req, res) => {
    try {
      const result = await this.salesOrderService.updateCity(
        req.params.uuid,
        req.body.city_uuid,
        req.user
      );
      res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Delete a sales order
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  deleteSalesOrder = async (req, res) => {
    try {
      const result = await this.salesOrderService.deleteSalesOrder(
        req.params.uuid,
        req.user
      );
      res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Create an order through external API
   * @param {Object} req 
   * @param {Object} res 
   * @returns {Promise<Object>}
   */
  createExternalOrder = async (req, res) => {
    try {
      const result = await this.salesOrderService.createExternalOrder(
        req.body,
        null // External API calls are system actions
      );
      res.status(result.statusCode).json(result.response);
    } catch (error) {
      logger.error(error);
      res.status(httpStatus.BAD_GATEWAY).json({
        status: false,
        statusCode: httpStatus.BAD_GATEWAY,
        message: 'Something went wrong',
        data: null
      });
    }
  };

  /**
   * Update transaction details for a sales order
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  updateTransaction = async (req, res) => {
    try {
      const result = await this.salesOrderService.updateTransaction(
        req.params.uuid,
        req.body,
        req.user
      );
      res.status(result.statusCode).json(result.response);
    } catch (error) {
      logger.error(error);
      res.status(httpStatus.BAD_REQUEST).json({
        status: false,
        statusCode: httpStatus.BAD_REQUEST,
        message: 'Something went wrong while updating transaction',
        data: null
      });
    }
  };

  /**
   * Update transaction details for a sales order using orderId or UUID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  updateTransactionByIdentifier = async (req, res) => {
    try {
      // Extract the identifiers from query parameters
      const identifier = {
        orderId: req.query.orderId || null,
        uuid: req.query.uuid || null
      };

      // Check if at least one identifier is provided
      if (!identifier.orderId && !identifier.uuid) {
        return res.status(httpStatus.BAD_REQUEST).json({
          status: false,
          statusCode: httpStatus.BAD_REQUEST,
          message: 'Either orderId or uuid must be provided',
          data: null
        });
      }

      // Priority is given to UUID first, and if not found, it will try orderId
      // This is handled in the service layer
      const result = await this.salesOrderService.updateTransactionByIdentifier(
        identifier,
        req.body,
        req.path.startsWith('/external/') ? null : req.user // External API calls are system actions
      );
      res.status(result.statusCode).json(result.response);
    } catch (error) {
      logger.error(error);
      res.status(httpStatus.BAD_REQUEST).json({
        status: false,
        statusCode: httpStatus.BAD_REQUEST,
        message: 'Something went wrong while updating transaction',
        data: null
      });
    }
  };

  /**
   * Update payment status for a sales order
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  updatePaymentStatus = async (req, res) => {
    try {
      const result = await this.salesOrderService.updatePaymentStatus(
        req.params.uuid,
        req.body.payment_status,
        req.path.startsWith('/external/') ? null : req.user // External API calls are system actions
      );
      res.status(result.statusCode).json(result.response);
    } catch (error) {
      logger.error(error);
      res.status(httpStatus.BAD_REQUEST).json({
        status: false,
        statusCode: httpStatus.BAD_REQUEST,
        message: 'Something went wrong while updating payment status',
        data: null
      });
    }
  };

  /**
   * Update sales order details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  updateSalesOrderDetails = async (req, res) => {
    try {
      const result = await this.salesOrderService.updateSalesOrderDetails(
        req.params.uuid,
        req.body,
        req.user
      );
      res.status(result.statusCode).json(result.response);
    } catch (error) {
      logger.error(error);
      res.status(httpStatus.BAD_REQUEST).json({
        status: false,
        statusCode: httpStatus.BAD_REQUEST,
        message: 'Something went wrong while updating sales order details',
        data: null
      });
    }
  };

  /**
   * Update MSISDN of a sales order
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  updateMsisdn = async (req, res) => {
    try {
      const result = await this.salesOrderService.updateMsisdn(
        req.params.uuid,
        req.body.msisdn_uuid,
        req.body.bundle_id,
        req.user
      );
      res.status(result.statusCode).json(result.response);
    } catch (error) {
      logger.error(error);
      res.status(httpStatus.BAD_REQUEST).json({
        status: false,
        statusCode: httpStatus.BAD_REQUEST,
        message: 'Something went wrong while updating MSISDN',
        data: null
      });
    }
  };
}

module.exports = SalesOrderController; 
