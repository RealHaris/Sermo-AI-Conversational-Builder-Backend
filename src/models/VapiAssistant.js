const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class VapiAssistant extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            VapiAssistant.hasMany(models.vapi_chat, {
                foreignKey: 'assistant_id',
                as: 'chats'
            });
            
            VapiAssistant.hasMany(models.vapi_call, {
                foreignKey: 'assistant_id',
                as: 'calls'
            });
        }
    }

    VapiAssistant.init(
        {
            uuid: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                unique: true,
                allowNull: false
            },
            vapi_assistant_id: {
                type: DataTypes.STRING(100),
                allowNull: true,
                unique: true
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: false
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            system_prompt: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            model_provider: {
                type: DataTypes.STRING(50),
                allowNull: false,
                defaultValue: 'openai'
            },
            model_name: {
                type: DataTypes.STRING(100),
                allowNull: false,
                defaultValue: 'gpt-4'
            },
            temperature: {
                type: DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0.7
            },
            max_tokens: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 500
            },
            voice_provider: {
                type: DataTypes.STRING(50),
                allowNull: false,
                defaultValue: 'elevenlabs'
            },
            voice_id: {
                type: DataTypes.STRING(100),
                allowNull: false,
                defaultValue: 'burt'
            },
            voice_speed: {
                type: DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 1.0
            },
            voice_stability: {
                type: DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0.5
            },
            voice_similarity_boost: {
                type: DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 0.75
            },
            transcriber_provider: {
                type: DataTypes.STRING(50),
                allowNull: false,
                defaultValue: 'deepgram'
            },
            transcriber_model: {
                type: DataTypes.STRING(100),
                allowNull: false,
                defaultValue: 'nova-2'
            },
            language: {
                type: DataTypes.STRING(10),
                allowNull: false,
                defaultValue: 'en'
            },
            first_message: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            silence_timeout: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 30
            },
            max_duration: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1800
            },
            background_sound: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: 'off'
            },
            status: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1
            },
            chat_count: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            call_count: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            tags: {
                type: DataTypes.JSON,
                allowNull: true,
                defaultValue: []
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
            modelName: 'vapi_assistant',
            underscored: true,
        },
    );
    return VapiAssistant;
};
