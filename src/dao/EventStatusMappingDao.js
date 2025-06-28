const SuperDao = require('./SuperDao');
const { v4: uuidv4 } = require('uuid');
const models = require('../models');
const { Op } = require('sequelize');

const EventStatusMapping = models.event_status_mapping;
const OrderStatus = models.order_status;

class EventStatusMappingDao extends SuperDao {
  constructor() {
    super(EventStatusMapping);
  }

  /**
   * Find all statuses mapped to a specific event
   * @param {String} event - The event to find mappings for
   * @returns {Promise<Array>} - Array of status mappings
   */
  async findStatusesByEvent(event) {
    return EventStatusMapping.findAll({
      where: {
        event,
        is_deleted: false
      },
      include: [
        {
          model: OrderStatus,
          as: 'order_status',
          attributes: ['id', 'uuid', 'name'],
          where: { is_deleted: false }
        }
      ]
    });
  }

  /**
   * Find all events that a status is mapped to
   * @param {Number} statusId - Order status ID
   * @returns {Promise<Array>} - Array of events
   */
  async findEventsByStatusId(statusId) {
    return EventStatusMapping.findAll({
      where: {
        order_status_id: statusId,
        is_deleted: false
      },
      attributes: ['id', 'uuid', 'event']
    });
  }

  /**
   * Check if a status is mapped to a specific event
   * @param {Number} statusId - Order status ID
   * @param {String} event - Event name
   * @returns {Promise<Boolean>} - True if the mapping exists
   */
  async isStatusMappedToEvent(statusId, event) {
    const count = await EventStatusMapping.count({
      where: {
        order_status_id: statusId,
        event,
        is_deleted: false
      }
    });
    return count > 0;
  }

  /**
   * Create a new mapping between an event and a status
   * @param {String} event - Event name
   * @param {Number} statusId - Order status ID
   * @returns {Promise<Object>} - Created mapping
   */
  async createMapping(event, statusId) {
    return EventStatusMapping.create({
      uuid: uuidv4(),
      event,
      order_status_id: statusId,
      is_deleted: false
    });
  }

  /**
   * Remove a mapping between an event and a status
   * @param {String} event - Event name
   * @param {Number} statusId - Order status ID
   * @returns {Promise<Number>} - Number of deleted mappings
   */
  async removeMapping(event, statusId) {
    return EventStatusMapping.update(
      { is_deleted: true, deleted_at: new Date() },
      {
        where: {
          event,
          order_status_id: statusId,
          is_deleted: false
        }
      }
    );
  }

  /**
   * Update mappings for an event - adds new mappings and removes old ones
   * @param {String} event - Event name
   * @param {Array<Number>} statusIds - Array of status IDs to map to the event
   * @returns {Promise<Object>} - Result with added and removed counts
   */
  async updateEventMappings(event, statusIds) {
    // Get existing mappings for this event
    const existingMappings = await this.findStatusesByEvent(event);
    const existingStatusIds = existingMappings.map(mapping => mapping.order_status_id);

    // Find which mappings to add and which to remove
    const statusIdsToAdd = statusIds.filter(id => !existingStatusIds.includes(id));
    const statusIdsToRemove = existingStatusIds.filter(id => !statusIds.includes(id));

    // Add new mappings
    const addPromises = statusIdsToAdd.map(statusId => this.createMapping(event, statusId));

    // Remove old mappings
    const removePromises = statusIdsToRemove.map(statusId => this.removeMapping(event, statusId));

    // Wait for all operations to complete
    await Promise.all([...addPromises, ...removePromises]);

    return {
      added: statusIdsToAdd.length,
      removed: statusIdsToRemove.length
    };
  }

  /**
   * Get all events with their mapped statuses
   * @returns {Promise<Object>} - Object with events as keys and arrays of status objects as values
   */
  async getAllEventMappings() {
    const allMappings = await EventStatusMapping.findAll({
      where: { is_deleted: false },
      include: [
        {
          model: OrderStatus,
          as: 'order_status',
          attributes: ['id', 'uuid', 'name'],
          where: { is_deleted: false }
        }
      ]
    });

    // Organize mappings by event
    const eventMappings = {};
    const events = [
      'ORDER_CREATION',
      'PAYMENT_SUCCESSFUL',
      'PAYMENT_FAILED',
      'RELEASE_INVENTORY',
      'CANCELED',
      'ORDER_COMPLETED',
      'ASSIGN_NUMBER',
      'AUTO_RELEASE_INVENTORY',
    ];

    // Initialize all events with empty arrays
    events.forEach(event => {
      eventMappings[event] = [];
    });

    // Add mappings to appropriate events
    allMappings.forEach(mapping => {
      const event = mapping.event;
      const status = mapping.order_status;
      if (status) {
        eventMappings[event].push({
          id: status.id,
          uuid: status.uuid,
          name: status.name
        });
      }
    });

    return eventMappings;
  }
}

module.exports = EventStatusMappingDao; 
