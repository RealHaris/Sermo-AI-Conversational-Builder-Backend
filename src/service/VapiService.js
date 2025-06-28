const { VapiClient } = require('@vapi-ai/server-sdk');
const config = require('../config/config');
const db = require('../models');
const ApiError = require('../helper/ApiError');
const CloudinaryService = require('./CloudinaryService');
const { v4: uuidv4 } = require('uuid');

class VapiService {
  constructor() {
    this.vapi = new VapiClient({
      apiKey: config.vapi.apiKey,
    });
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

      // Store in our database
      const assistant = await db.vapi_assistant.create({
        name,
        prompt,
        vapi_assistant_id: vapiAssistant.id,
        created_by: userId,
        updated_by: userId,
      });

      return assistant;
    } catch (error) {
      throw new ApiError(error.message, 500);
    }
  }

  async startChat(assistantId, initialMessage, userId) {
    try {
      const assistant = await db.vapi_assistant.findByPk(assistantId);
      if (!assistant) {
        throw new ApiError('Assistant not found', 404);
      }

      // Create chat in Vapi
      const chat = await this.vapi.chats.create({
        assistantId: assistant.vapi_assistant_id,
        // Initial message will be sent separately
      });

      // Auto-generate chat name from first message
      const chatName = await this._generateChatName(initialMessage, assistant.vapi_assistant_id);

      // Store chat details in our database
      const vapiChat = await db.vapi_chat.create({
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

      return {
        ...vapiChat.toJSON(),
        firstResponse: firstResponse
      };
    } catch (error) {
      throw new ApiError(error.message, 500);
    }
  }

  async renameChat(chatId, newName, userId) {
    try {
      const chat = await db.vapi_chat.findByPk(chatId);
      if (!chat) {
        throw new ApiError('Chat not found', 404);
      }

      await chat.update({
        name: newName,
        updated_by: userId
      });

      return chat;
    } catch (error) {
      throw new ApiError(error.message, 500);
    }
  }

  async sendVoiceMessage(chatId, audioBuffer, userId) {
    try {
      const chat = await db.vapi_chat.findByPk(chatId);
      if (!chat) {
        throw new ApiError('Chat not found', 404);
      }

      // Upload user's voice note to Cloudinary
      const userAudioPublicId = `voice_notes/${chatId}/${uuidv4()}`;
      const userAudioUrl = await CloudinaryService.uploadAudioBuffer(
        audioBuffer,
        'voice_notes',
        userAudioPublicId
      );

      // TODO: Implement audio message handling with Vapi SDK
      // For now, this is a placeholder as the exact API for voice messages needs verification
      const response = await this.vapi.chats.createResponse(chat.conversation_id, {
        audio: audioBuffer,
        // The exact API structure needs to be verified with Vapi documentation
      });

      // Store user's message
      const userMessage = await db.vapi_message.create({
        chat_id: chatId,
        role: 'user',
        content: response.transcript || '',
        audio_url: userAudioUrl,
        cloudinary_public_id: userAudioPublicId,
        audio_type: 'voice_note',
        created_by: userId
      });

      // Store assistant's response if available
      if (response.content) {
        const assistantMessage = await db.vapi_message.create({
          chat_id: chatId,
          role: 'assistant',
          content: response.content,
          audio_url: response.audioUrl,
          audio_type: 'assistant_response',
          created_by: userId
        });

        return {
          text: response.content,
          audioUrl: response.audioUrl,
          messageId: assistantMessage.id
        };
      }

      return {
        text: '',
        audioUrl: userAudioUrl,
        messageId: userMessage.id
      };
    } catch (error) {
      throw new ApiError(error.message, 500);
    }
  }

  async startVoiceStream(chatId, userId, responseCallback) {
    try {
      const chat = await db.vapi_chat.findByPk(chatId);
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
      const messages = await db.vapi_message.findAll({
        where: { chat_id: chatId },
        order: [['created_at', 'ASC']]
      });

      return messages;
    } catch (error) {
      throw new ApiError(error.message, 500);
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
      console.error('Error generating chat name:', error);
      return 'New Chat';
    }
  }

  async deleteMessage(messageId, userId) {
    try {
      const message = await db.vapi_message.findByPk(messageId);
      if (!message) {
        throw new ApiError('Message not found', 404);
      }

      // Delete audio from Cloudinary if exists
      if (message.cloudinary_public_id) {
        await CloudinaryService.deleteFile(message.cloudinary_public_id);
      }

      await message.destroy();
      return { success: true };
    } catch (error) {
      throw new ApiError(error.message, 500);
    }
  }
}

module.exports = new VapiService(); 
