const SuperDao = require('./SuperDao');
const models = require('../models');
const { Sequelize } = require('sequelize');

const VapiAssistant = models.vapi_assistant;
const VapiChat = models.vapi_chat;
const VapiMessage = models.vapi_message;

class VapiDao extends SuperDao {
  constructor() {
    super(VapiAssistant);
  }

  async createAssistant(assistantData) {
    return VapiAssistant.create(assistantData);
  }

  async findAssistantById(id) {
    return VapiAssistant.findOne({
      where: {
        id,
        is_deleted: false
      }
    });
  }

  async findAssistantByVapiId(vapiAssistantId) {
    return VapiAssistant.findOne({
      where: {
        vapi_assistant_id: vapiAssistantId,
        is_deleted: false
      }
    });
  }

  async listAssistants(userId) {
    return VapiAssistant.findAll({
      where: {
        created_by: userId,
        is_deleted: false
      },
      order: [['createdAt', 'DESC']]
    });
  }

  async updateAssistant(id, updates) {
    return this.updateWhere(updates, { id });
  }

  async deleteAssistant(id) {
    return this.deleteByWhere({ id });
  }

  // Chat methods
  async createChat(chatData) {
    return VapiChat.create(chatData);
  }

  async findChatById(id) {
    return VapiChat.findOne({
      where: {
        id,
        is_deleted: false
      },
      include: [
        {
          model: VapiAssistant,
          as: 'assistant',
          attributes: ['id', 'name', 'vapi_assistant_id'],
          required: false
        }
      ]
    });
  }

  async findChatByConversationId(conversationId) {
    return VapiChat.findOne({
      where: {
        conversation_id: conversationId,
        is_deleted: false
      }
    });
  }

  async updateChat(id, updates) {
    return VapiChat.update(updates, {
      where: {
        id,
        is_deleted: false
      }
    });
  }

  async deleteChat(id) {
    return this.deleteByWhere({ id });
  }

  // Message methods
  async createMessage(messageData) {
    return VapiMessage.create(messageData);
  }

  async findMessageById(id) {
    return VapiMessage.findOne({
      where: {
        id,
        is_deleted: false
      }
    });
  }

  async findMessagesByChatId(chatId) {
    return VapiMessage.findAll({
      where: {
        chat_id: chatId,
        is_deleted: false
      },
      order: [['createdAt', 'ASC']]
    });
  }

  async deleteMessage(id) {
    return this.deleteByWhere({ id });
  }

  async findChatsByAssistantId(assistantId) {
    return VapiChat.findAll({
      where: {
        assistant_id: assistantId,
        is_deleted: false
      },
      order: [['createdAt', 'DESC']]
    });
  }

  async findChatsByUserId(userId) {
    return VapiChat.findAll({
      where: {
        created_by: userId,
        is_deleted: false
      },
      include: [
        {
          model: VapiAssistant,
          as: 'assistant',
          attributes: ['id', 'name', 'vapi_assistant_id'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  }
}

module.exports = VapiDao; 
