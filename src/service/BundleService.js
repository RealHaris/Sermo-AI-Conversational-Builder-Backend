const httpStatus = require('http-status');
const { v4: uuidv4 } = require('uuid');
const BundleDao = require('../dao/BundleDao');
const NumberTypeDao = require('../dao/NumberTypeDao');
const responseHandler = require('../helper/responseHandler');
const logger = require('../config/logger');
const CityDao = require('../dao/CityDao');
const models = require('../models');

class BundleService {
  constructor() {
    this.bundleDao = new BundleDao();
    this.numberTypeDao = new NumberTypeDao();
    this.cityDao = new CityDao();
  }

  /**
   * Generate a new unique bundle ID
   * @returns {String} - New bundle ID
   */
  generateBundleId = async () => {
    const latestBundleId = await this.bundleDao.getLatestBundleId();

    if (!latestBundleId) {
      return 'T-1000'; // Initial bundle ID
    }

    const currentNumber = parseInt(latestBundleId.split('-')[1], 10);
    return `T-${currentNumber + 1}`;
  };

  /**
   * Check if offer ID already exists in the database
   * @param {String} offerId - Offer ID to check
   * @returns {Boolean} - True if exists, false otherwise
   */
  isOfferIdExists = async (offerId) => {
    if (!offerId) return false;
    return this.bundleDao.isOfferIdExists(offerId);
  };

  /**
   * Check if offer ID exists for bundles with overlapping number types
   * @param {String} offerId - Offer ID to check
   * @param {Array} numberTypeIds - Array of number type IDs
   * @param {String} excludeUuid - UUID to exclude from check (for updates)
   * @returns {Boolean} - True if exists, false otherwise
   */
  isOfferIdExistsForSameNumberTypes = async (offerId, numberTypeIds, excludeUuid = null) => {
    if (!offerId || !numberTypeIds || numberTypeIds.length === 0) return false;
    return this.bundleDao.isOfferIdExistsForSameNumberTypes(offerId, numberTypeIds, excludeUuid);
  };

  /**
   * Create a bundle
   * @param {Object} data - Bundle data
   * @returns {Object} - Response object
   */
  createBundle = async (data) => {
    try {
      // Check if all number types exist
      const numberTypeIds = [];
      const invalidNumberTypes = [];

      // Process each number type in the array
      for (const numberTypeSlug of data.numberTypes) {
        const numberType = await this.numberTypeDao.findBySlug(numberTypeSlug);
        if (!numberType) {
          invalidNumberTypes.push(numberTypeSlug);
        } else {
          numberTypeIds.push(numberType.id);
        }
      }

      if (invalidNumberTypes.length > 0) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          `The following number types were not found: ${invalidNumberTypes.join(', ')}`
        );
      }

