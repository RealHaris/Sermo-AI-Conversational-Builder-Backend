const { VapiClient } = require('@vapi-ai/server-sdk');
const httpStatus = require('http-status');
const config = require('../config/config');
const VapiDao = require('../dao/VapiDao');
const CloudinaryService = require('./CloudinaryService');
const { v4: uuidv4 } = require('uuid');
const responseHandler = require('../helper/responseHandler');
const logger = require('../config/logger');

class VapiService {
  constructor() {
    this.vapi = new VapiClient({
      apiKey: config.vapi.apiKey,
    });
    this.vapiDao = new VapiDao();
  }

  async createAssistant(name, prompt, userId) {
    try {
      // Create assistant in Vapi with config from env
      const vapiAssistant = await this.vapi.assistants.create({
        name,
        model: {
          provider: 'openai',
          model: config.vapi.defaultModel,
          temperature: config.vapi.temperature,
          systemPrompt: prompt,
        },
        voice: {
          provider: config.vapi.defaultVoiceProvider,
          voiceId: config.vapi.defaultVoiceId,
        },
      });

      // Store in our database using DAO
      const assistant = await this.vapiDao.createAssistant({
        name,
        prompt,
        vapi_assistant_id: vapiAssistant.id,
        created_by: userId,
        updated_by: userId,
      });

      return responseHandler.returnSuccess(
        httpStatus.CREATED,
        'Assistant created successfully',
        assistant
      );
    } catch (error) {
      logger.error(error);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        error.message || 'Failed to create assistant'
      );
    }
  }

  async listAssistants(userId) {
    try {
      const assistants = await this.vapiDao.listAssistants(userId);
      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Assistants retrieved successfully',
        assistants
      );
    } catch (error) {
      logger.error(error);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        error.message || 'Failed to list assistants'
      );
    }
  }

  async startChat(assistantId, initialMessage, userId) {
    try {
      const assistant = await this.vapiDao.findAssistantById(assistantId);
      if (!assistant) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Assistant not found'
        );
      }

      // Create chat in Vapi
      const chat = await this.vapi.chats.create({
        assistantId: assistant.vapi_assistant_id,
      });

      // Auto-generate chat name from first message
      const chatName = await this._generateChatName(initialMessage, assistant.vapi_assistant_id);

      // Store chat details using DAO
      const vapiChat = await this.vapiDao.createChat({
        name: chatName,
        conversation_id: chat.id,
        assistant_id: assistantId,
        created_by: userId,
        updated_by: userId,
      });

      // Send initial message if provided
      let firstResponse = null;
      if (initialMessage) {
        firstResponse = await this.vapi.chats.createResponse(chat.id, {
          message: initialMessage
        });
      }

      return responseHandler.returnSuccess(
        httpStatus.CREATED,
        'Chat started successfully',
        {
          ...vapiChat.toJSON(),
          firstResponse: firstResponse
        }
      );
    } catch (error) {
      logger.error(error);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        error.message || 'Failed to start chat'
      );
    }
  }

  async renameChat(chatId, newName, userId) {
    try {
      const chat = await this.vapiDao.findChatById(chatId);
      if (!chat) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Chat not found'
        );
      }

      await this.vapiDao.updateChat(chatId, {
        name: newName,
        updated_by: userId
      });

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Chat renamed successfully',
        { chatId, newName }
      );
    } catch (error) {
      logger.error(error);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        error.message || 'Failed to rename chat'
      );
    }
  }

  async sendVoiceMessage(chatId, audioBuffer, userId) {
    try {
      const chat = await this.vapiDao.findChatById(chatId);
      if (!chat) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Chat not found'
        );
      }

      // Upload user's voice note to Cloudinary
      const userAudioPublicId = `voice_notes/${chatId}/${uuidv4()}`;
      const userAudioUrl = await CloudinaryService.uploadAudioBuffer(
        audioBuffer,
        'voice_notes',
        userAudioPublicId
      );

      // Send to Vapi
      const response = await this.vapi.chats.createResponse(chat.conversation_id, {
        audio: audioBuffer,
      });

      // Store user's message using DAO
      const userMessage = await this.vapiDao.createMessage({
        chat_id: chatId,
        role: 'user',
        content: response.transcript || '',
        audio_url: userAudioUrl,
        cloudinary_public_id: userAudioPublicId,
        audio_type: 'voice_note',
        created_by: userId
      });

      // Store assistant's response if available
      let assistantMessage = null;
      if (response.content) {
        assistantMessage = await this.vapiDao.createMessage({
          chat_id: chatId,
          role: 'assistant',
          content: response.content,
          audio_url: response.audioUrl,
          audio_type: 'assistant_response',
          created_by: userId
        });
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Voice message sent successfully',
        {
          text: response.content || '',
          audioUrl: response.audioUrl || userAudioUrl,
          messageId: assistantMessage ? assistantMessage.id : userMessage.id
        }
      );
    } catch (error) {
      logger.error(error);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        error.message || 'Failed to send voice message'
      );
    }
  }

  async startVoiceStream(chatId, userId, responseCallback) {
    try {
      const chat = await this.vapiDao.findChatById(chatId);
      if (!chat) {
        throw new ApiError('Chat not found', 404);
      }

      // TODO: Implement voice streaming with Vapi SDK
      // The streaming API needs to be verified with Vapi documentation
      // This is a placeholder implementation
      throw new ApiError('Voice streaming not yet implemented - requires Vapi SDK verification', 501);
    } catch (error) {
      throw new ApiError(error.message, 500);
    }
  }

  async getChatHistory(chatId) {
    try {
      const messages = await this.vapiDao.findMessagesByChatId(chatId);
      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Chat history retrieved successfully',
        messages
      );
    } catch (error) {
      logger.error(error);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        error.message || 'Failed to get chat history'
      );
    }
  }

  async deleteMessage(messageId, userId) {
    try {
      const message = await this.vapiDao.findMessageById(messageId);
      if (!message) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          'Message not found'
        );
      }

      // Delete audio from Cloudinary if exists
      if (message.cloudinary_public_id) {
        await CloudinaryService.deleteFile(message.cloudinary_public_id);
      }

      await this.vapiDao.deleteMessage(messageId);
      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Message deleted successfully',
        { success: true }
      );
    } catch (error) {
      logger.error(error);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        error.message || 'Failed to delete message'
      );
    }
  }

  // Private helper method to generate chat names
  async _generateChatName(firstMessage, assistantId) {
    try {
      // TODO: Implement chat name generation using Vapi SDK
      // For now, return a simple name based on timestamp
      const timestamp = new Date().toLocaleString();
      return `Chat ${timestamp}`;
    } catch (error) {
      logger.error('Error generating chat name:', error);
      return 'New Chat';
    }
  }
}

// Export the class instead of an instance
module.exports = VapiService; 
