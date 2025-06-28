const httpStatus = require('http-status');
const NumberTypeService = require('../service/NumberTypeService');
const SimInventoryService = require('../service/SimInventoryService');
const responseHandler = require('../helper/responseHandler');
const logger = require('../config/logger');

class NumberTypeController {
  constructor() {
    this.numberTypeService = new NumberTypeService();
    this.simInventoryService = new SimInventoryService();
  }

  createNumberType = async (req, res) => {
    try {
      const numberType = await this.numberTypeService.createNumberType(req.body);
      res.status(numberType.statusCode).send(numberType.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  getNumberTypes = async (req, res) => {
    try {
      const numberTypes = await this.numberTypeService.getNumberTypes(req.query);
      res.status(numberTypes.statusCode).send(numberTypes.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  getNumberTypeById = async (req, res) => {
    try {
      const numberType = await this.numberTypeService.getNumberTypeById(req.params.id);
      res.status(numberType.statusCode).send(numberType.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  getNumberTypeBySlug = async (req, res) => {
    try {
      const numberType = await this.numberTypeService.getNumberTypeBySlug(req.params.slug);
      res.status(numberType.statusCode).send(numberType.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  updateNumberType = async (req, res) => {
    try {
      const numberType = await this.numberTypeService.updateNumberType(
        req.params.id,
        req.body
      );
      res.status(numberType.statusCode).send(numberType.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  deleteNumberType = async (req, res) => {
    try {
      const numberType = await this.numberTypeService.deleteNumberType(req.params.id);
      res.status(numberType.statusCode).send(numberType.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Get available number types for a specific city ID
   * @param {Object} req 
   * @param {Object} res 
   * @returns {Promise<Object>}
   */
  getAvailableNumberTypesByCityId = async (req, res) => {
    try {
      const { cityId } = req.params;

      if (!cityId) {
        return res.status(httpStatus.BAD_REQUEST).json(
          responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'City ID is required'
          )
        );
      }

      // Get number types with available inventory for the specified city
      const numberTypes = await this.simInventoryService.getAvailableNumberTypesByCityId(cityId);

      return res.status(httpStatus.OK).json(
        responseHandler.returnSuccess(
          httpStatus.OK,
          'Available number types retrieved successfully',
          numberTypes
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

module.exports = NumberTypeController; 
