const httpStatus = require('http-status');
const { v4: uuidv4 } = require('uuid');
const RegionDao = require('../dao/RegionDao');
const responseHandler = require('../helper/responseHandler');
const logger = require('../config/logger');

class RegionService {
  constructor() {
    this.regionDao = new RegionDao();
  }

  /**
   * Create a region
   * @param {Object} data
   * @returns {Object}
   */
  createRegion = async (data) => {
    try {
      if (await this.regionDao.isNameExists(data.name)) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Name already exists'
        );
      }

      const uuid = uuidv4();
      data.uuid = uuid;

      const region = await this.regionDao.create(data);

      if (!region) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to create region'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.CREATED,
        'Region created successfully',
        region
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
   * Get all regions
   * @param {Object} query - Query parameters for filtering and pagination
   * @returns {Object}
   */
  getRegions = async (query) => {
    try {
      const regions = await this.regionDao.findAll(query);
      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Regions retrieved successfully',
        regions
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
   * Get all regions with their cities
   * @returns {Object}
   */
  getRegionsWithCities = async () => {
    try {
      const regions = await this.regionDao.findAllWithCities();
      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Regions with cities retrieved successfully',
        regions
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
   * Get region by ID
   * @param {String} id - Region's UUID
   * @returns {Object}
   */
  getRegionById = async (id) => {
    try {
      const region = await this.regionDao.findOneByWhere({ uuid: id });

      if (!region) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Region not found'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Region retrieved successfully',
        region
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
   * Update region
   * @param {String} id - Region's UUID
   * @param {Object} updateBody - Data to update
   * @returns {Object}
   */
  updateRegion = async (id, updateBody) => {
    try {
      const region = await this.regionDao.findOneByWhere({ uuid: id });

      if (!region) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Region not found'
        );
      }

      // If trying to update name, check if the new name already exists
      if (updateBody.name && updateBody.name !== region.name) {
        if (await this.regionDao.isNameExists(updateBody.name)) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'Name already exists'
          );
        }
      }

      const updatedRegion = await this.regionDao.updateWhere(
        updateBody,
        { uuid: id }
      );

      if (!updatedRegion) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to update region'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Region updated successfully',
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
   * Delete region
   * @param {String} id - Region's UUID
   * @returns {Object}
   */
  deleteRegion = async (id) => {
    try {
      const region = await this.regionDao.findOneByWhere({ uuid: id });

      if (!region) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Region not found'
        );
      }

      const deleted = await this.regionDao.deleteWhere({ uuid: id });

      if (!deleted) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to delete region'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Region deleted successfully',
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

module.exports = RegionService; 
