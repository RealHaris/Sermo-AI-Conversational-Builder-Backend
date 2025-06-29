const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Call = sequelize.define('call', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        uuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            unique: true,
            allowNull: false
        },
        vapi_call_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
            unique: true,
            comment: 'Vapi API Call ID'
        },
        assistant_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'assistants',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        chat_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'chats',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        },
        // Call details
        customer_number: {
            type: DataTypes.STRING(20),
            allowNull: true,
            validate: {
                len: [0, 20]
            }
        },
        phone_number_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Vapi phone number ID used for the call'
        },
        // Call status and timing
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'ringing', 'in-progress', 'forwarding', 'ended']]
            }
        },
        end_reason: {
            type: DataTypes.STRING(50),
            allowNull: true,
            validate: {
                isIn: [['assistant-ended', 'customer-ended', 'assistant-forwarded-call', 'assistant-join-timeout', 'exceeded-max-duration', 'manually-ended', 'pipeline-error-openai-llm-failed', 'pipeline-error-azure-voice-failed', 'pipeline-error-elevenlabs-voice-failed', 'pipeline-error-playht-voice-failed', 'pipeline-error-deepgram-transcriber-failed', 'pipeline-error-gladia-transcriber-failed', 'pipeline-error-assemblyai-transcriber-failed']]
            }
        },
        started_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        ended_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        duration: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: {
                min: 0
            },
            comment: 'Call duration in seconds'
        },
        // Cost and usage
        cost: {
            type: DataTypes.DECIMAL(10, 4),
            allowNull: true,
            validate: {
                min: 0
            }
        },
        cost_breakdown: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: {}
        },
        // Recording and transcript
        recording_url: {
            type: DataTypes.TEXT,
            allowNull: true,
            validate: {
                isUrl: true
            }
        },
        transcript: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        transcript_object: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: {}
        },
        // Analysis and insights
        summary: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        analysis: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: {}
        },
        // Technical details
        stereo_recording_url: {
            type: DataTypes.TEXT,
            allowNull: true,
            validate: {
                isUrl: true
            }
        },
        artifact: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: {}
        },
        messages: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: []
        },
        message_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: 0
            }
        },
        // Quality metrics
        quality_rating: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: {
                min: 1,
                max: 5
            }
        },
        quality_feedback: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        // Metadata
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: {}
        },
        tags: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: []
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        deleted_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'calls',
        timestamps: true,
        paranoid: false,
        indexes: [
            {
                unique: true,
                fields: ['uuid']
            },
            {
                unique: true,
                fields: ['vapi_call_id'],
                where: {
                    vapi_call_id: {
                        [sequelize.Sequelize.Op.ne]: null
                    }
                }
            },
            {
                fields: ['assistant_id']
            },
            {
                fields: ['chat_id']
            },
            {
                fields: ['user_id']
            },
            {
                fields: ['status']
            },
            {
                fields: ['customer_number']
            },
            {
                fields: ['is_deleted']
            },
            {
                fields: ['started_at']
            },
            {
                fields: ['ended_at']
            },
            {
                fields: ['duration']
            },
            {
                fields: ['createdAt']
            }
        ]
    });

    Call.associate = function(models) {
        Call.belongsTo(models.assistant, {
            foreignKey: 'assistant_id',
            as: 'assistant'
        });
        
        Call.belongsTo(models.chat, {
            foreignKey: 'chat_id',
            as: 'chat'
        });
        
        Call.belongsTo(models.user, {
            foreignKey: 'user_id',
            as: 'user'
        });
    };

    return Call;
};