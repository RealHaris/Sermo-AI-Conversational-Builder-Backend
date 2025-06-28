const SuperDao = require("./SuperDao");
const models = require("../models");
const { Op } = require("sequelize");

const SimInventory = models.sim_inventory;
const NumberType = models.number_type;
const City = models.city;
const Region = models.region;

class SimInventoryDao extends SuperDao {
  constructor() {
    super(SimInventory);
  }

  async findByNumber(number) {
    return SimInventory.findOne({
      where: {
        number,
        is_deleted: false,
      },
    });
  }

  async isNumberExists(number) {
    return SimInventory.count({
      where: {
        number,
        is_deleted: false,
      },
    }).then((count) => {
      if (count != 0) {
        return true;
      }
      return false;
    });
  }

  async findAllWithNumberType(query = {}) {
    const {
      limit,
      offset,
      page,
      number_type_id,
      number_type_slug,
      status,
      number,
      search,
      min_price,
      max_price,
      city_id,
      city_uuid,
      startDate,
      endDate,
      sort_by = "created_at",
      sort_order = "DESC",
      dataAccessFilters = {},
      ...otherFilters
    } = query;

    // Build the where condition for SimInventory
    const whereCondition = {
      is_deleted: false,
      ...otherFilters,
    };

    // Add number_type_id filter if provided
    if (number_type_id) {
      whereCondition.number_type_id = number_type_id;
    }

    // Add city_id filter if provided
    if (city_id) {
      whereCondition.city_id = city_id;
    }

    // Add status filter if provided
    if (status) {
      whereCondition.status = status;
    }

    // Add number filter if provided
    if (number) {
      whereCondition.number = {
        [Op.like]: `%${number}%`,
      };
    }

    // Add search filter for number
    if (search) {
      whereCondition.number = {
        [Op.like]: `%${search}%`,
      };
    }

    // Add price range filters if provided
    if (min_price !== undefined) {
      whereCondition.sim_price = {
        ...(whereCondition.sim_price || {}),
        [Op.gte]: min_price,
      };
    }

    if (max_price !== undefined) {
      whereCondition.sim_price = {
        ...(whereCondition.sim_price || {}),
        [Op.lte]: max_price,
      };
    }

    // Add date range filter for created_at if provided
    if (startDate && endDate) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      // Add one day to end date to include the end date in results
      endDateObj.setDate(endDateObj.getDate() + 1);

      whereCondition.created_at = {
        [Op.between]: [startDateObj, endDateObj]
      };
    }

    // Build the include condition for NumberType
    const includeConditions = [
      {
        model: NumberType,
        as: "number_type",
        attributes: ["id", "uuid", "name", "slug"],
        where: { is_deleted: false },
      },
      {
        model: City,
        as: "city",
        attributes: ["id", "uuid", "name"],
        where: { is_deleted: false, status: true },
        required: false,
        include: [
          {
            model: Region,
            as: "region",
            attributes: ["id", "uuid", "name"],
            where: { is_deleted: false },
            required: false,
          },
        ],
      },
    ];

    // Add number_type_slug filter if provided
    if (number_type_slug) {
      includeConditions[0].where = {
        ...includeConditions[0].where,
        slug: number_type_slug,
      };
    }

    // Handle city_uuid filter at database level
    if (city_uuid) {
      includeConditions[1].where = {
        ...includeConditions[1].where,
        uuid: city_uuid
      };
      includeConditions[1].required = true; // Make city join required when filtering by city_uuid
    }

    // Apply data access filters at database level - CRITICAL: These filters take precedence
    if (dataAccessFilters.cityIds && dataAccessFilters.cityIds.length > 0) {
      // If user has city-level access, filter by their city IDs
      // This combines with city_uuid filter if both are provided
      if (city_uuid) {
        // If city_uuid is provided, add it as an additional constraint
        includeConditions[1].where = {
          ...includeConditions[1].where,
          id: {
            [Op.in]: dataAccessFilters.cityIds
          }
        };
      } else {
        // If no city_uuid provided, just filter by user's accessible cities
        whereCondition.city_id = {
          [Op.in]: dataAccessFilters.cityIds,
        };
      }
    } else if (
      dataAccessFilters.regionIds &&
      dataAccessFilters.regionIds.length > 0
    ) {
      // If user has region-level access, filter by cities in their regions
      includeConditions[1].required = true;
      includeConditions[1].include[0].required = true;
      includeConditions[1].include[0].where = {
        ...includeConditions[1].include[0].where,
        id: {
          [Op.in]: dataAccessFilters.regionIds,
        },
      };
    }

    // Determine the sorting field and order
    let order;
    switch (sort_by) {
      case "number":
        order = [["number", sort_order]];
        break;
      case "sim_price":
        order = [["sim_price", sort_order]];
        break;
      case "status":
        order = [["status", sort_order]];
        break;
      default:
        order = [["created_at", sort_order]];
    }

