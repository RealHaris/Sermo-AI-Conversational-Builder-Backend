const httpStatus = require('http-status');
const AssistantService = require('../service/AssistantService');

class AssistantController {
  constructor() {
    this.assistantService = new AssistantService();
  }

  /**
   * Get all assistants
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  getAssistants = async (req, res) => {
    try {
      const result = await this.assistantService.getAssistants(req.query);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Get assistant by ID
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  getAssistantById = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.assistantService.getAssistantById(id);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Create a new assistant
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  createAssistant = async (req, res) => {
    try {
      const result = await this.assistantService.createAssistant(req.body);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Update assistant
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  updateAssistant = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.assistantService.updateAssistant(id, req.body);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Delete assistant
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  deleteAssistant = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.assistantService.deleteAssistant(id);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Change assistant status
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  changeStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const result = await this.assistantService.changeStatus(id, status);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Start chat with assistant
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  startChat = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.assistantService.startChat(id, req.body, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Start voice call with assistant
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  startCall = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.assistantService.startCall(id, req.body, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };
}

module.exports = AssistantController;