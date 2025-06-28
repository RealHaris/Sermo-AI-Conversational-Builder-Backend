const httpStatus = require('http-status');
const { v4: uuidv4 } = require('uuid');
const OrderStatusDao = require('../dao/OrderStatusDao');
const responseHandler = require('../helper/responseHandler');
const logger = require('../config/logger');

class OrderStatusService {
  constructor() {
    this.orderStatusDao = new OrderStatusDao();
  }

  /**
   * Create an order status
   * @param {Object} data
   * @returns {Object}
   */
  createOrderStatus = async (data) => {
    try {
      if (await this.orderStatusDao.isNameExists(data.name)) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Name already exists'
        );
      }

      const uuid = uuidv4();
      data.uuid = uuid;

      const orderStatus = await this.orderStatusDao.create(data);

      if (!orderStatus) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to create order status'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.CREATED,
        'Order status created successfully',
        orderStatus
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
   * Get all order statuses
   * @param {Object} query - Query parameters for filtering and pagination
   * @returns {Object}
   */
  getOrderStatuses = async (query) => {
    try {
      const orderStatuses = await this.orderStatusDao.findAll(query);
      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Order statuses retrieved successfully',
        orderStatuses
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
   * Get order status by ID
   * @param {String} id - Order status's UUID
   * @returns {Object}
   */
  getOrderStatusById = async (id) => {
    try {
      const orderStatus = await this.orderStatusDao.findOneByWhere({ uuid: id });

      if (!orderStatus) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Order status not found'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Order status retrieved successfully',
        orderStatus
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
   * Get order status by event
   * @param {String} event - Event name
   * @returns {Object}
   */
  getOrderStatusByEvent = async (event) => {
    try {
      const orderStatus = await this.orderStatusDao.findByEvent(event);

      if (!orderStatus) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          `No order status mapped to event ${event}`
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Order status retrieved successfully',
        orderStatus
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
   * Update order status
   * @param {String} id - Order status's UUID
   * @param {Object} updateBody - Data to update
   * @returns {Object}
   */
  updateOrderStatus = async (id, updateBody) => {
    try {
      const orderStatus = await this.orderStatusDao.findOneByWhere({ uuid: id });

      if (!orderStatus) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Order status not found'
        );
      }

      // If trying to update name, check if the new name already exists
      if (updateBody.name && updateBody.name !== orderStatus.name) {
        if (await this.orderStatusDao.isNameExists(updateBody.name)) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'Name already exists'
          );
        }
      }

      // If updating event mapping, handle it appropriately
      if (updateBody.event !== undefined && updateBody.event !== orderStatus.event) {
        // If assigning a new event, check if it's already assigned
        if (updateBody.event) {
          const existingStatus = await this.orderStatusDao.findByEvent(updateBody.event);
          if (existingStatus && existingStatus.uuid !== id) {
            return responseHandler.returnError(
              httpStatus.BAD_REQUEST,
              `Event ${updateBody.event} is already mapped to status '${existingStatus.name}'`
            );
          }
        }
      }

      const updatedOrderStatus = await this.orderStatusDao.updateWhere(
        updateBody,
        { uuid: id }
      );

      if (!updatedOrderStatus) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to update order status'
        );
      }

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
   * Update event mapping for a status
   * @param {String} id - Order status's UUID
   * @param {String} event - Event to map
   * @returns {Object}
   */
  updateEventMapping = async (id, event) => {
    try {
      const orderStatus = await this.orderStatusDao.findOneByWhere({ uuid: id });

      if (!orderStatus) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Order status not found'
        );
      }

      // Check if this event is already mapped to another status
      const existingStatus = await this.orderStatusDao.findByEvent(event);
      if (existingStatus && existingStatus.uuid !== id) {
        // If we're updating the mapping, first remove the old mapping
        await this.orderStatusDao.updateEventMapping(existingStatus.uuid, null);
      }

      const updated = await this.orderStatusDao.updateEventMapping(id, event);

      if (!updated[0]) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to update event mapping'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        `Status '${orderStatus.name}' is now mapped to event ${event}`,
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
   * Delete order status
   * @param {String} id - Order status's UUID
   * @returns {Object}
   */
  deleteOrderStatus = async (id) => {
    try {
      const orderStatus = await this.orderStatusDao.findOneByWhere({ uuid: id });

      if (!orderStatus) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Order status not found'
        );
      }

      const deleted = await this.orderStatusDao.deleteWhere({ uuid: id });

      if (!deleted) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to delete order status'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Order status deleted successfully',
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
   * Get status ID for a specific event
   * @param {String} event - Event name
   * @returns {Number|null} - Status ID or null if not found
   */
  getStatusIdForEvent = async (event) => {
    try {
      const status = await this.orderStatusDao.findByEvent(event);
      return status ? status.id : null;
    } catch (e) {
      logger.error(`Error getting status for event ${event}:`, e);
      return null;
    }
  };
}

module.exports = OrderStatusService; 
