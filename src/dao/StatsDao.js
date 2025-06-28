const { Op, fn, col, literal } = require('sequelize');
const models = require('../models');
const SalesOrder = models.sales_order;
const SimInventory = models.sim_inventory;
const NumberType = models.number_type;
const Bundle = models.bundle;
const City = models.city;
const Region = models.region;
const OrderStatus = models.order_status;

class StatsDao {
  // Total number of sales orders
  async getTotalOrders() {
    return SalesOrder.count({ where: { is_deleted: false } });
  }

  // Total number of paid sales orders
  async getTotalPaidOrders() {
    return SalesOrder.count({
      where: {
        is_deleted: false,
        payment_status: 'paid'
      }
    });
  }

  // Orders grouped by status
  async getOrdersCountByStatus() {
    return SalesOrder.findAll({
      where: { is_deleted: false },
      attributes: [
        [col('order_status.name'), 'status'],
        [fn('COUNT', col('sales_order.id')), 'count']
      ],
      include: [{ model: OrderStatus, as: 'order_status', attributes: [] }],
      group: ['order_status.name']
    });
  }


  // Orders grouped by city and status
  async getOrdersCountByStatusAndCity() {
    return SalesOrder.findAll({
      where: { is_deleted: false },
      attributes: [
        [col('city.name'), 'city'],
        [col('order_status.name'), 'status'],
        [fn('COUNT', col('sales_order.id')), 'count']
      ],
      include: [
        {
          model: City,
          as: 'city',
          attributes: [],
          where: { is_deleted: false, status: true } // Only include active cities
        },
        { model: OrderStatus, as: 'order_status', attributes: [] }
      ],
      group: ['city.name', 'order_status.name'],
      order: [[fn('COUNT', col('sales_order.id')), 'DESC']],
      raw: true // Add this to return plain objects instead of Sequelize instances
    });
  }

  // Total SIM inventory
  async getTotalSimInventory() {
    return SimInventory.count({ where: { is_deleted: false } });
  }

  // Count SIMs by status (Available or Sold)
  async getSimCountByStatus(status) {
    return SimInventory.count({ where: { is_deleted: false, status } });
  }

  // Inventory counts grouped by number type
  async getInventoryCountByNumberType() {
    return SimInventory.findAll({
      where: { is_deleted: false },
      attributes: [
        [col('number_type.name'), 'numberType'],
        [fn('COUNT', col('sim_inventory.id')), 'count']
      ],
      include: [{ model: NumberType, as: 'number_type', attributes: [] }],
      group: ['number_type.name']
    });
  }

  // SIM sales (sold) grouped by number type
  async getSimCountByNumberTypeAndStatus(status) {
    return SimInventory.findAll({
      where: { is_deleted: false, status },
      attributes: [
        [col('number_type.name'), 'numberType'],
        [fn('COUNT', col('sim_inventory.id')), 'count']
      ],
      include: [{ model: NumberType, as: 'number_type', attributes: [] }],
      group: ['number_type.name']
    });
  }

  // SIM sales grouped by region and number type
  async getSimSoldCountByRegionAndType() {
    return SimInventory.findAll({
      where: { is_deleted: false, status: 'Sold' },
      attributes: [
        [col('city->region.name'), 'region'],
        [col('number_type.name'), 'numberType'],
        [fn('COUNT', col('sim_inventory.id')), 'count']
      ],
      include: [
        {
          model: City,
          as: 'city',
          attributes: [],
          where: { is_deleted: false, status: true }, // Only include active cities
          include: [{ model: Region, as: 'region', attributes: [] }]
        },
        { model: NumberType, as: 'number_type', attributes: [] }
      ],
      group: ['city->region.name', 'number_type.name'],
      order: [[fn('COUNT', col('sim_inventory.id')), 'DESC']]
    });
  }


  // SIM sales over time by date and number type
  async getSimSalesByDateRange(startDate, endDate) {
    return SalesOrder.findAll({
      where: {
        is_deleted: false,
        msisdn_id: { [Op.not]: null },
        created_date: { [Op.between]: [startDate, endDate] }
      },
      attributes: [
        [fn('DATE', col('created_date')), 'date'],
        [col('sim_inventory->number_type.name'), 'numberType'],
        [fn('COUNT', col('sales_order.id')), 'count']
      ],
      include: [
        {
          model: SimInventory,
          as: 'sim_inventory',
          attributes: [],
          include: [{ model: NumberType, as: 'number_type', attributes: [] }]
        }
      ],
      group: [fn('DATE', col('created_date')), 'sim_inventory->number_type.name'],
      order: [[fn('DATE', col('created_date')), 'ASC']]
    });
  }

