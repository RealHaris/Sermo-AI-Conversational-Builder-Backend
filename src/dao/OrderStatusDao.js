const SuperDao = require('./SuperDao');
const models = require('../models');
const { Op } = require('sequelize');

const OrderStatus = models.order_status;

class OrderStatusDao extends SuperDao {
  constructor() {
    super(OrderStatus);
  }

  async isNameExists(name) {
    return OrderStatus.count({ where: { name, is_deleted: false } }).then((count) => {
      if (count != 0) {
        return true;
      }
      return false;
    });
  }

  async findAll(query = {}) {
    const { limit, offset, ...filter } = query;
    return OrderStatus.findAndCountAll({
      where: { ...filter, is_deleted: false },
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      order: [['createdAt', 'DESC']]
    });
  }

  async findByUuid(uuid) {
    return OrderStatus.findOne({
      where: { uuid: uuid, is_deleted: false }
    });
  }

  async findByEvent(event) {
    return OrderStatus.findOne({
      where: { event, is_deleted: false }
    });
  }

  async updateEventMapping(uuid, event) {
    // If we're mapping a new event, first clear it from any existing status
    if (event) {
      await OrderStatus.update(
        { event: null },
        { where: { event, is_deleted: false, uuid: { [Op.ne]: uuid } } }
      );
    }

    // Then update the current status with the new event
    return OrderStatus.update(
      { event },
      { where: { uuid, is_deleted: false } }
    );
  }

  async deleteWhere(where) {
    return this.deleteByWhere(where);
  }
}

module.exports = OrderStatusDao; 
