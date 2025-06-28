const httpStatus = require('http-status');
const logger = require('../config/logger');
const StatsDao = require('../dao/StatsDao');
const OrderStatusDao = require('../dao/OrderStatusDao');
const EventStatusMappingService = require('./EventStatusMappingService');
const models = require('../models');

class StatsService {
  constructor() {
    this.statsDao = StatsDao;
    this.orderStatusDao = new OrderStatusDao();
    this.eventStatusMappingService = new EventStatusMappingService();
  }

  /**
   * Find order statuses mapped to specific events
   * @param {String} event - Event name to look for
   * @returns {Promise<Array>} - Array of status IDs mapped to the event
   */
  async findStatusIdsByEvent(event) {
    try {
      return await this.eventStatusMappingService.getStatusIdsForEvent(event);
    } catch (error) {
      logger.error(`Error finding statuses for event ${event}:`, error);
      return [];
    }
  }

  /**
   * Find order status names mapped to specific events
   * @param {String} event - Event name to look for
   * @returns {Promise<Array>} - Array of status names mapped to the event
   */
  async findStatusNamesByEvent(event) {
    try {
      const result = await this.eventStatusMappingService.getStatusesByEvent(event);
      // If success, extract status names from the data array
      if (result.statusCode === httpStatus.OK && result.response.status) {
        return result.response.data.map(status => status.name);
      }
      return [];
    } catch (error) {
      logger.error(`Error finding status names for event ${event}:`, error);
      return [];
    }
  }

  async getStatsInfo() {
    try {
      logger.info('StatsService.getStatsInfo called');
      const totalOrders = await this.statsDao.getTotalOrders();
      const totalPaidOrders = await this.statsDao.getTotalPaidOrders();
      const statusCounts = await this.statsDao.getOrdersCountByStatus();

      // Get status IDs mapped to CANCELED and ORDER_COMPLETED events
      const completedStatusIds = await this.findStatusIdsByEvent('ORDER_COMPLETED');
      const canceledStatusIds = await this.findStatusIdsByEvent('CANCELED');

      // Calculate delivered and canceled counts
      let deliveredCount = 0;
      let canceledCount = 0;

      // Process each status count
      for (const statusCount of statusCounts) {
        const statusName = statusCount.get('status');
        const count = parseInt(statusCount.get('count') || 0);

        // Find the status by name to get its ID
        const statusObj = await this.orderStatusDao.findOneByWhere({ name: statusName });

        if (statusObj) {
          // Check if this status is mapped to any event
          if (completedStatusIds.includes(statusObj.id)) {
            deliveredCount += count;
          } else if (canceledStatusIds.includes(statusObj.id)) {
            canceledCount += count;
          }
          // Fallback to legacy status names
          else if (statusName === 'Completed') {
            deliveredCount += count;
          }
          else if (statusName.toLowerCase().includes('cancel')) {
            canceledCount += count;
          }
        }
      }

      const totalSimInventory = await this.statsDao.getTotalSimInventory();
      const totalSimsSold = await this.statsDao.getSimCountByStatus('Sold');
      const availableSims = await this.statsDao.getSimCountByStatus('Available');
      const mostUsedNumberType = await this.statsDao.getMostUsedNumberType();
      const mostUsedBundle = await this.statsDao.getMostUsedBundle();

      // Get revenue stats for paid orders
      let totalRevenue = 0;
      let simSalesRevenue = 0;
      let bundleRevenue = 0;

      const revenueStats = await this.statsDao.getRevenueStatsByPaymentStatus('paid');

      if (revenueStats) {
        simSalesRevenue = parseFloat(revenueStats.simSalesRevenue || 0);
        bundleRevenue = parseFloat(revenueStats.bundleRevenue || 0);
        totalRevenue = simSalesRevenue + bundleRevenue;
      }

      return {
        totalOrdersReceived: totalOrders, // sab
        totalPaidOrders,
        ordersDelivered: deliveredCount,
        ordersCanceled: canceledCount,
        totalSimInventory,
        totalSimsSold,
        availableSims,
        mostUsedNumberType: mostUsedNumberType ? mostUsedNumberType.get('numberType') : null,
        mostUsedBundle: mostUsedBundle ? mostUsedBundle.get('bundleName') : null,
        successfulOrdersCount: totalPaidOrders,
        totalRevenue,
        simSalesRevenue,
        bundleRevenue,
      };
    } catch (e) {
      logger.error('Error in StatsService.getStatsInfo', e);
      throw e;
    }
  }

