const httpStatus = require('http-status');
const ChatService = require('../service/ChatService');

class ChatController {
  constructor() {
    this.chatService = new ChatService();
  }

  /**
   * Get all chats
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  getChats = async (req, res) => {
    try {
      const result = await this.chatService.getChats(req.query, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Get chat by ID
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  getChatById = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.chatService.getChatById(id, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Get chat history/messages
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  getChatHistory = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.chatService.getChatHistory(id, req.query, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Create a new chat
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  createChat = async (req, res) => {
    try {
      const result = await this.chatService.createChat(req.body, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Update chat
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  updateChat = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.chatService.updateChat(id, req.body, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Delete chat
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  deleteChat = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.chatService.deleteChat(id, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Send message to chat
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  sendMessage = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.chatService.sendMessage(id, req.body, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Send voice message to chat
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  sendVoiceMessage = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.chatService.sendVoiceMessage(id, req.body, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Get chat analytics
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  getChatAnalytics = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.chatService.getChatAnalytics(id, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };

  /**
   * Archive/unarchive chat
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  archiveChat = async (req, res) => {
    try {
      const { id } = req.params;
      const { archived } = req.body;
      const result = await this.chatService.archiveChat(id, archived, req.user);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  };
}

module.exports = ChatController;
