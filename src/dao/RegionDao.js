const SuperDao = require('./SuperDao');
const models = require('../models');

const Region = models.region;
const City = models.city;

class RegionDao extends SuperDao {
  constructor() {
    super(Region);
  }

  async isNameExists(name) {
    return Region.count({ where: { name, is_deleted: false } }).then((count) => {
      if (count != 0) {
        return true;
      }
      return false;
    });
  }

  async findAll(query = {}) {
    const { limit, offset, ...filter } = query;
    return Region.findAndCountAll({
      where: { ...filter, is_deleted: false },
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      order: [['createdAt', 'DESC']]
    });
  }

  async findAllWithCities() {
    return Region.findAll({
      where: { is_deleted: false },
      include: [
        {
          model: City,
          where: { is_deleted: false },
          required: false,
          order: [['priority', 'ASC'], ['name', 'ASC']]
        }
      ],
      order: [['name', 'ASC']]
    });
  }

  async deleteWhere(where) {
    return this.deleteByWhere(where);
  }
}

module.exports = RegionDao;
