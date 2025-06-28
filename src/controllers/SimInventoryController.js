const httpStatus = require('http-status');
const SimInventoryService = require('../service/SimInventoryService');
const NumberTypeService = require('../service/NumberTypeService');
const responseHandler = require('../helper/responseHandler');
const logger = require('../config/logger');

class SimInventoryController {
  constructor() {
    this.simInventoryService = new SimInventoryService();
    this.numberTypeService = new NumberTypeService();
  }

  createSimInventory = async (req, res) => {
    try {
      const simInventory = await this.simInventoryService.createSimInventory(req.body);
      res.status(simInventory.statusCode).send(simInventory.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  createBulkSimInventory = async (req, res) => {
    try {
      const simInventories = await this.simInventoryService.createBulkSimInventory(req.body);
      res.status(simInventories.statusCode).send(simInventories.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  getSimInventories = async (req, res) => {
    try {
      const simInventories = await this.simInventoryService.getSimInventoriesWithNumberType(
        req.query,
        req.dataAccessFilters
      );
      res.status(simInventories.statusCode).send(simInventories.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  getSimInventoryById = async (req, res) => {
    try {
      const simInventory = await this.simInventoryService.getSimInventoryById(req.params.id);
      res.status(simInventory.statusCode).send(simInventory.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  getSimInventoriesByNumberType = async (req, res) => {
    try {
      const { slug } = req.query;
      if (!slug) {
        return res.status(httpStatus.BAD_REQUEST).json(
          responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'Number type slug is required'
          )
        );
      }



      const simInventories = await this.simInventoryService.getSimInventoriesByNumberTypeSlug(
        slug,
        req.query
      );
      res.status(simInventories.statusCode).send(simInventories.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  updateSimInventory = async (req, res) => {
    try {
      const simInventory = await this.simInventoryService.updateSimInventory(
        req.params.id,
        req.body
      );
      res.status(simInventory.statusCode).send(simInventory.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  changeSimInventoryStatus = async (req, res) => {
    try {
      const simInventory = await this.simInventoryService.changeSimInventoryStatus(
        req.params.id,
        req.body.status
      );
      res.status(simInventory.statusCode).send(simInventory.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  changeSimInventoryCity = async (req, res) => {
    try {
      const simInventory = await this.simInventoryService.changeSimInventoryCity(
        req.params.id,
        req.body.city_uuid
      );
      res.status(simInventory.statusCode).send(simInventory.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  deleteSimInventory = async (req, res) => {
    try {
      const simInventory = await this.simInventoryService.deleteSimInventory(req.params.id);
      res.status(simInventory.statusCode).send(simInventory.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  bulkDeleteSimInventory = async (req, res) => {
    try {
      const result = await this.simInventoryService.bulkDeleteSimInventory(req.body);
      res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Get available SIM inventory by city ID and number type ID
   * @param {Object} req 
   * @param {Object} res 
   * @returns {Promise<Object>}
   */
  getAvailableSimsByFilter = async (req, res) => {
    try {
      const { cityId, numberTypeId, page = 1, limit = 10 } = req.query;

      // Calculate offset from page and limit
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Get available SIM inventory for the specified city and number type
      const availableSims = await this.simInventoryService.getAvailableSimsByCityAndNumberType(
        cityId,
        numberTypeId,
        parseInt(limit),
        offset
      );

      // Build pagination response
      const totalPages = Math.ceil(availableSims.total / parseInt(limit));
      const pagination = {
        total: availableSims.total,
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total_pages: totalPages,
        has_next_page: parseInt(page) < totalPages,
        has_prev_page: parseInt(page) > 1
      };

      return res.status(httpStatus.OK).json(
        responseHandler.returnSuccess(
          httpStatus.OK,
          'Available SIMs retrieved successfully with number type and city information',
          {
            content: availableSims.data,
            pagination
          }
        )
      );
    } catch (error) {
      logger.error(error);
      return res.status(httpStatus.BAD_GATEWAY).json(
        responseHandler.returnError(httpStatus.BAD_GATEWAY, 'Something went wrong')
      );
    }
  };
}

module.exports = SimInventoryController; 
