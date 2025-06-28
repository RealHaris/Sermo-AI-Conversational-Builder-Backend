const httpStatus = require('http-status');
const UserService = require('../service/UserService');

class UserController {
  constructor() {
    this.userService = new UserService();
  }

  /**
   * Get all users
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  getUsers = async (req, res) => {
    try {
      const result = await this.userService.getUsers(req.query);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Get user by ID
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  getUserById = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.userService.getUserById(id);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Create a new user
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  createUser = async (req, res) => {
    try {
      const result = await this.userService.createUser(req.body);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Update user
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  updateUser = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.userService.updateUser(id, req.body);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Delete user
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  deleteUser = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.userService.deleteUser(id);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Change user status
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  changeStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const result = await this.userService.changeStatus(id, status);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Change user password using UUID
   * @param {Object} req - Contains new_password and confirm_password
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  changePassword = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.userService.changePassword(req.body, id);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };
}

module.exports = UserController; 
