const SuperDao = require('./SuperDao');
const models = require('../models');
const { Sequelize } = require('sequelize');

const Chat = models.vapi_chat;
const Assistant = models.vapi_assistant;
const User = models.user;

class ChatDao extends SuperDao {
    constructor() {
        super(Chat);
    }

    async createWithTransaction(chat, transaction) {
        return Chat.create(chat, { transaction });
    }

    async deleteWhere(where) {
        return this.deleteByWhere(where);
    }

    async findAll(query = {}) {
        const { limit, offset, ...filter } = query;
        return Chat.findAndCountAll({
            where: {
                ...filter,
                is_deleted: false
            },
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
            attributes: {
                exclude: ['is_deleted', 'createdAt', 'updatedAt']
            },
            include: [
                {
                    model: Assistant,
                    as: 'assistant',
                    attributes: ['id', 'uuid', 'name', 'description'],
                    required: false
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'uuid', 'full_name', 'email'],
                    required: false
                }
            ],
            order: [['last_message_at', 'DESC'], ['createdAt', 'DESC']]
        });
    }

    async findWithPagination(page = 1, limit = 10, filter = {}) {
        const offset = (page - 1) * limit;

        return Chat.findAndCountAll({
            where: {
                ...filter,
                is_deleted: false
            },
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            attributes: {
                exclude: ['is_deleted', 'createdAt', 'updatedAt']
            },
            include: [
                {
                    model: Assistant,
                    as: 'assistant',
                    attributes: ['id', 'uuid', 'name', 'description'],
                    required: false
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'uuid', 'full_name', 'email'],
                    required: false
                }
            ],
            order: [['last_message_at', 'DESC'], ['createdAt', 'DESC']]
        });
    }

    async findOneByWhere(where) {
        return Chat.findOne({
            where: {
                ...where,
                is_deleted: false
            },
            attributes: {
                exclude: ['is_deleted']
            },
            include: [
                {
                    model: Assistant,
                    as: 'assistant',
                    attributes: ['id', 'uuid', 'name', 'description', 'vapi_assistant_id'],
                    required: false
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'uuid', 'full_name', 'email'],
                    required: false
                }
            ]
        });
    }

    async findByVapiChatId(vapiChatId) {
        return this.findOneByWhere({ vapi_chat_id: vapiChatId });
    }

    async findByUserId(userId, status = null) {
        const whereClause = { user_id: userId };
        if (status) {
            whereClause.status = status;
        }
        return this.findByWhere(whereClause);
    }

    async findByAssistantId(assistantId, status = null) {
        const whereClause = { assistant_id: assistantId };
        if (status) {
            whereClause.status = status;
        }
        return this.findByWhere(whereClause);
    }

    async incrementMessageCount(chatId) {
        return this.incrementCountInFieldByWhere('message_count', { id: chatId });
    }

    async incrementVoiceMessageCount(chatId) {
        return this.incrementCountInFieldByWhere('voice_message_count', { id: chatId });
    }

    async updateLastMessageTime(chatId, timestamp = new Date()) {
        return this.updateWhere(
            { last_message_at: timestamp },
            { id: chatId }
        );
    }

    async searchByName(searchTerm, userId = null, limit = 10) {
        const whereClause = {
            name: {
                [Sequelize.Op.like]: `%${searchTerm}%`
            },
            is_deleted: false
        };

        if (userId) {
            whereClause.user_id = userId;
        }

        return Chat.findAll({
            where: whereClause,
            limit: parseInt(limit, 10),
            attributes: {
                exclude: ['is_deleted', 'createdAt', 'updatedAt']
            },
            include: [
                {
                    model: Assistant,
                    as: 'assistant',
                    attributes: ['id', 'uuid', 'name'],
                    required: false
                }
            ],
            order: [['last_message_at', 'DESC']]
        });
    }

    async getActiveChats(userId = null) {
        const whereClause = { 
            status: 'active',
            is_deleted: false
        };

        if (userId) {
            whereClause.user_id = userId;
        }

        return this.findByWhere(whereClause);
    }

    async getArchivedChats(userId = null) {
        const whereClause = { 
            status: 'archived',
            is_deleted: false
        };

        if (userId) {
            whereClause.user_id = userId;
        }

        return this.findByWhere(whereClause);
    }

    async getChatAnalytics(chatId) {
        const chat = await this.findById(chatId);
        if (!chat) return null;

        // Get related statistics
        const [messageCount, voiceMessageCount] = await Promise.all([
            models.vapi_message?.count({ where: { chat_id: chatId, is_deleted: false } }) || 0,
            models.vapi_voice_message?.count({ where: { chat_id: chatId, is_deleted: false } }) || 0
        ]);

        // Calculate chat duration (approximate based on first and last message)
        const duration = chat.last_message_at && chat.createdAt ? 
            Math.round((new Date(chat.last_message_at) - new Date(chat.createdAt)) / 1000) : 0;

        return {
            chat_id: chatId,
            total_messages: messageCount,
            total_voice_messages: voiceMessageCount,
            duration_seconds: duration,
            created_at: chat.createdAt,
            last_activity: chat.last_message_at,
            status: chat.status
        };
    }

    async getRecentChats(userId, limit = 10) {
        return Chat.findAll({
            where: {
                user_id: userId,
                is_deleted: false
            },
            limit: parseInt(limit, 10),
            attributes: {
                exclude: ['is_deleted', 'createdAt', 'updatedAt']
            },
            include: [
                {
                    model: Assistant,
                    as: 'assistant',
                    attributes: ['id', 'uuid', 'name'],
                    required: false
                }
            ],
            order: [['last_message_at', 'DESC']]
        });
    }

    async getPopularChats(limit = 10) {
        return Chat.findAll({
            where: {
                is_deleted: false,
                status: 'active'
            },
            order: [
                ['message_count', 'DESC'],
                ['voice_message_count', 'DESC'],
                ['last_message_at', 'DESC']
            ],
            limit: parseInt(limit, 10),
            attributes: {
                exclude: ['is_deleted', 'createdAt', 'updatedAt']
            },
            include: [
                {
                    model: Assistant,
                    as: 'assistant',
                    attributes: ['id', 'uuid', 'name'],
                    required: false
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'uuid', 'full_name'],
                    required: false
                }
            ]
        });
    }

    async bulkUpdateStatus(chatIds, status) {
        return Chat.update(
            { status },
            {
                where: {
                    id: {
                        [Sequelize.Op.in]: chatIds
                    },
                    is_deleted: false
                }
            }
        );
    }

    async getChatsByDateRange(startDate, endDate, userId = null) {
        const whereClause = {
            createdAt: {
                [Sequelize.Op.between]: [startDate, endDate]
            },
            is_deleted: false
        };

        if (userId) {
            whereClause.user_id = userId;
        }

        return this.findByWhere(whereClause);
    }

    async getChatsWithoutActivity(days = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        return Chat.findAll({
            where: {
                [Sequelize.Op.or]: [
                    { last_message_at: { [Sequelize.Op.lt]: cutoffDate } },
                    { last_message_at: null }
                ],
                is_deleted: false,
                status: 'active'
            },
            attributes: {
                exclude: ['is_deleted', 'createdAt', 'updatedAt']
            },
            include: [
                {
                    model: Assistant,
                    as: 'assistant',
                    attributes: ['id', 'uuid', 'name'],
                    required: false
                }
            ],
            order: [['last_message_at', 'ASC']]
        });
    }

    async getChatStats(userId = null) {
        const whereClause = { is_deleted: false };
        if (userId) {
            whereClause.user_id = userId;
        }

        const [totalChats, activeChats, archivedChats] = await Promise.all([
            this.getCountByWhere(whereClause),
            this.getCountByWhere({ ...whereClause, status: 'active' }),
            this.getCountByWhere({ ...whereClause, status: 'archived' })
        ]);

        return {
            total: totalChats,
            active: activeChats,
            archived: archivedChats
        };
    }
}

module.exports = ChatDao;