    return SimInventory.findAndCountAll({
      where: whereCondition,
      include: includeConditions,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      order,
    });
  }

  async findAllByNumberTypeSlug(slug, query = {}) {
    const { limit, offset, status, ...filter } = query;

    const whereCondition = {
      is_deleted: false,
      ...filter,
    };

    if (status) {
      whereCondition.status = status;
    }

    return SimInventory.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: NumberType,
          as: "number_type",
          attributes: ["id", "uuid", "name", "slug"],
          where: {
            slug,
            is_deleted: false,
          },
        },
        {
          model: City,
          as: "city",
          attributes: ["id", "uuid", "name"],
          where: { is_deleted: false, status: true },
          required: false,
          include: [
            {
              model: Region,
              as: "region",
              attributes: ["id", "uuid", "name"],
              where: { is_deleted: false },
              required: false,
            },
          ],
        },
      ],
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      order: [["created_at", "DESC"]],
    });
  }

  async updateStatusByUuid(uuid, status) {
    return this.updateWhere({ status }, { uuid });
  }

  async updateCityByUuid(uuid, cityId) {
    return this.updateWhere({ city_id: cityId }, { uuid });
  }

  async findWithPagination(page = 1, limit = 10, filter = {}) {
    const offset = (page - 1) * limit;

    // Get the basic data using the SuperDao method
    const result = await this.getDataTableData(
      { ...filter, is_deleted: false },
      limit,
      offset
    );

    // If we need to include city and region relationships, we can do additional processing here
    return result;
  }

  // Method to find a sim inventory with its city relationship
  async findByUuidWithCity(uuid) {
    return SimInventory.findOne({
      where: { uuid, is_deleted: false },
      include: [
        {
          model: NumberType,
          as: "number_type",
          attributes: ["id", "uuid", "name", "slug"],
          where: { is_deleted: false },
          required: false,
        },
        {
          model: City,
          as: "city",
          attributes: ["id", "uuid", "name"],
          where: { is_deleted: false, status: true },
          required: false,
          include: [
            {
              model: Region,
              as: "region",
              attributes: ["id", "uuid", "name"],
              where: { is_deleted: false },
              required: false,
            },
          ],
        },
      ],
    });
  }

  /**
   * Find all sim inventory items by number type slug without pagination
   * @param {String} slug - Number type slug
   * @param {Object} filter - Additional filters to apply
   * @returns {Promise<Array>}
   */ async findAllByNumberTypeSlugWithoutPagination(slug, filter = {}) {
    try {
      const whereCondition = {
        status: "Available",
        is_deleted: false,
        ...filter, // Apply any additional filters like city_id
      };

      const results = await SimInventory.findAll({
        where: whereCondition,
        include: [
          {
            model: NumberType,
            as: "number_type",
            attributes: ["id", "uuid", "name", "slug"],
            where: {
              slug,
              is_deleted: false,
            },
          },
          {
            model: City,
            as: "city",
            attributes: ["id", "uuid", "name"],
            where: { is_deleted: false, status: true },
            required: false,
            include: [
              {
                model: Region,
                as: "region",
                attributes: ["id", "uuid", "name"],
                where: { is_deleted: false },
                required: false,
              },
            ],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      return results;
    } catch (error) {
      console.error(
        `Error in findAllByNumberTypeSlugWithoutPagination: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Release a SIM inventory by marking it as Available
   * @param {Number} id - SIM inventory ID
   * @returns {Promise<Boolean>} - True if the inventory was released
   */
  async releaseSimInventory(id) {
    try {
      const [affectedRows] = await SimInventory.update(
        { status: "Available" },
        {
          where: {
            id,
            is_deleted: false,
          },
        }
      );
      return affectedRows > 0;
    } catch (error) {
      console.error(`Error in releaseSimInventory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Bulk delete SIM inventory items (soft delete)
   * @param {Array<String>} uuids - Array of UUIDs to delete
   * @returns {Promise<Object>} - Object containing deletion results
   */
  async bulkDelete(uuids) {
    let transaction;
    try {
      transaction = await models.sequelize.transaction();

      // Find all SIM inventory items with the given UUIDs
      const simInventories = await SimInventory.findAll({
        where: {
          uuid: { [Op.in]: uuids },
          is_deleted: false
        },
        attributes: ['id', 'uuid', 'status'],
        transaction
      });

      const foundUuids = simInventories.map(sim => sim.uuid);
      const notFoundUuids = uuids.filter(uuid => !foundUuids.includes(uuid));

      // Check for SIMs with 'Sold' status
      const soldSims = simInventories.filter(sim => sim.status === 'Sold');
      const soldUuids = soldSims.map(sim => sim.uuid);

      // Get UUIDs that can be deleted (not sold)
      const deletableUuids = simInventories
        .filter(sim => sim.status !== 'Sold')
        .map(sim => sim.uuid);

      let deletedCount = 0;

      if (deletableUuids.length > 0) {
        const now = new Date();
        const [affectedRows] = await SimInventory.update(
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
        soldUuids,
        success: deletedCount > 0 || (notFoundUuids.length === 0 && soldUuids.length === 0)
      };

    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error(`Error in SimInventoryDao.bulkDelete: ${error.message}`);
      console.error(error.stack);
      throw error;
    }
  }
}

module.exports = SimInventoryDao;
