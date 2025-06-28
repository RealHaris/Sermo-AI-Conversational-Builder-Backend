const httpStatus = require('http-status');
const EventStatusMappingDao = require('../dao/EventStatusMappingDao');
const OrderStatusDao = require('../dao/OrderStatusDao');
const responseHandler = require('../helper/responseHandler');
const logger = require('../config/logger');

class EventStatusMappingService {
  constructor() {
    this.eventStatusMappingDao = new EventStatusMappingDao();
    this.orderStatusDao = new OrderStatusDao();
  }

  /**
   * Get all status mappings for all events
   * @returns {Object} - Response with mappings
   */
  getAllEventMappings = async () => {
    try {
      const mappings = await this.eventStatusMappingDao.getAllEventMappings();

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Event mappings retrieved successfully',
        mappings
      );
    } catch (e) {
      logger.error('Error getting all event mappings:', e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Get all statuses mapped to a specific event
   * @param {String} event - Event name
   * @returns {Object} - Response with status mappings
   */
  getStatusesByEvent = async (event) => {
    try {
      const mappings = await this.eventStatusMappingDao.findStatusesByEvent(event);

      // Extract the status objects
      const statuses = mappings.map(mapping => ({
        id: mapping.order_status.id,
        uuid: mapping.order_status.uuid,
        name: mapping.order_status.name
      }));

      return responseHandler.returnSuccess(
        httpStatus.OK,
        `Statuses for event ${event} retrieved successfully`,
        statuses
      );
    } catch (e) {
      logger.error(`Error getting statuses for event ${event}:`, e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Update status mappings for an event (bulk update)
   * @param {String} event - Event name
   * @param {Array<String>} statusUuids - Array of status UUIDs to map to the event
   * @returns {Object} - Response with results
   */
  updateEventMappings = async (event, statusUuids) => {
    try {
      // Validate the event
      const validEvents = [
        'ORDER_CREATION',
        'PAYMENT_SUCCESSFUL',
        'PAYMENT_FAILED',
        'RELEASE_INVENTORY',
        'CANCELED',
        'ORDER_COMPLETED',
        'ASSIGN_NUMBER',
        'AUTO_RELEASE_INVENTORY',
      ];

      if (!validEvents.includes(event)) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          `Invalid event. Must be one of: ${validEvents.join(', ')}`
        );
      }

      // Convert status UUIDs to IDs
      const statusIds = [];
      for (const uuid of statusUuids) {
        const status = await this.orderStatusDao.findByUuid(uuid);
        if (!status) {
          return responseHandler.returnError(
            httpStatus.NOT_FOUND,
            `Order status with UUID ${uuid} not found`
          );
        }
        statusIds.push(status.id);
      }

      // Update the mappings
      const result = await this.eventStatusMappingDao.updateEventMappings(event, statusIds);

      return responseHandler.returnSuccess(
        httpStatus.OK,
        `Mappings for event ${event} updated successfully. Added: ${result.added}, Removed: ${result.removed}`,
        result
      );
    } catch (e) {
      logger.error(`Error updating mappings for event ${event}:`, e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Check if a status is mapped to a specific event
   * @param {Number} statusId - Status ID
   * @param {String} event - Event name
   * @returns {Promise<Boolean>} - True if status is mapped to event
   */
  isStatusMappedToEvent = async (statusId, event) => {
    try {
      return await this.eventStatusMappingDao.isStatusMappedToEvent(statusId, event);
    } catch (e) {
      logger.error(`Error checking if status ${statusId} is mapped to event ${event}:`, e);
      return false;
    }
  };

  /**
   * Get status IDs for a specific event
   * @param {String} event - Event name
   * @returns {Promise<Array<Number>>} - Array of status IDs
   */
  getStatusIdsForEvent = async (event) => {
    try {
      const mappings = await this.eventStatusMappingDao.findStatusesByEvent(event);
      return mappings.map(mapping => mapping.order_status.id);
    } catch (e) {
      logger.error(`Error getting status IDs for event ${event}:`, e);
      return [];
    }
  };

  /**
   * Get the first status ID mapped to a specific event
   * @param {String} event - Event name
   * @returns {Promise<Number|null>} - First status ID or null if none found
   */
  getFirstStatusIdForEvent = async (event) => {
    try {
      const mappings = await this.eventStatusMappingDao.findStatusesByEvent(event);
      if (mappings && mappings.length > 0 && mappings[0].order_status) {
        return mappings[0].order_status.id;
      }
      return null;
    } catch (e) {
      logger.error(`Error getting first status ID for event ${event}:`, e);
      return null;
    }
  };
}

module.exports = EventStatusMappingService;
