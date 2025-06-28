const SuperDao = require('./SuperDao');
const models = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');

const Bundle = models.bundle;
const NumberType = models.number_type;
const BundleNumberType = models.bundle_number_type;

class BundleDao extends SuperDao {
  constructor() {
    super(Bundle);
  }

  /**
   * Create a bundle
   * @param {Object} data
   * @returns {Promise<Bundle>}
   */
  async create(data) {
    let transaction;
    try {
      // Extract number type IDs
      const numberTypeIds = data.numberTypeIds || [];
      // Remove numberTypeIds from data to prevent sequelize error
      delete data.numberTypeIds;

      transaction = await models.sequelize.transaction();

      // Create bundle
      const bundle = await Bundle.create(data, { transaction });

      // Create bundle-number type associations
      if (numberTypeIds.length > 0) {
        const bundleNumberTypes = numberTypeIds.map(numberTypeId => ({
          bundle_id: bundle.id,
          number_type_id: numberTypeId,
          is_deleted: false
        }));

        await BundleNumberType.bulkCreate(bundleNumberTypes, { transaction });
      }

      await transaction.commit();

      // Return bundle with number types
      return this.findByUuid(bundle.uuid);
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.error(`Error in BundleDao.create: ${error.message}`);
      logger.error(error.stack);
      throw error;
    }
  }

  /**
   * Create multiple bundles
   * @param {Array} bundles
   * @returns {Promise<Array<Bundle>>}
   */
  async createBulk(bundles) {
    let transaction;
    try {
      transaction = await models.sequelize.transaction();

      // Create all bundles first
      const createdBundles = await Bundle.bulkCreate(
        bundles.map(bundle => {
          // Extract number type IDs and remove from bundle data
          const { numberTypeIds, ...bundleData } = bundle;
          return bundleData;
        }),
        { transaction }
      );

      // Create bundle-number type associations
      const bundleNumberTypes = [];
      createdBundles.forEach((bundle, index) => {
        const numberTypeIds = bundles[index].numberTypeIds || [];

        if (numberTypeIds.length > 0) {
          numberTypeIds.forEach(numberTypeId => {
            bundleNumberTypes.push({
              bundle_id: bundle.id,
              number_type_id: numberTypeId,
              is_deleted: false
            });
          });
        }
      });

      if (bundleNumberTypes.length > 0) {
        await BundleNumberType.bulkCreate(bundleNumberTypes, { transaction });
      }

      await transaction.commit();

      // Return the created bundles with their UUIDs
      return createdBundles;
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.error(`Error in BundleDao.createBulk: ${error.message}`);
      logger.error(error.stack);
      throw error;
    }
  }

