const httpStatus = require('http-status');
const responseHandler = require('../helper/responseHandler');
const StatsService = require('../service/StatsService');

class StatsController {
  async getStatsInfo(req, res) {
    try {
      const data = await StatsService.getStatsInfo();
      const { statusCode, response } = responseHandler.returnSuccess(
        httpStatus.OK,
        'Stats retrieved successfully',
        data
      );
      return res.status(statusCode).json(response);
    } catch (error) {
      const { statusCode, response } = responseHandler.returnError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to retrieve stats'
      );
      return res.status(statusCode).json(response);
    }
  }

  async getOrdersByStatus(req, res) {
    try {
      const data = await StatsService.getOrdersByStatus();
      const { statusCode, response } = responseHandler.returnSuccess(
        httpStatus.OK,
        'Orders by status retrieved successfully',
        data
      );
      return res.status(statusCode).json(response);
    } catch (error) {
      const { statusCode, response } = responseHandler.returnError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to retrieve orders by status'
      );
      return res.status(statusCode).json(response);
    }
  }

  async getOrdersByStatusAndCity(req, res) {
    try {
      const data = await StatsService.getOrdersByStatusAndCity();
      const { statusCode, response } = responseHandler.returnSuccess(
        httpStatus.OK,
        'Orders by status and city retrieved successfully',
        data
      );
      return res.status(statusCode).json(response);
    } catch (error) {
      const { statusCode, response } = responseHandler.returnError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to retrieve orders by status and city',
        error.message
      );
      return res.status(statusCode).json(response);
    }
  }

  async getInventoryByNumberType(req, res) {
    try {
      const data = await StatsService.getInventoryByNumberType();
      const { statusCode, response } = responseHandler.returnSuccess(
        httpStatus.OK,
        'Inventory by number type retrieved successfully',
        data
      );
      return res.status(statusCode).json(response);
    } catch (error) {
      const { statusCode, response } = responseHandler.returnError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to retrieve inventory by number type'
      );
      return res.status(statusCode).json(response);
    }
  }

  async getSIMsSoldByNumberType(req, res) {
    try {
      const data = await StatsService.getSimSoldByNumberType();
      const { statusCode, response } = responseHandler.returnSuccess(
        httpStatus.OK,
        'SIMs sold by number type retrieved successfully',
        data
      );
      return res.status(statusCode).json(response);
    } catch (error) {
      const { statusCode, response } = responseHandler.returnError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to retrieve SIMs sold by number type'
      );
      return res.status(statusCode).json(response);
    }
  }

  async getAvailableSIMsByNumberType(req, res) {
    try {
      const data = await StatsService.getAvailableSimsByNumberType();
      const { statusCode, response } = responseHandler.returnSuccess(
        httpStatus.OK,
        'Available SIMs by number type retrieved successfully',
        data
      );
      return res.status(statusCode).json(response);
    } catch (error) {
      const { statusCode, response } = responseHandler.returnError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to retrieve available SIMs by number type'
      );
      return res.status(statusCode).json(response);
    }
  }

  async getSIMsSoldByRegion(req, res) {
    try {
      const data = await StatsService.getSimSoldByRegion();
      const { statusCode, response } = responseHandler.returnSuccess(
        httpStatus.OK,
        'SIMs sold by region retrieved successfully',
        data
      );
      return res.status(statusCode).json(response);
    } catch (error) {
      const { statusCode, response } = responseHandler.returnError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to retrieve SIMs sold by region'
      );
      return res.status(statusCode).json(response);
    }
  }

  async getSIMsSoldByCity(req, res) {
    try {
      const data = await StatsService.getSIMsSoldByCity();
      const { statusCode, response } = responseHandler.returnSuccess(
        httpStatus.OK,
        'SIMs sold by city retrieved successfully',
        data
      );
      return res.status(statusCode).json(response);
    } catch (error) {
      const { statusCode, response } = responseHandler.returnError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to retrieve SIMs sold by city',
        error.message
      );
      return res.status(statusCode).json(response);
    }
  }

  async getSIMsSoldLast15Days(req, res) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 14);
      const data = await StatsService.getSimSoldByDateRange(startDate, endDate);
      const { statusCode, response } = responseHandler.returnSuccess(
        httpStatus.OK,
        'SIMs sold in last 15 days retrieved successfully',
        data
      );
      return res.status(statusCode).json(response);
    } catch (error) {
      const { statusCode, response } = responseHandler.returnError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to retrieve SIMs sold in last 15 days'
      );
      return res.status(statusCode).json(response);
    }
  }

  async getBundlesSoldLast15Days(req, res) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 14);
      const data = await StatsService.getBundleSoldByDateRange(startDate, endDate);
      const { statusCode, response } = responseHandler.returnSuccess(
        httpStatus.OK,
        'Bundles sold in last 15 days retrieved successfully',
        data
      );
      return res.status(statusCode).json(response);
    } catch (error) {
      const { statusCode, response } = responseHandler.returnError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to retrieve bundles sold in last 15 days'
      );
      return res.status(statusCode).json(response);
    }
  }
}

module.exports = new StatsController(); 
