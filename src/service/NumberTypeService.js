const httpStatus = require('http-status');
const { v4: uuidv4 } = require('uuid');
const NumberTypeDao = require('../dao/NumberTypeDao');
const responseHandler = require('../helper/responseHandler');
const logger = require('../config/logger');

class NumberTypeService {
  constructor() {
    this.numberTypeDao = new NumberTypeDao();
  }

  /**
   * Create a number type
   * @param {Object} data
   * @returns {Object}
   */
  createNumberType = async (data) => {
    try {
      if (await this.numberTypeDao.isSlugExists(data.slug)) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Slug already exists'
        );
      }

      const uuid = uuidv4();
      data.uuid = uuid;

      const numberType = await this.numberTypeDao.create(data);

      if (!numberType) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to create number type'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.CREATED,
        'Number type created successfully',
        numberType
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Get all number types
   * @param {Object} query - Query parameters for filtering and pagination
   * @returns {Object}
   */
  getNumberTypes = async (query) => {
    try {
      const numberTypes = await this.numberTypeDao.findAll(query);
      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Number types retrieved successfully',
        numberTypes
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Get number type by ID
   * @param {String} id - Number type's UUID
   * @returns {Object}
   */
  getNumberTypeById = async (id) => {
    try {
      const numberType = await this.numberTypeDao.findOneByWhere({ uuid: id });

      if (!numberType) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Number type not found'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Number type retrieved successfully',
        numberType
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Get number type by slug
   * @param {String} slug - Number type's slug
   * @returns {Object}
   */
  getNumberTypeBySlug = async (slug) => {
    try {
      const numberType = await this.numberTypeDao.findBySlug(slug);

      if (!numberType) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Number type not found'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Number type retrieved successfully',
        numberType
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Update number type
   * @param {String} id - Number type's UUID
   * @param {Object} updateBody - Data to update
   * @returns {Object}
   */
  updateNumberType = async (id, updateBody) => {
    try {
      const numberType = await this.numberTypeDao.findOneByWhere({ uuid: id });

      if (!numberType) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Number type not found'
        );
      }

      // If trying to update slug, check if the new slug already exists
      if (updateBody.slug && updateBody.slug !== numberType.slug) {
        if (await this.numberTypeDao.isSlugExists(updateBody.slug)) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'Slug already exists'
          );
        }
      }

      const updatedNumberType = await this.numberTypeDao.updateWhere(
        updateBody,
        { uuid: id }
      );

      if (!updatedNumberType) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to update number type'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Number type updated successfully',
        {}
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Delete number type
   * @param {String} id - Number type's UUID
   * @returns {Object}
   */
  deleteNumberType = async (id) => {
    try {
      const numberType = await this.numberTypeDao.findOneByWhere({ uuid: id });

      if (!numberType) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Number type not found'
        );
      }

      const deleted = await this.numberTypeDao.deleteWhere({ uuid: id });

      if (!deleted) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to delete number type'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Number type deleted successfully',
        {}
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };
}

module.exports = NumberTypeService; 