  /**
   * Find all bundles with pagination and optional filtering
   * @param {Number} page - Page number
   * @param {Number} limit - Items per page
   * @param {Object} filter - Filter conditions
   * @returns {Promise<{rows: Array<Bundle>, count: Number}>}
   */
  async findWithPagination(page = 1, limit = 10, filter = {}) {
    try {
      // Log the input parameters for debugging
      logger.info(`Bundle findWithPagination - page: ${page}, limit: ${limit}, filters: ${JSON.stringify(filter)}`);

      const offset = (page - 1) * limit;
      const whereClause = { is_deleted: false };

      // Copy filter to avoid modifying the original
      const filterCopy = { ...filter };

      // Handle type filter
      if (filterCopy.type) {
        whereClause.type = filterCopy.type;
      }

      // Handle category filter
      if (filterCopy.category) {
        whereClause.category = filterCopy.category;
      }

      // Handle status conversion from string to boolean
      if (filterCopy.status !== undefined) {
        whereClause.status = filterCopy.status === 'true' || filterCopy.status === true;
      }

      // Handle search parameter for bundle ID, bundle name, and offer ID
      if (filterCopy.search) {
        whereClause[Op.or] = [
          { bundleId: { [Op.like]: `%${filterCopy.search}%` } },
          { bundleName: { [Op.like]: `%${filterCopy.search}%` } },
          { offerId: { [Op.like]: `%${filterCopy.search}%` } }
        ];
      }

      // Handle legacy search parameter (maintain backward compatibility)
      if (filterCopy.search && !whereClause[Op.or]) {
        whereClause[Op.or] = [
          { bundleId: { [Op.like]: `%${filterCopy.search}%` } },
          { bundleName: { [Op.like]: `%${filterCopy.search}%` } },
          { offerId: { [Op.like]: `%${filterCopy.search}%` } }
        ];
      }

      // Handle date range filter for created_at if provided
      if (filterCopy.startDate && filterCopy.endDate) {
        const startDateObj = new Date(filterCopy.startDate);
        const endDateObj = new Date(filterCopy.endDate);
        // Add one day to end date to include the end date in results
        endDateObj.setDate(endDateObj.getDate() + 1);

        whereClause.created_at = {
          [Op.between]: [startDateObj, endDateObj]
        };
      }

      // Handle numberTypeId filter - modified to work with many-to-many
      const numberTypeFilter = {};
      if (filterCopy.numberTypeId) {
        numberTypeFilter.id = parseInt(filterCopy.numberTypeId, 10);
      }

      // Handle number_type_slug filter (new)
      if (filterCopy.number_type_slug) {
        numberTypeFilter.slug = filterCopy.number_type_slug;
      }

      // Determine sort parameters
      let sortBy = 'createdAt';
      let sortOrder = 'DESC';

      if (filterCopy.sortBy) {
        sortBy = filterCopy.sortBy;
      }

      if (filterCopy.sortOrder) {
        sortOrder = filterCopy.sortOrder;
      }

      // Log the constructed where clause for debugging
      logger.info(`Bundle findWithPagination - whereClause: ${JSON.stringify(whereClause)}`);

      // Build the include condition for NumberType with potential filtering
      const numberTypeInclude = {
        model: models.number_type,
        as: 'number_type',
        attributes: ['id', 'uuid', 'name', 'slug'],
        through: { attributes: [] },
        where: { is_deleted: false }
      };

      // Add number type filtering if specified
      if (Object.keys(numberTypeFilter).length > 0) {
        numberTypeInclude.where = {
          ...numberTypeInclude.where,
          ...numberTypeFilter
        };
        numberTypeInclude.required = true; // Make this an inner join when filtering
      }

      // Execute the query with explicit include of NumberType
      const result = await Bundle.findAndCountAll({
        where: whereClause,
        include: [numberTypeInclude],
        distinct: true, // Important for correct count with includes
        limit: parseInt(limit, 10),
        offset,
        order: [[sortBy, sortOrder]]
      });

      console.log(result);

      // Log the result count for debugging
      logger.info(`Bundle findWithPagination - result count: ${result.count}`);

      return {
        rows: result.rows || [],
        count: result.count || 0
      };
    } catch (error) {
      logger.error(`Error in Bundle findWithPagination: ${error.message}`);
      logger.error(error.stack);
      return { rows: [], count: 0 };
    }
  }

  /**
   * Find all bundles with optional filtering and pagination
   * @param {Object} query - Query parameters
   * @returns {Promise<{rows: Array<Bundle>, count: Number}>}
   */
  async findAll(query = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      type,
      category,
      status,
      numberTypeId,
      search
    } = query;

    const offset = (page - 1) * limit;
    const whereClause = { is_deleted: false };

    if (type) {
      whereClause.type = type;
    }

    if (category) {
      whereClause.category = category;
    }

    if (status !== undefined) {
      whereClause.status = status === 'true';
    }

    // Create number type filter if needed
    const numberTypeFilter = {};
    if (numberTypeId) {
      numberTypeFilter.id = numberTypeId;
    }

    if (search) {
      whereClause[Op.or] = [
        { bundleId: { [Op.like]: `%${search}%` } },
        { bundleName: { [Op.like]: `%${search}%` } },
        { offerId: { [Op.like]: `%${search}%` } }
      ];
    }

