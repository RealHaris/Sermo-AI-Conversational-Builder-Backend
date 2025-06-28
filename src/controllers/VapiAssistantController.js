const httpStatus = require('http-status');
const VapiService = require('../service/VapiService');

class VapiAssistantController {
  constructor() {
    this.vapiService = new VapiService();
  }

  /**
   * Create a new assistant
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  async createAssistant(req, res) {
    try {
      const { name, prompt } = req.body;
      const userId = req.user.id;

      const result = await this.vapiService.createAssistant(name, prompt, userId);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  }

  /**
   * List all assistants for a user
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  async listAssistants(req, res) {
    try {
      const userId = req.user.id;
      const result = await this.vapiService.listAssistants(userId);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  }

  /**
   * Start a new chat with an assistant
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  async startChat(req, res) {
    try {
      const { assistantId, message } = req.body;
      const userId = req.user.id;
      const result = await this.vapiService.startChat(assistantId, message, userId);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  }

  /**
   * Send a voice message in a chat
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  async sendVoiceMessage(req, res) {
    try {
      const { chatId } = req.params;
      const audioBuffer = req.file.buffer;
      const userId = req.user.id;
      const result = await this.vapiService.sendVoiceMessage(chatId, audioBuffer, userId);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  }

  /**
   * Rename an existing chat
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  async renameChat(req, res) {
    try {
      const { chatId } = req.params;
      const { name } = req.body;
      const userId = req.user.id;
      const result = await this.vapiService.renameChat(chatId, name, userId);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  }

  /**
   * Get chat history
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  async getChatHistory(req, res) {
    try {
      const { chatId } = req.params;
      const result = await this.vapiService.getChatHistory(chatId);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  }

  /**
   * Delete a message
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;
      const result = await this.vapiService.deleteMessage(messageId, userId);
      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      return res.status(httpStatus.BAD_REQUEST).json({
        code: httpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  }
}

module.exports = VapiAssistantController;


// module.exports = new VapiAssistantController(); 
