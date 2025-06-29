const SuperDao = require('./SuperDao');
const models = require('../models');
const { Sequelize } = require('sequelize');

const Assistant = models.vapi_assistant;

class AssistantDao extends SuperDao {
    constructor() {
        super(Assistant);
    }

    async createWithTransaction(assistant, transaction) {
        return Assistant.create(assistant, { transaction });
    }

    async deleteWhere(where) {
        return this.deleteByWhere(where);
    }

    async findAll(query = {}) {
        const { limit, offset, ...filter } = query;
        return Assistant.findAndCountAll({
            where: {
                ...filter,
                is_deleted: false
            },
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
            attributes: {
                exclude: ['is_deleted', 'createdAt', 'updatedAt']
            },
            order: [['createdAt', 'DESC']]
        });
    }

    async findWithPagination(page = 1, limit = 10, filter = {}) {
        const offset = (page - 1) * limit;

        return Assistant.findAndCountAll({
            where: {
                ...filter,
                is_deleted: false
            },
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            attributes: {
                exclude: ['is_deleted', 'createdAt', 'updatedAt']
            },
            order: [['createdAt', 'DESC']]
        });
    }

    async findOneByWhere(where) {
        return Assistant.findOne({
            where: {
                ...where,
                is_deleted: false
            },
            attributes: {
                exclude: ['is_deleted']
            }
        });
    }

    async findByVapiAssistantId(vapiAssistantId) {
        return this.findOneByWhere({ vapi_assistant_id: vapiAssistantId });
    }

    async changeStatus(uuid, status) {
        return this.updateWhere(
            { status },
            { uuid }
        );
    }

    async incrementChatCount(assistantId) {
        return this.incrementCountInFieldByWhere('chat_count', { id: assistantId });
    }

    async incrementCallCount(assistantId) {
        return this.incrementCountInFieldByWhere('call_count', { id: assistantId });
    }

    async decrementChatCount(assistantId) {
        return this.decrementCountInFieldByWhere('chat_count', { id: assistantId });
    }

    async decrementCallCount(assistantId) {
        return this.decrementCountInFieldByWhere('call_count', { id: assistantId });
    }

    async getActiveAssistants() {
        return this.findByWhere({ status: 1 });
    }

    async searchByName(searchTerm, limit = 10) {
        return Assistant.findAll({
            where: {
                name: {
                    [Sequelize.Op.like]: `%${searchTerm}%`
                },
                is_deleted: false
            },
            limit: parseInt(limit, 10),
            attributes: {
                exclude: ['is_deleted', 'createdAt', 'updatedAt']
            },
            order: [['name', 'ASC']]
        });
    }

    async getAssistantStats(assistantId) {
        const assistant = await this.findById(assistantId);
        if (!assistant) return null;

        // Get related stats from other tables
        const [chatCount, callCount] = await Promise.all([
            models.vapi_chat?.count({ where: { assistant_id: assistantId, is_deleted: false } }) || 0,
            models.vapi_call?.count({ where: { assistant_id: assistantId, is_deleted: false } }) || 0
        ]);

        return {
            ...assistant.toJSON(),
            stats: {
                total_chats: chatCount,
                total_calls: callCount,
                created_at: assistant.createdAt,
                updated_at: assistant.updatedAt
            }
        };
    }

    async updateVapiAssistantId(uuid, vapiAssistantId) {
        return this.updateWhere(
            { vapi_assistant_id: vapiAssistantId },
            { uuid }
        );
    }

    async findAssistantsWithoutVapiId() {
        return this.findByWhere({
            vapi_assistant_id: null
        });
    }

    async getPopularAssistants(limit = 5) {
        return Assistant.findAll({
            where: {
                is_deleted: false,
                status: 1
            },
            order: [
                ['chat_count', 'DESC'],
                ['call_count', 'DESC'],
                ['createdAt', 'DESC']
            ],
            limit: parseInt(limit, 10),
            attributes: {
                exclude: ['is_deleted', 'createdAt', 'updatedAt']
            }
        });
    }

    async getRecentlyUsedAssistants(userId, limit = 5) {
        // This would require a join with chat/call tables to get recently used assistants by user
        return Assistant.findAll({
            where: {
                is_deleted: false,
                status: 1
            },
            include: [
                {
                    model: models.vapi_chat,
                    as: 'chats',
                    where: { user_id: userId, is_deleted: false },
                    required: true,
                    attributes: ['id'],
                    limit: 1,
                    order: [['createdAt', 'DESC']]
                }
            ],
            order: [['chats', 'createdAt', 'DESC']],
            limit: parseInt(limit, 10),
            attributes: {
                exclude: ['is_deleted', 'createdAt', 'updatedAt']
            }
        });
    }

    async bulkUpdateStatus(assistantIds, status) {
        return Assistant.update(
            { status },
            {
                where: {
                    id: {
                        [Sequelize.Op.in]: assistantIds
                    },
                    is_deleted: false
                }
            }
        );
    }

    async getAssistantsByProvider(provider, limit = null) {
        const whereClause = {
            is_deleted: false
        };

        // Search in model_provider or voice_provider
        whereClause[Sequelize.Op.or] = [
            { model_provider: provider },
            { voice_provider: provider },
            { transcriber_provider: provider }
        ];

        const options = {
            where: whereClause,
            attributes: {
                exclude: ['is_deleted', 'createdAt', 'updatedAt']
            },
            order: [['name', 'ASC']]
        };

        if (limit) {
            options.limit = parseInt(limit, 10);
        }

        return Assistant.findAll(options);
    }
}

module.exports = AssistantDao;