const SuperDao = require('./SuperDao');
const models = require('../models');

const NumberType = models.number_type;

class NumberTypeDao extends SuperDao {
  constructor() {
    super(NumberType);
  }

  async findBySlug(slug) {
    return NumberType.findOne({ where: { slug, is_deleted: false } });
  }

  async isSlugExists(slug) {
    return NumberType.count({ where: { slug, is_deleted: false } }).then((count) => {
      if (count != 0) {
        return true;
      }
      return false;
    });
  }

  async findAll(query = {}) {
    const { limit, offset, ...filter } = query;
    return NumberType.findAndCountAll({
      where: { ...filter, is_deleted: false },
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      order: [['createdAt', 'DESC']]
    });
  }

  async deleteWhere(where) {
    return this.deleteByWhere(where);
  }
}

module.exports = NumberTypeDao; 