      // Check if offer ID already exists for bundles with overlapping number types
      if (data.offerId && await this.isOfferIdExistsForSameNumberTypes(data.offerId, numberTypeIds)) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Offer ID already exists for bundles with overlapping number types',
          { duplicateOfferIds: [data.offerId] }
        );
      }

      // Generate bundle ID
      const bundleId = await this.generateBundleId();

      // Create bundle object
      const bundleData = {
        uuid: uuidv4(),
        bundleId,
        bundleName: data.bundleName,
        type: data.type,
        category: data.category || 'monthly', // Default to monthly if not provided
        validity: data.validity,
        validityType: data.validityType,
        voiceOnNetMins: data.voiceOnNetMins || '',
        voiceOffNetMins: data.voiceOffNetMins || '',
        sms: data.sms || '',
        data: data.data || '',
        dataUnit: data.dataUnit,
        bundlePrice: data.bundlePrice,
        discount: data.discount || 0,
        bundleFinalPrice: data.bundleFinalPrice,
        offerId: data.offerId,
        numberTypeIds: numberTypeIds, // Pass array of number type IDs
        status: data.status !== undefined ? data.status : true,
        is_deleted: false // Explicitly set is_deleted to false
      };

      const bundle = await this.bundleDao.create(bundleData);

      if (!bundle) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to create bundle'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.CREATED,
        'Bundle created successfully',
        bundle
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
   * Create multiple bundles
   * @param {Array} bundlesData - Array of bundle data
   * @returns {Object} - Response object
   */
  createBulkBundles = async (bundlesData) => {
    try {
      // Check for duplicate offer IDs within the incoming data for overlapping number type combinations
      const bundleNumberTypeMaps = [];
      const duplicatesInRequest = [];

      for (let i = 0; i < bundlesData.length; i++) {
        const bundle = bundlesData[i];
        if (!bundle.offerId) continue;

        bundleNumberTypeMaps.push({
          index: i,
          offerId: bundle.offerId,
          numberTypes: [...bundle.numberTypes] // Keep original array
        });
      }

      // Check for duplicates within the request
      for (let i = 0; i < bundleNumberTypeMaps.length; i++) {
        for (let j = i + 1; j < bundleNumberTypeMaps.length; j++) {
          const bundle1 = bundleNumberTypeMaps[i];
          const bundle2 = bundleNumberTypeMaps[j];

          // Check if same offer ID and overlapping number types
          if (bundle1.offerId === bundle2.offerId) {
            const set1 = new Set(bundle1.numberTypes);
            const set2 = new Set(bundle2.numberTypes);

            // Check for overlap: if any number type exists in both sets, there's a conflict
            const hasOverlap = [...set1].some(typeSlug => set2.has(typeSlug));

            if (hasOverlap) {
              duplicatesInRequest.push(bundle1.offerId);
            }
          }
        }
      }

      if (duplicatesInRequest.length > 0) {
        const uniqueDuplicates = [...new Set(duplicatesInRequest)];
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Duplicate offer IDs found in the request for bundles with overlapping number types',
          { duplicateOfferIds: uniqueDuplicates }
        );
      }

      // Check for duplicate offer IDs in the database for overlapping number type combinations
      const duplicateOfferIds = [];

      for (const bundleData of bundlesData) {
        if (bundleData.offerId) {
          // Convert number type slugs to IDs for this bundle
          const numberTypeIds = [];
          for (const slug of bundleData.numberTypes) {
            const numberType = await this.numberTypeDao.findBySlug(slug);
            if (numberType) {
              numberTypeIds.push(numberType.id);
            }
          }

          // Check if this offer ID exists with overlapping number types
          if (await this.isOfferIdExistsForSameNumberTypes(bundleData.offerId, numberTypeIds)) {
            duplicateOfferIds.push(bundleData.offerId);
          }
        }
      }

      if (duplicateOfferIds.length > 0) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'One or more offer IDs already exist for bundles with overlapping number types',
          { duplicateOfferIds: [...new Set(duplicateOfferIds)] }
        );
      }

      // Extract all unique number type slugs from all bundles
      const allNumberTypeSlugs = new Set();
      bundlesData.forEach(bundle => {
        bundle.numberTypes.forEach(slug => allNumberTypeSlugs.add(slug));
      });

      const slugs = [...allNumberTypeSlugs];

      // Fetch all required number types in one go
      const numberTypes = await Promise.all(
        slugs.map(slug => this.numberTypeDao.findBySlug(slug))
      );

      // Check if all number types exist
      const missingNumberTypes = [];
      slugs.forEach((slug, index) => {
        if (!numberTypes[index]) {
          missingNumberTypes.push(slug);
        }
      });

      if (missingNumberTypes.length > 0) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          `The following number types were not found: ${missingNumberTypes.join(', ')}`
        );
      }

      // Create a map of slug to id for easy lookup
      const slugToIdMap = {};
      numberTypes.forEach(type => {
        if (type) {
          slugToIdMap[type.slug] = type.id;
        }
      });

      // Generate bundle IDs and prepare data
      const bundlesWithIds = [];
      let lastBundleId = await this.bundleDao.getLatestBundleId();
      let lastNumber = lastBundleId ? parseInt(lastBundleId.split('-')[1], 10) : 999;

      for (const bundleData of bundlesData) {
        lastNumber += 1;

        // Convert number type slugs to IDs
        const numberTypeIds = bundleData.numberTypes.map(slug => slugToIdMap[slug]);

        bundlesWithIds.push({
          uuid: uuidv4(),
          bundleId: `T-${lastNumber}`,
          bundleName: bundleData.bundleName,
          type: bundleData.type,
          category: bundleData.category || 'monthly', // Default to monthly if not provided
          validity: bundleData.validity,
          validityType: bundleData.validityType,
          voiceOnNetMins: bundleData.voiceOnNetMins || '',
          voiceOffNetMins: bundleData.voiceOffNetMins || '',
          sms: bundleData.sms || '',
          data: bundleData.data || '',
          dataUnit: bundleData.dataUnit,
          bundlePrice: bundleData.bundlePrice,
          discount: bundleData.discount || 0,
          bundleFinalPrice: bundleData.bundleFinalPrice,
          offerId: bundleData.offerId,
          numberTypeIds: numberTypeIds, // Pass array of number type IDs
          status: bundleData.status !== undefined ? bundleData.status : true,
          is_deleted: false // Explicitly set is_deleted to false
        });
      }

      const bundles = await this.bundleDao.createBulk(bundlesWithIds);

      if (!bundles || bundles.length === 0) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to create bundles'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.CREATED,
        'Bundles created successfully',
        bundles
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
   * Get all bundles with pagination and filtering
   * @param {Object} query - Query parameters for filtering and pagination
   * @returns {Object} - Response object with bundles
   */
  getBundles = async (query) => {
    try {
      logger.info(`Getting bundles with query: ${JSON.stringify(query)}`);

      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 10;
      const { page: _, limit: __, ...filter } = query;

      // Process search filter
      if (filter.search) {
        // search is already handled in the DAO
        logger.info(`Searching bundles with term: ${filter.search}`);
      }

      // Process number_type_slug filter
      if (filter.number_type_slug) {
        logger.info(`Filtering bundles by number type slug: ${filter.number_type_slug}`);
      }

      // Process status filter
      if (filter.status !== undefined) {
        logger.info(`Filtering bundles by status: ${filter.status}`);
      }

      // Process date range filters
      if (filter.startDate && filter.endDate) {
        logger.info(`Filtering bundles by date range: ${filter.startDate} to ${filter.endDate}`);
      }

      // Process type filter
      if (filter.type) {
        logger.info(`Filtering bundles by type: ${filter.type}`);
      }

      // Process category filter
      if (filter.category) {
        logger.info(`Filtering bundles by category: ${filter.category}`);
      }

      const bundles = await this.bundleDao.findWithPagination(page, limit, filter);

      logger.info(`Bundles retrieved count: ${bundles.count}, rows length: ${bundles.rows ? bundles.rows.length : 0}`);

      // Ensure we have a valid total before calculating pages
      const total = bundles.count || 0;
      const totalPages = Math.ceil(total / limit) || 0;

      const pagination = {
        total,
        current_page: page,
        per_page: limit,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1
      };

      // Make sure content is always an array even if no results
      const content = bundles.rows || [];

      // Format the response similar to SimInventoryService
      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Bundles retrieved successfully',
        {
          content,
          pagination
        }
      );
    } catch (e) {
      logger.error(`Error getting bundles: ${e.message}`);
      logger.error(e.stack);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      );
    }
  };

  /**
   * Get a bundle by UUID
   * @param {String} uuid - Bundle UUID
   * @returns {Object} - Response object with bundle
   */
  getBundleByUuid = async (uuid) => {
    try {
      const bundle = await this.bundleDao.findByUuid(uuid);

      if (!bundle) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Bundle not found'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Bundle retrieved successfully',
        bundle
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
   * Get bundles by number type slug
   * @param {String} slug - Number type slug
   * @param {Object} query - Query parameters, can include cityId
   * @returns {Object} - Response object with bundles
   */
  getBundlesByNumberTypeSlug = async (slug, query = {}) => {
    try {
      const numberType = await this.numberTypeDao.findBySlug(slug);

      if (!numberType) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Number type not found'
        );
      }

      // If cityId is provided, we need to filter bundles by city
      if (query.cityId) {
        // Check if city exists
        const city = await this.cityDao.findOneByWhere({ id: query.cityId });
        if (!city) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'City not found'
          );
        }

        // Find all bundles for this number type
        const bundles = await this.bundleDao.findAllByNumberTypeId(numberType.id);

        // Return the bundles
        return responseHandler.returnSuccess(
          httpStatus.OK,
          'Bundles retrieved successfully for the specified city and number type',
          bundles
        );
      }

      // If no cityId provided, just return all bundles for this number type
      const bundles = await this.bundleDao.findAllByNumberTypeId(numberType.id);

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Bundles retrieved successfully',
        bundles
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
   * Get bundles by category
   * @param {String} category - Category to filter by
   * @param {Object} query - Query parameters for pagination
   * @returns {Object} - Response object with bundles
   */
  getBundlesByCategory = async (category, query) => {
    try {
      const { rows, count } = await this.bundleDao.findByCategory(category, query);

      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 10;
      const total = count || 0;
      const totalPages = Math.ceil(total / limit) || 0;

      const pagination = {
        total,
        current_page: page,
        per_page: limit,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1
      };

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Bundles retrieved successfully',
        {
          content: rows || [],
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
   * Update bundle categories in bulk
   * @param {Array<{uuid: String, category: String}>} updateData - Array of objects with uuid and category
   * @returns {Object} - Response object
   */
  updateBundleCategoriesBulk = async (updateData) => {
    try {
      // Validate that all bundles exist
      const bundleUuids = updateData.map(item => item.uuid);
      const bundlePromises = bundleUuids.map(uuid => this.bundleDao.findByUuid(uuid));
      const bundles = await Promise.all(bundlePromises);

      const missingBundles = bundles.map((bundle, index) =>
        bundle ? null : bundleUuids[index]
      ).filter(uuid => uuid !== null);

      if (missingBundles.length > 0) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          `The following bundles were not found: ${missingBundles.join(', ')}`
        );
      }

      // Update categories in bulk
      const updatedCount = await this.bundleDao.updateCategoriesBulk(updateData);

      return responseHandler.returnSuccess(
        httpStatus.OK,
        `Successfully updated ${updatedCount} bundle categories`,
        { updatedCount }
      );
    } catch (e) {
      logger.error(`Error updating bundle categories in bulk: ${e.message}`);
      logger.error(e.stack);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong while updating bundle categories!'
      );
    }
  };

  /**
   * Update a bundle
   * @param {String} uuid - Bundle UUID
   * @param {Object} updateBody - Data to update
   * @returns {Object} - Response object
   */
  updateBundle = async (uuid, updateBody) => {
    try {
      const bundle = await this.bundleDao.findByUuid(uuid);

      if (!bundle) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Bundle not found'
        );
      }

      // If trying to update number types, verify they all exist first
      let numberTypeIds = [];
      if (updateBody.numberTypes && updateBody.numberTypes.length > 0) {
        const invalidNumberTypes = [];

        // Process each number type in the array
        for (const numberTypeSlug of updateBody.numberTypes) {
          const numberType = await this.numberTypeDao.findBySlug(numberTypeSlug);
          if (!numberType) {
            invalidNumberTypes.push(numberTypeSlug);
          } else {
            numberTypeIds.push(numberType.id);
          }
        }

        if (invalidNumberTypes.length > 0) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            `The following number types were not found: ${invalidNumberTypes.join(', ')}`
          );
        }
      } else {
        // If not updating number types, get current number types
        const currentBundle = await this.bundleDao.findByUuid(uuid);
        if (currentBundle && currentBundle.number_type) {
          numberTypeIds = currentBundle.number_type.map(nt => nt.id);
        }
      }

      // Check for offer ID conflicts in two scenarios:
      // 1. When updating the offer ID
      // 2. When updating number types (even if offer ID stays the same)
      const isOfferIdChanging = updateBody.offerId && updateBody.offerId !== bundle.offerId;
      const areNumberTypesChanging = updateBody.numberTypes && updateBody.numberTypes.length > 0;
      const currentOfferId = updateBody.offerId || bundle.offerId;

      if ((isOfferIdChanging || areNumberTypesChanging) && currentOfferId) {
        if (await this.isOfferIdExistsForSameNumberTypes(currentOfferId, numberTypeIds, uuid)) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'Offer ID already exists for bundles with overlapping number types',
            { duplicateOfferIds: [currentOfferId] }
          );
        }
      }

      // If updating number types, replace numberTypes with numberTypeIds for the DAO
      if (updateBody.numberTypes && updateBody.numberTypes.length > 0) {
        // Replace numberTypes with numberTypeIds for the DAO
        updateBody.numberTypeIds = numberTypeIds;
        delete updateBody.numberTypes;
      }

      const updated = await this.bundleDao.update(uuid, updateBody);

      if (!updated[0]) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to update bundle'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Bundle updated successfully',
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
   * Change bundle status
   * @param {String} uuid - Bundle UUID
   * @param {Boolean} status - New status
   * @returns {Object} - Response object
   */
  changeBundleStatus = async (uuid, status) => {
    try {
      const bundle = await this.bundleDao.findByUuid(uuid);

      if (!bundle) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Bundle not found'
        );
      }

      const updated = await this.bundleDao.update(uuid, { status });

      if (!updated[0]) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to update bundle status'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Bundle status updated successfully',
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
   * Delete a bundle
   * @param {String} uuid - Bundle UUID
   * @returns {Object} - Response object
   */
  deleteBundle = async (uuid) => {
    try {
      const bundle = await this.bundleDao.findByUuid(uuid);

      if (!bundle) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Bundle not found'
        );
      }

      const deleted = await this.bundleDao.delete(uuid);

      if (!deleted) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to delete bundle'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Bundle deleted successfully',
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
   * Bulk delete bundles
   * @param {Array<String>} uuids - Array of UUIDs to delete
   * @returns {Object} - Response object
   */
  bulkDeleteBundles = async (uuids) => {
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

      const result = await this.bundleDao.bulkDelete(uniqueUuids);

      // Build response message
      let message = `Bulk delete completed. ${result.deleted} out of ${result.requested} bundles deleted.`;

      if (result.activeUuids.length > 0) {
        message += ` ${result.activeUuids.length} bundles could not be deleted as they are active.`;
      }

      if (result.notFoundUuids.length > 0) {
        message += ` ${result.notFoundUuids.length} bundles were not found.`;
      }

      // Determine status code based on results
      let statusCode = httpStatus.OK;
      if (result.deleted === 0) {
        if (result.activeUuids.length > 0 || result.notFoundUuids.length > 0) {
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
            cannotDelete: result.activeUuids.length
          },
          details: {
            deletedUuids: result.deletedUuids,
            notFoundUuids: result.notFoundUuids,
            activeUuids: result.activeUuids
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
   * Get active bundles by number type ID
   * @param {string} numberTypeId
   * @returns {Promise<Array>}
   */
  getActiveBundlesByNumberType = async (numberTypeId) => {
    try {
      // Use the DAO to find bundles with the specified number type ID
      const { rows } = await this.bundleDao.findByNumberTypeId(numberTypeId, { status: 'true' });
      return rows;
    } catch (error) {
      logger.error('Error in getActiveBundlesByNumberType:', error);
      throw error;
    }
  };
}

module.exports = BundleService; 
