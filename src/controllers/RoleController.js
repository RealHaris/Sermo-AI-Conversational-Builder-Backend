const httpStatus = require('http-status');
const RoleService = require('../service/RoleService');

class RoleController {
  constructor() {
    this.roleService = new RoleService();
  }

  /**
   * Create a new role
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  createRole = async (req, res) => {
    try {
      const result = await this.roleService.createRole(req.body);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Get all roles with pagination
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  getRoles = async (req, res) => {
    try {
      const result = await this.roleService.getRoles(req.query);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Get role by ID
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */

  getAllRoles = async (req, res) => {
    try {
      const result = await this.roleService.getAllRoles();
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };
  getRoleById = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.roleService.getRoleById(parseInt(id));
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Update role
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  updateRole = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.roleService.updateRole(parseInt(id), req.body);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Update a specific permission field in a role
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  updatePermissionField = async (req, res) => {
    try {
      const { id } = req.params;
      const { field, value } = req.body;
      const result = await this.roleService.updatePermissionField(parseInt(id), field, value);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Delete role
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  deleteRole = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.roleService.deleteRole(parseInt(id));
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Assign role to user
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  assignRoleToUser = async (req, res) => {
    try {
      const { userId } = req.params;
      const { role_id } = req.body;
      const result = await this.roleService.assignRoleToUser(userId, role_id);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };
}

module.exports = RoleController; 
