const httpStatus = require('http-status');
const { v4: uuidv4 } = require('uuid');
const SimInventoryDao = require('../dao/SimInventoryDao');
const NumberTypeDao = require('../dao/NumberTypeDao');
const CityDao = require('../dao/CityDao');
const responseHandler = require('../helper/responseHandler');
const logger = require('../config/logger');
const models = require('../models');

class SimInventoryService {
  constructor() {
    this.simInventoryDao = new SimInventoryDao();
    this.numberTypeDao = new NumberTypeDao();
    this.cityDao = new CityDao();
    this.sequelize = models.sequelize;
    this.numberTypeModel = models.number_type;
  }

  /**
   * Create a sim inventory item
   * @param {Object} data
   * @returns {Object}
   */
  createSimInventory = async (data) => {
    try {
      // Check if number already exists
      if (await this.simInventoryDao.isNumberExists(data.number)) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Phone number already exists in the database',
          { duplicateNumbers: [data.number] }
        );
      }

      // Check if number type exists
      const numberType = await this.numberTypeDao.findOneByWhere({ id: data.number_type_id });
      if (!numberType) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Number type not found'
        );
      }

      // Check if city exists if provided (allow both active and inactive for internal operations)
      let cityId = null;
      if (data.city_uuid) {
        const city = await this.cityDao.findOneWithRegionIncludeInactive({ uuid: data.city_uuid });
        if (!city) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'City not found'
          );
        }
        cityId = city.id;
      }

      const uuid = uuidv4();
      data.uuid = uuid;
      data.status = data.status || 'Available';
      data.city_id = cityId;

      // Don't calculate final_sim_price as per requirement
      // Let the client pass the value

      const simInventory = await this.simInventoryDao.create(data);

      if (!simInventory) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to create SIM inventory item'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.CREATED,
        'SIM inventory item created successfully',
        simInventory
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
   * Create multiple sim inventory items
   * @param {Array} items - Array of objects containing number_type (slug), number, sim_price, discount, final_sim_price, and optionally city_name
   * @returns {Object}
   */
  createBulkSimInventory = async (items) => {
    try {
      // Check for duplicate numbers within the incoming data
      const numbers = items.map(item => item.number);
      const uniqueNumbers = [...new Set(numbers)];

      if (uniqueNumbers.length !== numbers.length) {
        // Find the duplicate numbers in the request
        const duplicateNumbers = numbers.filter((number, index) =>
          numbers.indexOf(number) !== index
        );

        // Get unique duplicates only
        const uniqueDuplicates = [...new Set(duplicateNumbers)];

        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Duplicate phone numbers found in the request',
          { duplicateNumbers: uniqueDuplicates }
        );
      }

      // Extract unique number_type slugs
      const slugs = [...new Set(items.map(item => item.number_type))];

      // Fetch all required number types in one go
      const numberTypes = await Promise.all(
        slugs.map(slug => this.numberTypeDao.findBySlug(slug))
      );

      // Check if all number types exist
      if (numberTypes.some(type => !type)) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'One or more number types not found'
        );
      }

      // Create a map of slug to id for easy lookup
      const slugToIdMap = {};
      numberTypes.forEach(type => {
        slugToIdMap[type.slug] = type.id;
      });

      // Get all unique city names from the items
      const cityNames = [...new Set(items.filter(item => item.city_name).map(item => item.city_name))];

      // Create a map of city names to city ids (allow both active and inactive for internal operations)
      const cityNameToIdMap = {};

      if (cityNames.length > 0) {
        // Find all cities and validate that ALL exist
        const cityResults = await Promise.all(
          cityNames.map(async (cityName) => {
            const city = await this.cityDao.findOneByWhere({ name: cityName, status: true });
            return { cityName, city };
          })
        );

        // Check if any cities don't exist
        const notFoundCities = cityResults
          .filter(result => !result.city)
          .map(result => result.cityName);

        if (notFoundCities.length > 0) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'One or more cities not found',
            { notFoundCities }
          );
        }

        // Create the city name to ID mapping
        cityResults.forEach(result => {
          cityNameToIdMap[result.cityName] = result.city.id;
        });
      }

      // Check for duplicate numbers in the database
      const existingChecks = await Promise.all(
        numbers.map(number => this.simInventoryDao.isNumberExists(number))
      );

      const existingNumberIndexes = existingChecks
        .map((exists, index) => exists ? index : -1)
        .filter(index => index !== -1);

      if (existingNumberIndexes.length > 0) {
        const duplicateNumbers = existingNumberIndexes.map(index => numbers[index]);

        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'One or more phone numbers already exist in the database',
          { duplicateNumbers }
        );
      }

      // Prepare data with UUID, default status, and convert number_type to number_type_id
      const preparedItems = items.map(item => {
        const preparedItem = {
          uuid: uuidv4(),
          number_type_id: slugToIdMap[item.number_type],
          number: item.number,
          sim_price: item.sim_price,
          discount: item.discount,
          final_sim_price: item.final_sim_price,
          status: 'Available',
        };

        // Add city_id if city name was provided (we've already validated all cities exist)
        if (item.city_name) {
          preparedItem.city_id = cityNameToIdMap[item.city_name];
        }

        return preparedItem;
      });

      const createdItems = await this.simInventoryDao.bulkCreate(preparedItems);

      if (!createdItems || createdItems.length === 0) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to create SIM inventory items'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.CREATED,
        'SIM inventory items created successfully',
        createdItems
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
   * Get all sim inventory items with pagination
   * @param {Object} query - Query parameters for filtering and pagination
   * @returns {Object}
   */
  getSimInventories = async (query) => {
    try {
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 10;
      const { page: _, limit: __, city_uuid, ...filter } = query;

      // Convert city_uuid to city_id if provided (allow both active and inactive for internal operations)
      if (city_uuid) {
        const city = await this.cityDao.findOneWithRegionIncludeInactive({ uuid: city_uuid });
        if (city) {
          filter.city_id = city.id;
        }
      }

      const simInventories = await this.simInventoryDao.findWithPagination(page, limit, filter);

      const totalPages = Math.ceil(simInventories.count / limit);
      const pagination = {
        total: simInventories.count,
        current_page: page,
        per_page: limit,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1
      };

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'SIM inventory items retrieved successfully',
        {
          content: simInventories.rows,
          pagination
        }
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
   * Get sim inventory items with number type information
   * @param {Object} query - Query parameters for filtering and pagination
   * @param {Object} dataAccessFilters - User's data access filters
   * @returns {Object}
   */
  getSimInventoriesWithNumberType = async (query, dataAccessFilters = {}) => {
    try {
      const { startDate, endDate, search, ...restQuery } = query;

      // Add search parameter if provided
      if (search) {
        restQuery.search = search;
      }

      // Add date range filters if provided
      if (startDate && endDate) {
        restQuery.startDate = startDate;
        restQuery.endDate = endDate;
      }

      // Add data access filters to the query
      restQuery.dataAccessFilters = dataAccessFilters;

      // Let the DAO handle city_uuid filtering at database level
      // No need for JavaScript-based access checking anymore
      const result = await this.simInventoryDao.findAllWithNumberType(restQuery);

      // Build pagination response
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 10;
      const totalPages = Math.ceil(result.count / limit);
      const pagination = {
        total: result.count,
        current_page: page,
        per_page: limit,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1
      };

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'SIM inventory items retrieved successfully',
        {
          content: result.rows,
          pagination
        }
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
   * Get all sim inventory items by number type slug
   * @param {String} slug - Number type slug
   * @param {Object} query - Query parameters, including optional cityId
   * @returns {Object}
   */
  getSimInventoriesByNumberTypeSlug = async (slug, query = {}) => {
    try {
      // Extract cityId from query if present
      const { cityId, ...restQuery } = query;
      let filter = {};

      // Add city_id filter if provided (allow both active and inactive for internal operations)
      if (cityId) {
        const city = await this.cityDao.findOneByWhere({ id: cityId });
        if (!city) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'City not found'
          );
        }
        filter.city_id = city.id;
      }

      const result = await this.simInventoryDao.findAllByNumberTypeSlugWithoutPagination(slug, filter);

      if (!result || result.length === 0) {
        return responseHandler.returnSuccess(
          httpStatus.OK,
          'No SIM inventory items found for this number type',
          []
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'SIM inventory items retrieved successfully',
        result
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
   * Get a sim inventory item by UUID
   * @param {String} id - UUID of the sim inventory item
   * @returns {Object}
   */
  getSimInventoryById = async (id) => {
    try {
      const simInventory = await this.simInventoryDao.findByUuidWithCity(id);

      if (!simInventory) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'SIM inventory item not found'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'SIM inventory item retrieved successfully',
        simInventory
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
   * Update a sim inventory item
   * @param {String} id - UUID of the sim inventory item
   * @param {Object} updateBody - Data to update
   * @returns {Object}
   */
  updateSimInventory = async (id, updateBody) => {
    try {
      const simInventory = await this.simInventoryDao.findOneByWhere({ uuid: id });

      if (!simInventory) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'SIM inventory item not found'
        );
      }

      // Check if updating number and if it already exists
      if (updateBody.number && updateBody.number !== simInventory.number) {
        if (await this.simInventoryDao.isNumberExists(updateBody.number)) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'Phone number already exists in the database'
          );
        }
      }

      // Check if number type exists if updating
      if (updateBody.number_type_id) {
        const numberType = await this.numberTypeDao.findOneByWhere({ id: updateBody.number_type_id });
        if (!numberType) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'Number type not found'
          );
        }
      }

      // Check if city exists if updating (allow both active and inactive for internal operations)
      if (updateBody.city_uuid) {
        const city = await this.cityDao.findOneWithRegionIncludeInactive({ uuid: updateBody.city_uuid });
        if (!city) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'City not found'
          );
        }
        // Replace city_uuid with city_id
        updateBody.city_id = city.id;
        delete updateBody.city_uuid;
      }

      const updated = await this.simInventoryDao.updateWhere(
        updateBody,
        { uuid: id }
      );

      if (!updated) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to update SIM inventory item'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'SIM inventory item updated successfully',
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
   * Update sim inventory status
   * @param {String} id - UUID of the sim inventory item
   * @param {String} status - New status
   * @returns {Object}
   */
  changeSimInventoryStatus = async (id, status) => {
    try {
      const simInventory = await this.simInventoryDao.findOneByWhere({ uuid: id });

      if (!simInventory) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'SIM inventory item not found'
        );
      }

      const updated = await this.simInventoryDao.updateStatusByUuid(id, status);

      if (!updated) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to update SIM inventory status'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'SIM inventory status updated successfully',
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
   * Update sim inventory city
   * @param {String} id - UUID of the sim inventory item
   * @param {String} cityUuid - UUID of the city
   * @returns {Object}
   */
  changeSimInventoryCity = async (id, cityUuid) => {
    try {
      const simInventory = await this.simInventoryDao.findOneByWhere({ uuid: id });

      if (!simInventory) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'SIM inventory item not found'
        );
      }

      // Check if city exists (allow both active and inactive for internal operations)
      const city = await this.cityDao.findOneWithRegionIncludeInactive({ uuid: cityUuid });
      if (!city) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'City not found'
        );
      }

      const updated = await this.simInventoryDao.updateCityByUuid(id, city.id);

      if (!updated) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to update SIM inventory city'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'SIM inventory city updated successfully',
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
   * Delete a sim inventory item
   * @param {String} id - UUID of the sim inventory item
   * @returns {Object}
   */
  deleteSimInventory = async (id) => {
    try {
      const simInventory = await this.simInventoryDao.findOneByWhere({ uuid: id });

      if (!simInventory) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'SIM inventory item not found'
        );
      }

      const deleted = await this.simInventoryDao.deleteWhere({ uuid: id });

      if (!deleted) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to delete SIM inventory item'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'SIM inventory item deleted successfully',
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
   * Bulk delete sim inventory items
   * @param {Array<String>} uuids - Array of UUIDs to delete
   * @returns {Object}
   */
  bulkDeleteSimInventory = async (uuids) => {
    try {
      if (!uuids || uuids.length === 0) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'No UUIDs provided for deletion'
        );
      }

      // Check for duplicate UUIDs
      const uniqueUuids = [...new Set(uuids)];
      if (uniqueUuids.length !== uuids.length) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Duplicate UUIDs found in the request'
        );
      }

      const result = await this.simInventoryDao.bulkDelete(uniqueUuids);

      // Build response message
      let message = `Bulk delete completed. ${result.deleted} out of ${result.requested} items deleted.`;

      if (result.soldUuids.length > 0) {
        message += ` ${result.soldUuids.length} items could not be deleted as they are sold.`;
      }

      if (result.notFoundUuids.length > 0) {
        message += ` ${result.notFoundUuids.length} items were not found.`;
      }

      // Determine status code based on results
      let statusCode = httpStatus.OK;
      if (result.deleted === 0) {
        if (result.soldUuids.length > 0 || result.notFoundUuids.length > 0) {
          statusCode = httpStatus.BAD_REQUEST;
        }
      }

      return responseHandler.returnSuccess(
        statusCode,
        message,
        {
          summary: {
            requested: result.requested,
            deleted: result.deleted,
            notFound: result.notFoundUuids.length,
            cannotDelete: result.soldUuids.length
          },
          details: {
            deletedUuids: result.deletedUuids,
            notFoundUuids: result.notFoundUuids,
            soldUuids: result.soldUuids
          }
        }
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong during bulk deletion!'
      );
    }
  };

  /**
   * Get available number types by city ID
   * @param {string} cityId - City UUID
   * @returns {Promise<Array>}
   */
  getAvailableNumberTypesByCityId = async (cityId) => {
    try {
      // Query the database to get distinct number types for available inventory in the specified city
      const availableNumberTypes = await this.sequelize.query(
        `SELECT DISTINCT nt.* 
         FROM number_type nt
         JOIN sim_inventory si ON si.number_type_id = nt.id
         WHERE si.city_id = :cityId 
         AND si.status = 'Available'
         AND si.is_deleted = false
         AND nt.is_deleted = false`,
        {
          replacements: { cityId },
          type: this.sequelize.QueryTypes.SELECT,
          model: this.numberTypeModel,
          mapToModel: true
        }
      );

      return availableNumberTypes;
    } catch (error) {
      logger.error('Error in getAvailableNumberTypesByCityId:', error);
      throw error;
    }
  };

  /**
   * Get available SIMs by city ID and number type ID
   * @param {string} cityId
   * @param {string} numberTypeId
   * @param {number} limit
   * @param {number} offset
   * @returns {Promise<{rows: Array, count: number}>}
   */
  getAvailableSimsByCityAndNumberType = async (cityId, numberTypeId, limit = 10, offset = 0) => {
    try {
      const condition = {
        city_id: cityId,
        number_type_id: numberTypeId,
        status: 'Available',
        is_deleted: false
      };

      // Use findAllWithNumberType to include number_type and city data
      const page = Math.floor(offset / limit) + 1;
      const query = {
        ...condition,
        page,
        limit,
        offset
      };

      const result = await this.simInventoryDao.findAllWithNumberType(query);

      return {
        data: result.rows,
        total: result.count,
        limit,
        offset
      };
    } catch (error) {
      logger.error('Error in getAvailableSimsByCityAndNumberType:', error);
      throw error;
    }
  };
}

module.exports = SimInventoryService; 
