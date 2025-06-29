const httpStatus = require('http-status');
const CallService = require('../service/CallService');

class CallController {
  constructor() {
    this.callService = new CallService();
  }

  /**
   * Get all calls
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  getCalls = async (req, res) => {
    try {
      const result = await this.callService.getCalls(req.query, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Get call by ID
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  getCallById = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.callService.getCallById(id, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Create/start a new call
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  createCall = async (req, res) => {
    try {
      const result = await this.callService.createCall(req.body, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Update call
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  updateCall = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.callService.updateCall(id, req.body, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * End call
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  endCall = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.callService.endCall(id, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Delete call
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  deleteCall = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.callService.deleteCall(id, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Get call analytics
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  getCallAnalytics = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.callService.getCallAnalytics(id, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Get call transcript
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  getCallTranscript = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.callService.getCallTranscript(id, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Get call recording
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  getCallRecording = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.callService.getCallRecording(id, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Update call status
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  updateCallStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const result = await this.callService.updateCallStatus(id, status, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };
}

module.exports = CallController;