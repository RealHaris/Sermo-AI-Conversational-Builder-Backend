const httpStatus = require('http-status');
const { v4: uuidv4 } = require('uuid');
const CityDao = require('../dao/CityDao');
const RegionDao = require('../dao/RegionDao');
const responseHandler = require('../helper/responseHandler');
const logger = require('../config/logger');

class CityService {
  constructor() {
    this.cityDao = new CityDao();
    this.regionDao = new RegionDao();
  }

  /**
   * Create a city
   * @param {Object} data
   * @returns {Object}
   */
  createCity = async (data) => {
    try {
      // Check if region exists
      const region = await this.regionDao.findOneByWhere({ uuid: data.region_uuid });
      if (!region) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Region not found'
        );
      }

      // Check if city name already exists in this region
      if (await this.cityDao.isNameExistsInRegion(data.name, region.id)) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'City name already exists in this region'
        );
      }

      const uuid = uuidv4();
      data.uuid = uuid;
      data.region_id = region.id;

      // Get and set the next priority
      data.priority = await this.cityDao.getNextPriority(region.id);

      // Set default status if not provided
      if (data.status === undefined) {
        data.status = true;
      }

      const city = await this.cityDao.create(data);

      if (!city) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to create city'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.CREATED,
        'City created successfully',
        city
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
   * Get all cities
   * @param {Object} query - Query parameters for filtering and pagination
   * @returns {Object}
   */
  getCities = async (query) => {
    try {
      // If region_uuid is provided, convert it to region_id
      if (query.region_uuid) {
        const region = await this.regionDao.findOneByWhere({ uuid: query.region_uuid });
        if (region) {
          query.region_id = region.id;
        }
        delete query.region_uuid;
      }

      // For regular getCities, only show active cities
      const cities = await this.cityDao.findAll(query);
      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Cities retrieved successfully',
        cities
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
   * Get city by ID
   * @param {String} id - City's UUID
   * @returns {Object}
   */
  getCityById = async (id) => {
    try {
      const city = await this.cityDao.findOneWithRegion({ uuid: id });

      if (!city) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'City not found'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'City retrieved successfully',
        city
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
   * Update city
   * @param {String} id - City's UUID
   * @param {Object} updateBody - Data to update
   * @returns {Object}
   */
  updateCity = async (id, updateBody) => {
    try {
      const city = await this.cityDao.findOneByWhere({ uuid: id });

      if (!city) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'City not found'
        );
      }

      // Handle region change if region_uuid is provided
      if (updateBody.region_uuid) {
        const region = await this.regionDao.findOneByWhere({ uuid: updateBody.region_uuid });
        if (!region) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'Region not found'
          );
        }
        updateBody.region_id = region.id;
        delete updateBody.region_uuid;
      }

      // If trying to update name, check if the new name already exists in the region
      if (updateBody.name && updateBody.name !== city.name) {
        const regionId = updateBody.region_id || city.region_id;
        if (await this.cityDao.isNameExistsInRegion(updateBody.name, regionId)) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'City name already exists in this region'
          );
        }
      }

      const updatedCity = await this.cityDao.updateWhere(
        updateBody,
        { uuid: id }
      );

      if (!updatedCity) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to update city'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'City updated successfully',
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
   * Delete city
   * @param {String} id - City's UUID
   * @returns {Object}
   */
  deleteCity = async (id) => {
    try {
      const city = await this.cityDao.findOneByWhere({ uuid: id });

      if (!city) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'City not found'
        );
      }

      const deleted = await this.cityDao.deleteWhere({ uuid: id });

      if (!deleted) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to delete city'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'City deleted successfully',
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
   * Update city priority
   * @param {String} id - City's UUID
   * @param {Number} priority - New priority value
   * @returns {Object}
   */
  updateCityPriority = async (id, { priority }) => {
    try {
      const city = await this.cityDao.findOneByWhere({ uuid: id });

      if (!city) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'City not found'
        );
      }

      const result = await this.cityDao.updatePriority(city.id, priority);

      if (!result.success) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          result.message || 'Failed to update priority'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'City priority updated successfully'
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

module.exports = CityService;
