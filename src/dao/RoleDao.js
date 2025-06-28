// RoleDao.js
const SuperDao = require('./SuperDao');
const models = require('../models');

const Role = models.role;

class RoleDao extends SuperDao {
  constructor() {
    super(Role);
  }

  async findByName(name) {
    return Role.findOne({
      where: {
        name,
        is_deleted: false
      }
    }).then(role => {
      if (!role) return null;
      // Ensure permissions is an object
      if (role.permissions && typeof role.permissions === 'string') {
        role.permissions = JSON.parse(role.permissions);
      }
      return role;
    });
  }

  async isNameExists(name) {
    return Role.count({
      where: {
        name,
        is_deleted: false
      }
    }).then((count) => {
      return count !== 0;
    });
  }

  // Add a new method to check name exists regardless of deletion status
  async isNameExistsIncludingDeleted(name) {
    return Role.count({
      where: {
        name
      }
    }).then((count) => {
      return count !== 0;
    });
  }

  // Method to find a soft-deleted role by name
  async findSoftDeletedByName(name) {
    return Role.findOne({
      where: {
        name,
        is_deleted: true
      }
    });
  }

  async findWithPagination(page = 1, limit = 10, filter = {}) {
    const offset = (page - 1) * limit;

    return Role.findAndCountAll({
      where: {
        ...filter,
        is_deleted: false
      },
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['createdAt', 'DESC']]
    }).then(result => {
      // Ensure permissions is an object in all rows
      if (result.rows) {
        result.rows.forEach(role => {
          if (role.permissions && typeof role.permissions === 'string') {
            role.permissions = JSON.parse(role.permissions);
          }
        });
      }
      return result;
    });
  }

  async updatePermissionField(id, field, value) {
    const role = await this.findById(id);
    if (!role) return null;

    let permissions = role.permissions || {};

    // If permissions is a string, parse it to an object
    if (typeof permissions === 'string') {
      permissions = JSON.parse(permissions);
    }

    permissions[field] = value;

    return this.updateWhere(
      { permissions },
      { id }
    );
  }

  // Override findById to ensure permissions is returned as object
  async findById(id) {
    return super.findById(id).then(role => {
      if (!role) return null;
      // Ensure permissions is an object
      if (role.permissions && typeof role.permissions === 'string') {
        role.permissions = JSON.parse(role.permissions);
      }
      return role;
    });
  }

  // Override create to handle permissions properly
  async create(data) {
    // Ensure permissions is properly handled
    if (data.permissions && typeof data.permissions === 'object') {
      // Already an object, no need to modify
    }
    return super.create(data);
  }

  // Override update to handle permissions properly
  async update(id, data) {
    // Ensure permissions is properly handled
    if (data.permissions && typeof data.permissions === 'object') {
      // Already an object, no need to modify
    }
    return super.update(id, data);
  }

  // Override findAll to ensure permissions is returned as object
  async findAll(where = {}) {
    return super.findAll(where).then(roles => {
      if (Array.isArray(roles)) {
        roles.forEach(role => {
          if (role.permissions && typeof role.permissions === 'string') {
            role.permissions = JSON.parse(role.permissions);
          }
        });
      }
      return roles;
    });
  }
}

module.exports = RoleDao;