  async getOrdersByStatus() {
    try {
      logger.info('StatsService.getOrdersByStatus called');
      const data = await this.statsDao.getOrdersCountByStatus();
      return data.map(item => ({ status: item.get('status'), count: item.get('count') }));
    } catch (e) {
      logger.error('Error in StatsService.getOrdersByStatus', e);
      throw e;
    }
  }

  async getOrdersByStatusAndCity() {
    try {
      logger.info('StatsService.getOrdersByStatusAndCity called');
      const data = await this.statsDao.getOrdersCountByStatusAndCity();
      // Since we're using raw: true in the DAO, we can directly access properties
      return data.map(item => ({
        city: item.city,
        status: item.status,
        count: item.count
      }));
    } catch (e) {
      logger.error('Error in StatsService.getOrdersByStatusAndCity', e);
      throw e;
    }
  }

  async getInventoryByNumberType() {
    try {
      logger.info('StatsService.getInventoryByNumberType called');
      const data = await this.statsDao.getInventoryCountByNumberType();
      return data.map(item => ({ numberType: item.get('numberType'), count: item.get('count') }));
    } catch (e) {
      logger.error('Error in StatsService.getInventoryByNumberType', e);
      throw e;
    }
  }

  async getSimSoldByNumberType() {
    try {
      logger.info('StatsService.getSimSoldByNumberType called');
      const data = await this.statsDao.getSimCountByNumberTypeAndStatus('Sold');
      return data.map(item => ({ numberType: item.get('numberType'), count: item.get('count') }));
    } catch (e) {
      logger.error('Error in StatsService.getSimSoldByNumberType', e);
      throw e;
    }
  }

  async getAvailableSimsByNumberType() {
    try {
      logger.info('StatsService.getAvailableSimsByNumberType called');
      const data = await this.statsDao.getSimCountByNumberTypeAndStatus('Available');
      return data.map(item => ({ numberType: item.get('numberType'), count: item.get('count') }));
    } catch (e) {
      logger.error('Error in StatsService.getAvailableSimsByNumberType', e);
      throw e;
    }
  }

  async getSimSoldByRegion() {
    try {
      logger.info('StatsService.getSimSoldByRegion called');
      const data = await this.statsDao.getSimSoldCountByRegionAndType();
      return data.map(item => ({ region: item.get('region'), numberType: item.get('numberType'), count: item.get('count') }));
    } catch (e) {
      logger.error('Error in StatsService.getSimSoldByRegion', e);
      throw e;
    }
  }

  async getSimSoldByDateRange(startDate, endDate) {
    try {
      logger.info('StatsService.getSimSoldByDateRange called');
      const data = await this.statsDao.getSimSalesByDateRange(startDate, endDate);
      return data.map(item => ({ date: item.get('date'), numberType: item.get('numberType'), count: item.get('count') }));
    } catch (e) {
      logger.error('Error in StatsService.getSimSoldByDateRange', e);
      throw e;
    }
  }

  async getSIMsSoldByCity() {
    try {
      logger.info('StatsService.getSIMsSoldByCity called');
      const data = await this.statsDao.getSimSoldCountByCityAndType();
      // Map the results - since we're using raw: true, we can access properties directly
      return data.map(item => ({
        city: item.city,
        numberType: item.numberType,
        count: item.count
      }));
    } catch (e) {
      logger.error('Error in StatsService.getSIMsSoldByCity', e);
      throw e;
    }
  }

  async getBundleSoldByDateRange(startDate, endDate) {
    try {
      logger.info('StatsService.getBundleSoldByDateRange called');
      const data = await this.statsDao.getBundleSalesByDateRange(startDate, endDate);
      return data.map(item => ({ date: item.get('date'), bundleName: item.get('bundleName'), count: item.get('count') }));
    } catch (e) {
      logger.error('Error in StatsService.getBundleSoldByDateRange', e);
      throw e;
    }
  }
}

module.exports = new StatsService(); 
