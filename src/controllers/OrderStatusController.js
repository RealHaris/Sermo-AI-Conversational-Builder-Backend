const httpStatus = require('http-status');
const OrderStatusService = require('../service/OrderStatusService');
const logger = require('../config/logger');

class OrderStatusController {
  constructor() {
    this.orderStatusService = new OrderStatusService();
  }

  createOrderStatus = async (req, res) => {
    try {
      const orderStatus = await this.orderStatusService.createOrderStatus(req.body);
      res.status(orderStatus.statusCode).send(orderStatus.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  getOrderStatuses = async (req, res) => {
    try {
      const orderStatuses = await this.orderStatusService.getOrderStatuses(req.query);
      res.status(orderStatuses.statusCode).send(orderStatuses.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  getOrderStatusById = async (req, res) => {
    try {
      const orderStatus = await this.orderStatusService.getOrderStatusById(req.params.id);
      res.status(orderStatus.statusCode).send(orderStatus.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  updateOrderStatus = async (req, res) => {
    try {
      const orderStatus = await this.orderStatusService.updateOrderStatus(
        req.params.id,
        req.body
      );
      res.status(orderStatus.statusCode).send(orderStatus.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  updateEventMapping = async (req, res) => {
    try {
      const result = await this.orderStatusService.updateEventMapping(
        req.params.id,
        req.body.event
      );
      res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  getOrderStatusByEvent = async (req, res) => {
    try {
      const orderStatus = await this.orderStatusService.getOrderStatusByEvent(req.params.event);
      res.status(orderStatus.statusCode).send(orderStatus.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  deleteOrderStatus = async (req, res) => {
    try {
      const orderStatus = await this.orderStatusService.deleteOrderStatus(req.params.id);
      res.status(orderStatus.statusCode).send(orderStatus.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };
}

module.exports = OrderStatusController; 
