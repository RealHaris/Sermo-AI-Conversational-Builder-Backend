const SuperDao = require('./SuperDao');
const models = require('../models');
const { Sequelize } = require('sequelize');

const Message = models.vapi_message;

class MessageDao extends SuperDao {
    constructor() {
        super(Message);
    }

    async createWithTransaction(message, transaction) {
        return Message.create(message, { transaction });
    }

    async deleteWhere(where) {
        return this.deleteByWhere(where);
    }

    async findByChatId(chatId, limit = null, offset = null) {
        const options = {
            where: {
                chat_id: chatId,
                is_deleted: false
            },
            attributes: {
                exclude: ['is_deleted', 'createdAt', 'updatedAt']
            },
            order: [['created_at', 'ASC']]
        };

        if (limit) {
            options.limit = parseInt(limit, 10);
        }

        if (offset) {
            options.offset = parseInt(offset, 10);
        }

        return Message.findAll(options);
    }

    async findByRole(chatId, role) {
        return this.findByWhere({
            chat_id: chatId,
            role: role
        });
    }

    async getMessagesByDateRange(chatId, startDate, endDate) {
        return Message.findAll({
            where: {
                chat_id: chatId,
                created_at: {
                    [Sequelize.Op.between]: [startDate, endDate]
                },
                is_deleted: false
            },
            attributes: {
                exclude: ['is_deleted', 'createdAt', 'updatedAt']
            },
            order: [['created_at', 'ASC']]
        });
    }

    async getLastMessage(chatId) {
        return Message.findOne({
            where: {
                chat_id: chatId,
                is_deleted: false
            },
            attributes: {
                exclude: ['is_deleted', 'createdAt', 'updatedAt']
            },
            order: [['created_at', 'DESC']]
        });
    }

    async getMessageCount(chatId, role = null) {
        const whereClause = {
            chat_id: chatId,
            is_deleted: false
        };

        if (role) {
            whereClause.role = role;
        }

        return this.getCountByWhere(whereClause);
    }

    async searchMessages(chatId, searchTerm, limit = 10) {
        return Message.findAll({
            where: {
                chat_id: chatId,
                content: {
                    [Sequelize.Op.like]: `%${searchTerm}%`
                },
                is_deleted: false
            },
            limit: parseInt(limit, 10),
            attributes: {
                exclude: ['is_deleted', 'createdAt', 'updatedAt']
            },
            order: [['created_at', 'DESC']]
        });
    }

    async getMessageAnalytics(chatId) {
        const [userMessages, assistantMessages, totalCharacters] = await Promise.all([
            this.getCountByWhere({ chat_id: chatId, role: 'user' }),
            this.getCountByWhere({ chat_id: chatId, role: 'assistant' }),
            Message.sum('LENGTH(content)', {
                where: {
                    chat_id: chatId,
                    is_deleted: false
                }
            })
        ]);

        return {
            total_messages: userMessages + assistantMessages,
            user_messages: userMessages,
            assistant_messages: assistantMessages,
            total_characters: totalCharacters || 0,
            avg_message_length: totalCharacters ? Math.round(totalCharacters / (userMessages + assistantMessages)) : 0
        };
    }
}

module.exports = MessageDao;