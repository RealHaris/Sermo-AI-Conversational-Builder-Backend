const httpStatus = require('http-status');
const EventStatusMappingService = require('../service/EventStatusMappingService');
const logger = require('../config/logger');

class EventStatusMappingController {
  constructor() {
    this.eventStatusMappingService = new EventStatusMappingService();
  }

  /**
   * Get all event mappings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getAllEventMappings = async (req, res) => {
    try {
      const result = await this.eventStatusMappingService.getAllEventMappings();
      res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error('Error in getAllEventMappings controller:', e);
      res.status(httpStatus.BAD_REQUEST).send({
        status: false,
        statusCode: httpStatus.BAD_REQUEST,
        message: 'Error retrieving event mappings',
        data: null
      });
    }
  };

  /**
   * Get all statuses for a specific event
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getStatusesByEvent = async (req, res) => {
    try {
      const { event } = req.params;
      const result = await this.eventStatusMappingService.getStatusesByEvent(event);
      res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error(`Error in getStatusesByEvent controller for event ${req.params.event}:`, e);
      res.status(httpStatus.BAD_REQUEST).send({
        status: false,
        statusCode: httpStatus.BAD_REQUEST,
        message: 'Error retrieving statuses for event',
        data: null
      });
    }
  };

  /**
   * Update mappings for an event (bulk update)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  updateEventMappings = async (req, res) => {
    try {
      const { event } = req.params;
      const { statusUuids } = req.body;

      if (!Array.isArray(statusUuids)) {
        return res.status(httpStatus.BAD_REQUEST).send({
          status: false,
          statusCode: httpStatus.BAD_REQUEST,
          message: 'statusUuids must be an array of status UUIDs',
          data: null
        });
      }

      const result = await this.eventStatusMappingService.updateEventMappings(event, statusUuids);
      res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error(`Error in updateEventMappings controller for event ${req.params.event}:`, e);
      res.status(httpStatus.BAD_REQUEST).send({
        status: false,
        statusCode: httpStatus.BAD_REQUEST,
        message: 'Error updating event mappings',
        data: null
      });
    }
  };
}

module.exports = EventStatusMappingController; 
