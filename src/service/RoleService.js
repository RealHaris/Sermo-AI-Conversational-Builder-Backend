const httpStatus = require('http-status');
const RoleDao = require('../dao/RoleDao');
const UserDao = require('../dao/UserDao');
const responseHandler = require('../helper/responseHandler');
const logger = require('../config/logger');

class RoleService {
  constructor() {
    this.roleDao = new RoleDao();
    this.userDao = new UserDao();
  }

  /**
   * Create a role
   * @param {Object} roleData
   * @returns {Object}
   */
  createRole = async (roleData) => {
    try {
      if (await this.roleDao.isNameExists(roleData.name)) {
        return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Role name already exists');
      } const defaultPermissions = {
        "dashboard": false,
        "sim_inventory": true,
        "bundles": false,
        "sim_sale": false,
        "users": false,
        "number_type": false,
        "order_status": false,
        "cities": false,
        "roles": true,
        "status_configuration": true,
        "scheduler_configuration": true,
      };

      roleData.permissions = defaultPermissions;

      const role = await this.roleDao.create(roleData);


      return responseHandler.returnSuccess(
        httpStatus.CREATED,
        'Role created successfully',
        role
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
    }
  };

  /**
   * Get all roles with pagination
   * @param {Object} query - Query parameters
   * @returns {Object}
   */
  getRoles = async (query) => {
    try {
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 10;
      const { page: _, limit: __, ...filter } = query;

      const roles = await this.roleDao.findWithPagination(page, limit, filter);

      const totalPages = Math.ceil(roles.count / limit);
      const pagination = {
        total: roles.count,
        current_page: page,
        per_page: limit,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1
      };

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Roles retrieved successfully',
        {
          content: roles.rows,
          pagination
        }
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
    }
  };

  /**
   * Get role by ID
   * @param {Number} id
   * @returns {Object}
   */


  getAllRoles = async () => {
    try {
      const roles = await this.roleDao.findAll();

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Roles retrieved successfully',
        roles
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
    }
  };
  getRoleById = async (id) => {
    try {
      const role = await this.roleDao.findById(id);

      if (!role) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Role not found'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Role retrieved successfully',
        role
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
    }
  };

  /**
   * Update role
   * @param {Number} id
   * @param {Object} updateData
   * @returns {Object}
   */
  updateRole = async (id, updateData) => {
    try {
      const role = await this.roleDao.findById(id);

      if (!role) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Role not found'
        );
      }

      // If name is being updated, check if it already exists among active roles
      if (updateData.name && updateData.name !== role.name) {
        if (await this.roleDao.isNameExists(updateData.name)) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'Role name already exists'
          );
        }

        // Check if there's a soft-deleted role with this name
        const deletedRole = await this.roleDao.findSoftDeletedByName(updateData.name);
        if (deletedRole) {
          // If there is, we can either restore it or just allow the update
          // For this implementation, we'll allow the update and keep the soft-deleted record
          // This prevents any potential data loss in case the soft-deleted role is needed later
        }
      }

      const updated = await this.roleDao.updateWhere(updateData, { id });

      if (!updated) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to update role'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Role updated successfully',
        await this.roleDao.findById(id)
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
    }
  };

  /**
   * Update a specific permission field in the role
   * @param {Number} id
   * @param {String} field
   * @param {Boolean} value
   * @returns {Object}
   */
  updatePermissionField = async (id, field, value) => {
    try {
      const role = await this.roleDao.findById(id);

      if (!role) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Role not found'
        );
      }

      const updated = await this.roleDao.updatePermissionField(id, field, value);

      if (!updated) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to update permission'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Permission updated successfully',
        await this.roleDao.findById(id)
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
    }
  };

  /**
   * Delete role
   * @param {Number} id
   * @returns {Object}
   */
  deleteRole = async (id) => {
    try {
      const role = await this.roleDao.findById(id);

      if (!role) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Role not found'
        );
      }

      // Check if any users are using this role
      const usersWithRole = await this.userDao.getCountByWhere({ role_id: id });
      if (usersWithRole > 0) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          `Cannot delete role: ${usersWithRole} users are assigned to this role`
        );
      }

      const deleted = await this.roleDao.deleteByWhere({ id });

      if (!deleted) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to delete role'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Role deleted successfully',
        {}
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
    }
  };

  /**
   * Assign role to user
   * @param {String} userId - User's UUID
   * @param {Number} roleId
   * @returns {Object}
   */
  assignRoleToUser = async (userId, roleId) => {
    try {
      const user = await this.userDao.findOneByWhereWithHiddenFields({ uuid: userId });
      if (!user) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'User not found'
        );
      }

      const role = await this.roleDao.findById(roleId);
      if (!role) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Role not found'
        );
      }

      const updated = await this.userDao.updateRole(userId, roleId);

      if (!updated) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Failed to assign role to user'
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Role assigned to user successfully',
        {}
      );
    } catch (e) {
      logger.error(e);
      return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
    }
  };
}

module.exports = RoleService; 
