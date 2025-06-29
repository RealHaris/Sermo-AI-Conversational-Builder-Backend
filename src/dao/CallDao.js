const SuperDao = require('./SuperDao');
const models = require('../models');
const { Sequelize } = require('sequelize');

const Call = models.vapi_call;
const Assistant = models.vapi_assistant;
const User = models.user;

class CallDao extends SuperDao {
    constructor() {
        super(Call);
    }

    async createWithTransaction(call, transaction) {
        return Call.create(call, { transaction });
    }

    async deleteWhere(where) {
        return this.deleteByWhere(where);
    }

    async findAll(query = {}) {
        const { limit, offset, ...filter } = query;
        return Call.findAndCountAll({
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
            order: [['created_at', 'DESC']]
        });
    }

    async findWithPagination(page = 1, limit = 10, filter = {}) {
        const offset = (page - 1) * limit;

        return Call.findAndCountAll({
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
            ],
            order: [['created_at', 'DESC']]
        });
    }

    async findOneByWhere(where) {
        return Call.findOne({
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
                    attributes: ['id', 'uuid', 'name', 'description'],
                    required: false
                }
            ]
        });
    }

    async findByVapiCallId(vapiCallId) {
        return this.findOneByWhere({ vapi_call_id: vapiCallId });
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

    async updateCallStatus(callId, status, additionalData = {}) {
        const updateData = { status, ...additionalData };

        // Add timestamps based on status
        if (status === 'in-progress' && !additionalData.started_at) {
            updateData.started_at = new Date();
        } else if (status === 'ended' && !additionalData.ended_at) {
            updateData.ended_at = new Date();
        }

        return this.updateWhere(updateData, { id: callId });
    }

    async getActiveCallsByUser(userId) {
        return this.findByWhere({
            user_id: userId,
            status: {
                [Sequelize.Op.in]: ['queued', 'ringing', 'in-progress']
            }
        });
    }

    async getActiveCallsByAssistant(assistantId) {
        return this.findByWhere({
            assistant_id: assistantId,
            status: {
                [Sequelize.Op.in]: ['queued', 'ringing', 'in-progress']
            }
        });
    }

    async getCallsByStatus(status, limit = null) {
        const options = {
            where: {
                status: status,
                is_deleted: false
            },
            attributes: {
                exclude: ['is_deleted', 'createdAt', 'updatedAt']
            },
            order: [['created_at', 'DESC']]
        };

        if (limit) {
            options.limit = parseInt(limit, 10);
        }

        return Call.findAll(options);
    }

    async getCallsByDateRange(startDate, endDate, userId = null) {
        const whereClause = {
            created_at: {
                [Sequelize.Op.between]: [startDate, endDate]
            },
            is_deleted: false
        };

        if (userId) {
            whereClause.user_id = userId;
        }

        return this.findByWhere(whereClause);
    }

    async getCallAnalytics(callId) {
        const call = await this.findById(callId);
        if (!call) return null;

        // Calculate call duration if not already stored
        let duration = call.duration;
        if (!duration && call.started_at && call.ended_at) {
            duration = Math.round((new Date(call.ended_at) - new Date(call.started_at)) / 1000);
        }

        return {
            call_id: callId,
            duration_seconds: duration || 0,
            status: call.status,
            type: call.type,
            started_at: call.started_at,
            ended_at: call.ended_at,
            recording_available: !!call.recording_url,
            transcript_available: !!call.transcript
        };
    }

    async getRecentCalls(userId, limit = 10) {
        return Call.findAll({
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
            order: [['created_at', 'DESC']]
        });
    }

    async getPopularCallTypes(limit = 10) {
        return Call.findAll({
            attributes: [
                'type',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'call_count'],
                [Sequelize.fn('AVG', Sequelize.col('duration')), 'avg_duration']
            ],
            where: {
                is_deleted: false,
                status: 'ended'
            },
            group: ['type'],
            order: [[Sequelize.literal('call_count'), 'DESC']],
            limit: parseInt(limit, 10)
        });
    }

    async getTotalCallDuration(userId = null, assistantId = null) {
        const whereClause = {
            status: 'ended',
            is_deleted: false
        };

        if (userId) {
            whereClause.user_id = userId;
        }

        if (assistantId) {
            whereClause.assistant_id = assistantId;
        }

        const result = await Call.sum('duration', {
            where: whereClause
        });

        return result || 0;
    }

    async getCallStats(userId = null) {
        const whereClause = { is_deleted: false };
        if (userId) {
            whereClause.user_id = userId;
        }

        const [totalCalls, completedCalls, failedCalls, averageDuration] = await Promise.all([
            this.getCountByWhere(whereClause),
            this.getCountByWhere({ ...whereClause, status: 'ended' }),
            this.getCountByWhere({ ...whereClause, status: 'failed' }),
            Call.aggregate('duration', 'avg', {
                where: { ...whereClause, status: 'ended' }
            })
        ]);

        return {
            total: totalCalls,
            completed: completedCalls,
            failed: failedCalls,
            success_rate: totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0,
            average_duration: Math.round(averageDuration || 0)
        };
    }

    async searchCalls(searchTerm, userId = null, limit = 10) {
        const whereClause = {
            [Sequelize.Op.or]: [
                { customer_phone: { [Sequelize.Op.like]: `%${searchTerm}%` } },
                { transcript: { [Sequelize.Op.like]: `%${searchTerm}%` } }
            ],
            is_deleted: false
        };

        if (userId) {
            whereClause.user_id = userId;
        }

        return Call.findAll({
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
            order: [['created_at', 'DESC']]
        });
    }

    async bulkUpdateStatus(callIds, status) {
        const updateData = { status };

        // Add timestamps based on status
        if (status === 'ended') {
            updateData.ended_at = new Date();
        }

        return Call.update(
            updateData,
            {
                where: {
                    id: {
                        [Sequelize.Op.in]: callIds
                    },
                    is_deleted: false
                }
            }
        );
    }

    async getCallsRequiringCleanup(daysOld = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        return Call.findAll({
            where: {
                ended_at: {
                    [Sequelize.Op.lt]: cutoffDate
                },
                status: 'ended',
                is_deleted: false
            },
            attributes: {
                exclude: ['is_deleted', 'createdAt', 'updatedAt']
            },
            order: [['ended_at', 'ASC']]
        });
    }
}

module.exports = CallDao;
