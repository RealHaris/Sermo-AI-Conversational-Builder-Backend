const SuperDao = require('./SuperDao');
const models = require('../models');
const { Op } = require('sequelize');

const City = models.city;
const Region = models.region;

class CityDao extends SuperDao {
  constructor() {
    super(City);
  }
  async getNextPriority(regionId) {
    const maxPriorityCity = await City.findOne({
      where: {
        is_deleted: false
      },
      order: [['priority', 'DESC']]
    });


    console.log('maxPriorityCity', maxPriorityCity);
    return maxPriorityCity ? maxPriorityCity.priority + 1 : 1;
  }

  async isNameExistsInRegion(name, regionId) {
    return City.count({
      where: {
        name,
        region_id: regionId,
        is_deleted: false
      }
    }).then((count) => {
      if (count != 0) {
        return true;
      }
      return false;
    });
  }

  async findAll(query = {}) {
    const { limit, offset, region_id, includeInactive = false, ...filter } = query;
    const whereClause = { ...filter, is_deleted: false };

    // Filter by active status unless explicitly including inactive cities
    if (!includeInactive) {
      whereClause.status = true;
    }

    if (region_id) {
      whereClause.region_id = region_id;
    }

    return City.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Region,
          as: 'region',
          attributes: ['uuid', 'name'],
          where: { is_deleted: false },
          required: true
        }
      ],
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      order: [['priority', 'ASC'], ['createdAt', 'DESC']]
    });
  }

  async findOneWithRegion(where) {
    return City.findOne({
      where: { ...where, is_deleted: false, status: true },
      include: [
        {
          model: Region,
          as: 'region',
          attributes: ['uuid', 'name'],

          where: { is_deleted: false },
          required: true
        }
      ]
    });
  }

  // Method to find city without status filtering (for internal use)
  async findOneWithRegionIncludeInactive(where) {
    return City.findOne({
      where: { ...where, is_deleted: false },
      include: [
        {
          model: Region,
          as: 'region',
          attributes: ['uuid', 'name'],
          where: { is_deleted: false },
          required: true
        }
      ]
    });
  }

  async deleteWhere(where) {
    return this.deleteByWhere(where);
  }

  async updatePriority(cityId, newPriority) {
    const t = await City.sequelize.transaction();

    try {
      // Get the current city
      const currentCity = await City.findOne({
        where: { id: cityId, is_deleted: false },
        transaction: t
      });

      if (!currentCity) {
        await t.rollback();
        return { success: false, message: 'City not found' };
      }      // Check if any city has the new priority (across all regions)
      const existingCityWithPriority = await City.findOne({
        where: {
          priority: newPriority,
          id: { [Op.ne]: cityId },
          is_deleted: false
        },
        transaction: t
      });

      // If a city with the new priority exists, swap priorities
      if (existingCityWithPriority) {
        await existingCityWithPriority.update(
          { priority: currentCity.priority },
          { transaction: t }
        );
      }

      // Update the current city's priority
      await currentCity.update({ priority: newPriority }, { transaction: t });

      await t.commit();
      return { success: true };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

module.exports = CityDao;