    return Bundle.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: NumberType,
          as: 'number_type',
          attributes: ['id', 'uuid', 'name', 'slug'],
          where: numberTypeFilter.id ? numberTypeFilter : { is_deleted: false },
          through: { attributes: [] }
        }
      ],
      distinct: true, // For correct count with includes
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit, 10),
      offset
    });
  }

  /**
   * Find a bundle by UUID
   * @param {String} uuid
   * @returns {Promise<Bundle>}
   */
  async findByUuid(uuid) {
    return Bundle.findOne({
      where: { uuid, is_deleted: false },
      include: [
        {
          model: models.number_type,
          as: 'number_type',
          attributes: ['id', 'uuid', 'name', 'slug'],
          through: { attributes: [] }
        }
      ]
    });
  }

  /**
   * Find a bundle by bundle ID
   * @param {String} bundleId
   * @returns {Promise<Bundle>}
   */
  async findByBundleId(bundleId) {
    return Bundle.findOne({
      where: { bundleId, is_deleted: false },
      include: [
        {
          model: NumberType,
          as: 'number_type',
          attributes: ['id', 'uuid', 'name', 'slug'],
          where: { is_deleted: false },
          through: { attributes: [] }
        }
      ]
    });
  }

  /**
   * Find bundles by number type ID
   * @param {Number} numberTypeId
   * @param {Object} query - Pagination parameters
   * @returns {Promise<{rows: Array<Bundle>, count: Number}>}
   */
  async findByNumberTypeId(numberTypeId, query) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      status,
      category,
      search
    } = query;

    const offset = (page - 1) * limit;
    const whereClause = { is_deleted: false };

    if (status !== undefined) {
      whereClause.status = status === 'true';
    }

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause[Op.or] = [
        { bundleId: { [Op.like]: `%${search}%` } },
        { bundleName: { [Op.like]: `%${search}%` } },
        { offerId: { [Op.like]: `%${search}%` } }
      ];
    }

    return Bundle.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: NumberType,
          as: 'number_type',
          attributes: ['id', 'uuid', 'name', 'slug'],
          where: { id: numberTypeId, is_deleted: false },
          through: { attributes: [] }
        }
      ],
      distinct: true, // For correct count with includes
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit, 10),
      offset
    });
  }

  /**
   * Update a bundle by UUID
   * @param {String} uuid
   * @param {Object} updateBody
   * @returns {Promise<Number>}
   */
  async update(uuid, updateBody) {
    let transaction;
    try {
      transaction = await models.sequelize.transaction();

      // Extract number type IDs from update body
      const numberTypeIds = updateBody.numberTypeIds || [];
      delete updateBody.numberTypeIds;

      // Update the bundle
      const [updatedRows] = await Bundle.update(updateBody, {
        where: { uuid, is_deleted: false },
        transaction
      });

      if (updatedRows > 0 && numberTypeIds.length > 0) {
        // Find the bundle ID
        const bundle = await Bundle.findOne({
          where: { uuid, is_deleted: false },
          transaction
        });

        // Hard delete existing bundle-number type associations
        await BundleNumberType.destroy({
          where: { bundle_id: bundle.id },
          transaction
        });

        // Create new bundle-number type associations
        const bundleNumberTypes = numberTypeIds.map(numberTypeId => ({
          bundle_id: bundle.id,
          number_type_id: numberTypeId,
          is_deleted: false
        }));

        await BundleNumberType.bulkCreate(bundleNumberTypes, { transaction });
      }

      await transaction.commit();
      return [updatedRows];
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.error(`Error in BundleDao.update: ${error.message}`);
      logger.error(error.stack);
      throw error;
    }
  }

  /**
   * Update bundle categories in bulk
   * @param {Array<{uuid: String, category: String}>} bulkUpdateData - Array of objects with uuid and category
   * @returns {Promise<Number>} - Number of updated bundles
   */
  async updateCategoriesBulk(bulkUpdateData) {
    try {
      // Use transaction to ensure all updates succeed or none
      const result = await models.sequelize.transaction(async (transaction) => {
        let updatedCount = 0;

        // Process each update sequentially
        for (const item of bulkUpdateData) {
          const [affected] = await Bundle.update(
            { category: item.category },
            {
              where: {
                uuid: item.uuid,
                is_deleted: false
              },
              transaction
            }
          );

          updatedCount += affected;
        }

        return updatedCount;
      });

      return result;
    } catch (error) {
      logger.error(`Error in updateCategoriesBulk: ${error.message}`);
      logger.error(error.stack);
      throw error;
    }
  }

  /**
   * Find bundles by category
   * @param {String} category - Category to filter by
   * @param {Object} query - Pagination parameters
   * @returns {Promise<{rows: Array<Bundle>, count: Number}>}
   */
  async findByCategory(category, query = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = query;

    const offset = (page - 1) * limit;

    return Bundle.findAndCountAll({
      where: {
        category,
        is_deleted: false
      },
      include: [
        {
          model: NumberType,
          as: 'number_type',
          attributes: ['id', 'uuid', 'name', 'slug'],
          where: { is_deleted: false },
          through: { attributes: [] }
        }
      ],
      distinct: true, // For correct count with includes
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit, 10),
      offset
    });
  }

  /**
   * Delete a bundle (soft delete)
   * @param {String} uuid
   * @returns {Promise<Number>}
   */
  async delete(uuid) {
    let transaction;
    try {
      transaction = await models.sequelize.transaction();

      // Find the bundle
      const bundle = await Bundle.findOne({
        where: { uuid, is_deleted: false },
        transaction
      });

      if (!bundle) {
        await transaction.rollback();
        return false;
      }

      const now = new Date();

      // Soft delete bundle-number type associations
      await BundleNumberType.update(
        { is_deleted: true, deleted_at: now },
        {
          where: { bundle_id: bundle.id, is_deleted: false },
          transaction
        }
      );

      // Soft delete the bundle
      const [affectedCount] = await Bundle.update(
        { is_deleted: true, deleted_at: now },
        {
          where: { uuid, is_deleted: false },
          transaction
        }
      );

      await transaction.commit();
      return affectedCount > 0;
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.error(`Error in BundleDao.delete: ${error.message}`);
      logger.error(error.stack);
      throw error;
    }
  }

  /**
   * Check if bundle ID exists
   * @param {String} bundleId
   * @returns {Promise<Boolean>}
   */
  async isBundleIdExists(bundleId) {
    return Bundle.count({ where: { bundleId, is_deleted: false } }).then((count) => {
      if (count !== 0) {
        return true;
      }
      return false;
    });
  }

  /**
   * Get the latest bundle ID
   * @returns {Promise<String>}
   */
  async getLatestBundleId() {
    const bundle = await Bundle.findOne({
      where: {
        bundleId: {
          [Op.like]: 'T-%'
        },
        is_deleted: false
      },
      order: [['bundleId', 'DESC']]
    });

    return bundle ? bundle.bundleId : null;
  }

  /**
   * Delete by where condition (soft delete)
   * @param {Object} where - Where condition
   * @returns {Promise<Boolean>}
   */
  async deleteWhere(where) {
    let transaction;
    try {
      transaction = await models.sequelize.transaction();

      const completeWhere = { ...where, is_deleted: false };

      // Find all affected bundles
      const bundles = await Bundle.findAll({
        where: completeWhere,
        transaction
      });

      if (bundles.length === 0) {
        await transaction.rollback();
        return false;
      }

      const bundleIds = bundles.map(bundle => bundle.id);
      const now = new Date();

      // Soft delete bundle-number type associations
      await BundleNumberType.update(
        { is_deleted: true, deleted_at: now },
        {
          where: { bundle_id: { [Op.in]: bundleIds }, is_deleted: false },
          transaction
        }
      );

      // Soft delete bundles
      const [affectedCount] = await Bundle.update(
        { is_deleted: true, deleted_at: now },
        {
          where: completeWhere,
          transaction
        }
      );

      await transaction.commit();
      return affectedCount > 0;
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.error(`Error in BundleDao.deleteWhere: ${error.message}`);
      logger.error(error.stack);
      throw error;
    }
  }

  /**
   * Find a bundle by where condition
   * @param {Object} where - Where condition
   * @returns {Promise<Bundle>}
   */
  async findOneByWhere(where) {
    return Bundle.findOne({
      where: { ...where, is_deleted: false },
      include: [
        {
          model: NumberType,
          as: 'number_type',
          attributes: ['id', 'uuid', 'name', 'slug'],
          where: { is_deleted: false },
          through: { attributes: [] }
        }
      ]
    });
  }

  /**
   * Check if offer ID exists
   * @param {String} offerId
   * @returns {Promise<Boolean>}
   */
  async isOfferIdExists(offerId) {
    if (!offerId) return false;

    return Bundle.count({
      where: {
        offerId,
        is_deleted: false
      }
    }).then((count) => count > 0);
  }

  /**
   * Check if offer ID exists for bundles with overlapping number types
   * @param {String} offerId - Offer ID to check
   * @param {Array} numberTypeIds - Array of number type IDs
   * @param {String} excludeUuid - UUID to exclude from check (for updates)
   * @returns {Promise<Boolean>}
   */
  async isOfferIdExistsForSameNumberTypes(offerId, numberTypeIds, excludeUuid = null) {
    if (!offerId || !numberTypeIds || numberTypeIds.length === 0) return false;

    try {
      // Find bundles with the same offer ID that are not deleted
      const whereClause = {
        offerId,
        is_deleted: false
      };

      // Exclude current bundle if updating
      if (excludeUuid) {
        whereClause.uuid = { [Op.ne]: excludeUuid };
      }

      const bundlesWithSameOfferId = await Bundle.findAll({
        where: whereClause,
        attributes: ['id', 'uuid']
      });

      if (bundlesWithSameOfferId.length === 0) {
        return false;
      }

      // Get bundle IDs
      const bundleIds = bundlesWithSameOfferId.map(bundle => bundle.id);

      // Find all bundle-number type associations for these bundles
      const bundleNumberTypes = await BundleNumberType.findAll({
        where: {
          bundle_id: { [Op.in]: bundleIds },
          is_deleted: false
        },
        attributes: ['bundle_id', 'number_type_id']
      });

      // Group number types by bundle
      const bundleNumberTypeMap = {};
      bundleNumberTypes.forEach(bnt => {
        if (!bundleNumberTypeMap[bnt.bundle_id]) {
          bundleNumberTypeMap[bnt.bundle_id] = [];
        }
        bundleNumberTypeMap[bnt.bundle_id].push(bnt.number_type_id);
      });

      // Convert input number type IDs to Set for easier overlap checking
      const inputNumberTypeSet = new Set(numberTypeIds.map(id => parseInt(id, 10)));

      // Check if any existing bundle has overlapping number types
      for (const bundleId of bundleIds) {
        const existingNumberTypes = bundleNumberTypeMap[bundleId] || [];
        const existingNumberTypeSet = new Set(existingNumberTypes.map(id => parseInt(id, 10)));

        // Check for overlap: if any number type exists in both sets, there's a conflict
        const hasOverlap = [...inputNumberTypeSet].some(typeId => existingNumberTypeSet.has(typeId));

        if (hasOverlap) {
          return true; // Found a bundle with same offer ID and overlapping number types
        }
      }

      return false;
    } catch (error) {
      logger.error(`Error in BundleDao.isOfferIdExistsForSameNumberTypes: ${error.message}`);
      logger.error(error.stack);
      throw error;
    }
  }

  /**
   * Find all bundles by number type ID without pagination
   * @param {Number} numberTypeId - Number type ID
   * @returns {Promise<Array<Bundle>>}
   */
  async findAllByNumberTypeId(numberTypeId) {
    try {
      const bundleNumberTypes = await BundleNumberType.findAll({
        where: { number_type_id: numberTypeId, is_deleted: false }
      });

      const bundleIds = bundleNumberTypes.map(bnt => bnt.bundle_id);

      if (bundleIds.length === 0) {
        return [];
      }

      return Bundle.findAll({
        where: {
          id: { [Op.in]: bundleIds },
          status: true,
          is_deleted: false
        },
        include: [
          {
            model: NumberType,
            as: 'number_type',
            attributes: ['id', 'uuid', 'name', 'slug'],
            where: { is_deleted: false },
            through: { attributes: [] }
          }
        ],
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      logger.error(`Error in BundleDao.findAllByNumberTypeId: ${error.message}`);
      logger.error(error.stack);
      throw error;
    }
  }

  /**
   * Bulk delete bundles (soft delete)
   * @param {Array<String>} uuids - Array of UUIDs to delete
   * @returns {Promise<Object>} - Object containing deletion results
   */
  async bulkDelete(uuids) {
    let transaction;
    try {
      transaction = await models.sequelize.transaction();

      // Find all bundles with the given UUIDs
      const bundles = await Bundle.findAll({
        where: {
          uuid: { [Op.in]: uuids },
          is_deleted: false
        },
        attributes: ['id', 'uuid', 'status'],
        transaction
      });

      const foundUuids = bundles.map(bundle => bundle.uuid);
      const notFoundUuids = uuids.filter(uuid => !foundUuids.includes(uuid));

      // Check for bundles with active status (true)
      const activeBundles = bundles.filter(bundle => bundle.status === true);
      const activeUuids = activeBundles.map(bundle => bundle.uuid);

      // Get UUIDs that can be deleted (not active)
      const deletableUuids = bundles
        .filter(bundle => bundle.status !== true)
        .map(bundle => bundle.uuid);

      let deletedCount = 0;
      const deletableBundleIds = bundles
        .filter(bundle => bundle.status !== true)
        .map(bundle => bundle.id);

      if (deletableUuids.length > 0) {
        const now = new Date();

        // Soft delete bundle-number type associations first
        await BundleNumberType.update(
          { is_deleted: true, deleted_at: now },
          {
            where: {
              bundle_id: { [Op.in]: deletableBundleIds },
              is_deleted: false
            },
            transaction
          }
        );

        // Soft delete the bundles
        const [affectedRows] = await Bundle.update(
          {
            is_deleted: true,
            deleted_at: now
          },
          {
            where: {
              uuid: { [Op.in]: deletableUuids },
              is_deleted: false
            },
            transaction
          }
        );
        deletedCount = affectedRows;
      }

      await transaction.commit();

      return {
        requested: uuids.length,
        deleted: deletedCount,
        deletedUuids: deletableUuids,
        notFoundUuids,
        activeUuids,
        success: deletedCount > 0 || (notFoundUuids.length === 0 && activeUuids.length === 0)
      };

    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.error(`Error in BundleDao.bulkDelete: ${error.message}`);
      logger.error(error.stack);
      throw error;
    }
  }
}

module.exports = BundleDao; 
