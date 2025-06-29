const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const VoiceMessage = sequelize.define('voice_message', {
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
        message_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'messages',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        chat_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'chats',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
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
        // Audio file information
        audio_url: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: true,
                isUrl: true
            }
        },
        cloudinary_public_id: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        file_size: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: {
                min: 0
            }
        },
        duration: {
            type: DataTypes.FLOAT,
            allowNull: true,
            validate: {
                min: 0
            },
            comment: 'Duration in seconds'
        },
        format: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'mp3',
            validate: {
                isIn: [['mp3', 'wav', 'ogg', 'm4a', 'webm']]
            }
        },
        // Transcription information
        transcript: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        transcript_confidence: {
            type: DataTypes.FLOAT,
            allowNull: true,
            validate: {
                min: 0,
                max: 1
            }
        },
        transcriber_used: {
            type: DataTypes.STRING(50),
            allowNull: true,
            validate: {
                isIn: [['deepgram', 'assemblyai', 'openai', 'mock']]
            }
        },
        // Processing status
        processing_status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'processing', 'completed', 'failed']]
            }
        },
        error_message: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        // Metadata
        language: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'en'
        },
        quality_score: {
            type: DataTypes.FLOAT,
            allowNull: true,
            validate: {
                min: 0,
                max: 1
            }
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: {}
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
        tableName: 'voice_messages',
        timestamps: true,
        paranoid: false,
        indexes: [
            {
                unique: true,
                fields: ['uuid']
            },
            {
                unique: true,
                fields: ['message_id']
            },
            {
                fields: ['chat_id']
            },
            {
                fields: ['user_id']
            },
            {
                fields: ['processing_status']
            },
            {
                fields: ['is_deleted']
            },
            {
                fields: ['duration']
            },
            {
                fields: ['createdAt']
            }
        ]
    });

    VoiceMessage.associate = function(models) {
        VoiceMessage.belongsTo(models.message, {
            foreignKey: 'message_id',
            as: 'message'
        });
        
        VoiceMessage.belongsTo(models.chat, {
            foreignKey: 'chat_id',
            as: 'chat'
        });
        
        VoiceMessage.belongsTo(models.user, {
            foreignKey: 'user_id',
            as: 'user'
        });
    };

    return VoiceMessage;
};