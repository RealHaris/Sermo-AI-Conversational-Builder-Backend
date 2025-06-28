const { Vapi } = require('@vapi-ai/server-sdk');
const config = require('../config/config');
const db = require('../models');
const ApiError = require('../helper/ApiError');

class VapiService {
  constructor() {
    this.vapi = new Vapi({
      apiKey: config.vapi.apiKey,
    });
  }

  async createAssistant(name, prompt, userId) {
    try {
      // Create assistant in Vapi
      const vapiAssistant = await this.vapi.assistant.create({
        name,
        prompt,
        model: 'gpt-4', // You can make this configurable
        voice: {
          provider: 'eleven_labs',
          voiceId: 'rachel', // Default voice, can be made configurable
        },
      });

      // Store in our database
      const assistant = await db.VapiAssistant.create({
        name,
        prompt,
        vapiAssistantId: vapiAssistant.id,
        createdBy: userId,
        updatedBy: userId,
      });

      return assistant;
    } catch (error) {
      throw new ApiError(error.message, 500);
    }
  }

  async startConversation(assistantId, initialMessage) {
    try {
      const assistant = await db.VapiAssistant.findByPk(assistantId);
      if (!assistant) {
        throw new ApiError('Assistant not found', 404);
      }

      const conversation = await this.vapi.conversation.create({
        assistantId: assistant.vapiAssistantId,
        messages: [
          {
            role: 'user',
            content: initialMessage,
          },
        ],
      });

      return conversation;
    } catch (error) {
      throw new ApiError(error.message, 500);
    }
  }

  async sendMessage(conversationId, message) {
    try {
      const response = await this.vapi.message.create(conversationId, {
        role: 'user',
        content: message,
      });

      return response;
    } catch (error) {
      throw new ApiError(error.message, 500);
    }
  }

  async listAssistants(userId) {
    try {
      const assistants = await db.VapiAssistant.findAll({
        where: { createdBy: userId, isActive: true },
        include: [
          {
            model: db.User,
            as: 'creator',
            attributes: ['id', 'name', 'email'],
          },
        ],
      });

      return assistants;
    } catch (error) {
      throw new ApiError(error.message, 500);
    }
  }

  async updateAssistant(assistantId, updates, userId) {
    try {
      const assistant = await db.VapiAssistant.findByPk(assistantId);
      if (!assistant) {
        throw new ApiError('Assistant not found', 404);
      }

      // Update in Vapi
      await this.vapi.assistant.update(assistant.vapiAssistantId, {
        name: updates.name,
        prompt: updates.prompt,
      });

      // Update in our database
      await assistant.update({
        ...updates,
        updatedBy: userId,
      });

      return assistant;
    } catch (error) {
      throw new ApiError(error.message, 500);
    }
  }

  async deleteAssistant(assistantId, userId) {
    try {
      const assistant = await db.VapiAssistant.findByPk(assistantId);
      if (!assistant) {
        throw new ApiError('Assistant not found', 404);
      }

      // Delete from Vapi
      await this.vapi.assistant.delete(assistant.vapiAssistantId);

      // Soft delete in our database
      await assistant.update({
        isActive: false,
        updatedBy: userId,
      });

      return { success: true };
    } catch (error) {
      throw new ApiError(error.message, 500);
    }
  }
}

module.exports = new VapiService(); 