  // Bundle sales over time by date and bundle type/name
  async getBundleSalesByDateRange(startDate, endDate) {
    return SalesOrder.findAll({
      where: {
        is_deleted: false,
        bundle_id: { [Op.not]: null },
        created_date: { [Op.between]: [startDate, endDate] }
      },
      attributes: [
        [fn('DATE', col('created_date')), 'date'],
        [col('bundle.bundle_name'), 'bundleName'],
        [fn('COUNT', col('sales_order.id')), 'count']
      ],
      include: [{ model: Bundle, as: 'bundle', attributes: [] }],
      group: [fn('DATE', col('created_date')), col('bundle.bundle_name')],
      order: [[fn('DATE', col('created_date')), 'ASC']]
    });
  }

  // Most used number type (by sold count)
  async getMostUsedNumberType() {
    const result = await SimInventory.findAll({
      where: { is_deleted: false, status: 'Sold' },
      attributes: [
        [col('number_type.name'), 'numberType'],
        [fn('COUNT', col('sim_inventory.id')), 'count']
      ],
      include: [{ model: NumberType, as: 'number_type', attributes: [] }],
      group: ['number_type.name'],
      order: [[literal('count'), 'DESC']],
      limit: 1
    });
    return result[0] || null;
  }


  // Add this function to StatsDao class
  async getSimSoldCountByCityAndType() {
    // We need to join through sales_order to get to city since SimInventory doesn't 
    // directly have city_id (based on what I can see in your schema)
    return SalesOrder.findAll({
      where: {
        is_deleted: false,
        msisdn_id: { [Op.not]: null } // Ensure SIM is linked
      },
      attributes: [
        [col('city.name'), 'city'],
        [col('sim_inventory->number_type.name'), 'numberType'],
        [fn('COUNT', col('sales_order.id')), 'count']
      ],
      include: [
        {
          model: City,
          as: 'city',
          attributes: [],
          where: { is_deleted: false, status: true } // Only include active cities
        },
        {
          model: SimInventory,
          as: 'sim_inventory',
          attributes: [],
          where: {
            status: 'Sold',
            is_deleted: false
          },
          include: [
            {
              model: NumberType,
              as: 'number_type',
              attributes: []
            }
          ]
        }
      ],
      group: ['city.name', 'sim_inventory->number_type.name'],
      order: [[fn('COUNT', col('sales_order.id')), 'DESC']], // Sort by count descending
      raw: true
    });
  }
  // Most used bundle (by order count)
  async getMostUsedBundle() {
    const result = await SalesOrder.findAll({
      where: { is_deleted: false, bundle_id: { [Op.not]: null } },
      attributes: [
        [col('bundle.bundle_name'), 'bundleName'],
        [fn('COUNT', col('sales_order.id')), 'count']
      ],
      include: [{ model: Bundle, as: 'bundle', attributes: [] }],
      group: [col('bundle.bundle_name')],
      order: [[literal('count'), 'DESC']],
      limit: 1
    });
    return result[0] || null;
  }

  // Get aggregated revenue stats by status IDs
  async getRevenueStatsByStatusIds(orderStatusIds) {
    return SalesOrder.findOne({
      where: {
        is_deleted: false,
        order_status_id: { [Op.in]: orderStatusIds }
      },
      attributes: [
        [fn('COUNT', col('sales_order.id')), 'successfulOrdersCount'],
        [fn('SUM', col('sim_inventory.final_sim_price')), 'simSalesRevenue'],
        [fn('SUM', col('bundle.bundle_final_price')), 'bundleRevenue']
      ],
      include: [
        {
          model: SimInventory,
          as: 'sim_inventory',
          attributes: [],
          required: false
        },
        {
          model: Bundle,
          as: 'bundle',
          attributes: [],
          required: false
        }
      ],
      raw: true
    });
  }

  // Get aggregated revenue stats by payment status
  async getRevenueStatsByPaymentStatus(paymentStatus = 'paid') {
    return SalesOrder.findOne({
      where: {
        is_deleted: false,
        payment_status: paymentStatus
      },
      attributes: [
        [fn('COUNT', col('sales_order.id')), 'successfulOrdersCount'],
        [fn('SUM', col('sim_inventory.final_sim_price')), 'simSalesRevenue'],
        [fn('SUM', col('bundle.bundle_final_price')), 'bundleRevenue']
      ],
      include: [
        {
          model: SimInventory,
          as: 'sim_inventory',
          attributes: [],
          required: false
        },
        {
          model: Bundle,
          as: 'bundle',
          attributes: [],
          required: false
        }
      ],
      raw: true
    });
  }
}

module.exports = new StatsDao(); 
