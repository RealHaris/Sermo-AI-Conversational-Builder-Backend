const VapiService = require('../service/VapiService');
const { responseHandler } = require('../helper/responseHandler');

class VapiAssistantController {
  async createAssistant(req, res, next) {
    try {
      const { name, prompt } = req.body;
      const userId = req.user.id;

      const assistant = await VapiService.createAssistant(name, prompt, userId);
      return responseHandler.success(res, assistant);
    } catch (error) {
      next(error);
    }
  }

  async listAssistants(req, res, next) {
    try {
      const userId = req.user.id;
      const assistants = await VapiService.listAssistants(userId);
      return responseHandler.success(res, assistants);
    } catch (error) {
      next(error);
    }
  }

  async startConversation(req, res, next) {
    try {
      const { assistantId, message } = req.body;
      const conversation = await VapiService.startConversation(assistantId, message);
      return responseHandler.success(res, conversation);
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req, res, next) {
    try {
      const { conversationId, message } = req.body;
      const response = await VapiService.sendMessage(conversationId, message);
      return responseHandler.success(res, response);
    } catch (error) {
      next(error);
    }
  }

  async updateAssistant(req, res, next) {
    try {
      const { assistantId } = req.params;
      const updates = req.body;
      const userId = req.user.id;

      const assistant = await VapiService.updateAssistant(assistantId, updates, userId);
      return responseHandler.success(res, assistant);
    } catch (error) {
      next(error);
    }
  }

  async deleteAssistant(req, res, next) {
    try {
      const { assistantId } = req.params;
      const userId = req.user.id;

      const result = await VapiService.deleteAssistant(assistantId, userId);
      return responseHandler.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VapiAssistantController(); 
