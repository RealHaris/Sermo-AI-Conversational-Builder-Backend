const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class VapiVoiceMessage extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            VapiVoiceMessage.belongsTo(models.vapi_message, {
                foreignKey: 'message_id',
                as: 'message'
            });
            
            VapiVoiceMessage.belongsTo(models.vapi_chat, {
                foreignKey: 'chat_id',
                as: 'chat'
            });
        }
    }

    VapiVoiceMessage.init(
        {
            uuid: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                unique: true,
                allowNull: false
            },
            message_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            chat_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            audio_url: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            cloudinary_public_id: {
                type: DataTypes.STRING(255),
                allowNull: true
            },
            file_size: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            duration: {
                type: DataTypes.FLOAT,
                allowNull: true
            },
            format: {
                type: DataTypes.STRING(10),
                allowNull: false,
                defaultValue: 'mp3'
            },
            transcript: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            transcript_confidence: {
                type: DataTypes.FLOAT,
                allowNull: true
            },
            transcriber_used: {
                type: DataTypes.STRING(50),
                allowNull: true
            },
            processing_status: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: 'pending'
            },
            error_message: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            language: {
                type: DataTypes.STRING(10),
                allowNull: false,
                defaultValue: 'en'
            },
            quality_score: {
                type: DataTypes.FLOAT,
                allowNull: true
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
        },
        {
            sequelize,
            modelName: 'vapi_voice_message',
            underscored: true,
        },
    );
    return VapiVoiceMessage;
};
