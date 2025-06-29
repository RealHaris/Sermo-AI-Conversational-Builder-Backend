const SuperDao = require('./SuperDao');
const models = require('../models');
const { Sequelize } = require('sequelize');

const VoiceMessage = models.voice_message;

class VoiceMessageDao extends SuperDao {
    constructor() {
        super(VoiceMessage);
    }

    async createWithTransaction(voiceMessage, transaction) {
        return VoiceMessage.create(voiceMessage, { transaction });
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

        return VoiceMessage.findAll(options);
    }

    async findByCallId(callId, limit = null, offset = null) {
        const options = {
            where: {
                call_id: callId,
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

        return VoiceMessage.findAll(options);
    }

    async findByRole(chatId, role) {
        return this.findByWhere({
            chat_id: chatId,
            role: role
        });
    }

    async findTranscribed(chatId = null) {
        const whereClause = {
            is_transcribed: true,
            is_deleted: false
        };

        if (chatId) {
            whereClause.chat_id = chatId;
        }

        return this.findByWhere(whereClause);
    }

    async findUntranscribed(chatId = null) {
        const whereClause = {
            is_transcribed: false,
            is_deleted: false
        };

        if (chatId) {
            whereClause.chat_id = chatId;
        }

        return this.findByWhere(whereClause);
    }

    async getVoiceMessagesByDateRange(chatId, startDate, endDate) {
        return VoiceMessage.findAll({
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

    async getLastVoiceMessage(chatId) {
        return VoiceMessage.findOne({
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

    async getVoiceMessageCount(chatId, role = null) {
        const whereClause = {
            chat_id: chatId,
            is_deleted: false
        };

        if (role) {
            whereClause.role = role;
        }

        return this.getCountByWhere(whereClause);
    }

    async getTotalDuration(chatId, role = null) {
        const whereClause = {
            chat_id: chatId,
            is_deleted: false
        };

        if (role) {
            whereClause.role = role;
        }

        const result = await VoiceMessage.sum('duration', {
            where: whereClause
        });

        return result || 0;
    }

    async getTotalFileSize(chatId, role = null) {
        const whereClause = {
            chat_id: chatId,
            is_deleted: false
        };

        if (role) {
            whereClause.role = role;
        }

        const result = await VoiceMessage.sum('file_size', {
            where: whereClause
        });

        return result || 0;
    }

    async searchByTranscription(chatId, searchTerm, limit = 10) {
        return VoiceMessage.findAll({
            where: {
                chat_id: chatId,
                transcription: {
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

    async getVoiceMessageAnalytics(chatId) {
        const [
            totalVoiceMessages,
            userVoiceMessages,
            assistantVoiceMessages,
            totalDuration,
            totalFileSize,
            transcribedCount
        ] = await Promise.all([
            this.getCountByWhere({ chat_id: chatId }),
            this.getCountByWhere({ chat_id: chatId, role: 'user' }),
            this.getCountByWhere({ chat_id: chatId, role: 'assistant' }),
            this.getTotalDuration(chatId),
            this.getTotalFileSize(chatId),
            this.getCountByWhere({ chat_id: chatId, is_transcribed: true })
        ]);

        return {
            total_voice_messages: totalVoiceMessages,
            user_voice_messages: userVoiceMessages,
            assistant_voice_messages: assistantVoiceMessages,
            total_duration_seconds: totalDuration,
            total_file_size_bytes: totalFileSize,
            transcribed_count: transcribedCount,
            transcription_rate: totalVoiceMessages > 0 ? (transcribedCount / totalVoiceMessages) * 100 : 0,
            avg_duration: totalVoiceMessages > 0 ? totalDuration / totalVoiceMessages : 0,
            avg_file_size: totalVoiceMessages > 0 ? totalFileSize / totalVoiceMessages : 0
        };
    }

    async getVoiceMessagesByCloudinaryUrl(audioUrl) {
        return this.findByWhere({ audio_url: audioUrl });
    }

    async markAsTranscribed(voiceMessageId, transcription, confidence = null) {
        return this.updateWhere(
            {
                transcription: transcription,
                is_transcribed: true,
                transcription_confidence: confidence
            },
            { id: voiceMessageId }
        );
    }

    async getUntranscribedForProcessing(limit = 10) {
        return VoiceMessage.findAll({
            where: {
                is_transcribed: false,
                is_deleted: false,
                audio_url: {
                    [Sequelize.Op.ne]: null
                }
            },
            limit: parseInt(limit, 10),
            attributes: {
                exclude: ['is_deleted', 'createdAt', 'updatedAt']
            },
            order: [['created_at', 'ASC']]
        });
    }

    async bulkUpdateTranscriptionStatus(voiceMessageIds, isTranscribed) {
        return VoiceMessage.update(
            { is_transcribed: isTranscribed },
            {
                where: {
                    id: {
                        [Sequelize.Op.in]: voiceMessageIds
                    },
                    is_deleted: false
                }
            }
        );
    }
}

module.exports = VoiceMessageDao;