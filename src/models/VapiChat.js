const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class VapiChat extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            VapiChat.belongsTo(models.vapi_assistant, {
                foreignKey: 'assistant_id',
                as: 'assistant'
            });
            
            VapiChat.hasMany(models.vapi_message, {
                foreignKey: 'chat_id',
                as: 'messages'
            });
            
            VapiChat.hasMany(models.vapi_voice_message, {
                foreignKey: 'chat_id',
                as: 'voice_messages'
            });
            
            VapiChat.hasMany(models.vapi_call, {
                foreignKey: 'chat_id',
                as: 'calls'
            });
        }
    }

    VapiChat.init(
        {
            uuid: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                unique: true,
                allowNull: false
            },
            vapi_chat_id: {
                type: DataTypes.STRING(100),
                allowNull: true,
                unique: true
            },
            assistant_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: true
            },
            status: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: 'active'
            },
            message_count: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            voice_message_count: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            call_count: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            last_message_at: {
                type: DataTypes.DATE,
                allowNull: true
            },
            summary: {
                type: DataTypes.TEXT,
                allowNull: true
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
            modelName: 'vapi_chat',
            underscored: true,
        },
    );
    return VapiChat;
};
