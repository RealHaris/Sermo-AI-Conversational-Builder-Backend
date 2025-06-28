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
                as: 'assistant',
            });
            VapiChat.belongsTo(models.user, {
                foreignKey: 'created_by',
                as: 'creator',
            });
            VapiChat.belongsTo(models.user, {
                foreignKey: 'updated_by',
                as: 'updater',
            });
            VapiChat.hasMany(models.vapi_message, {
                foreignKey: 'chat_id',
                as: 'messages',
            });
        }
    }

    VapiChat.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            conversation_id: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            assistant_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
            created_by: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            updated_by: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            created_at: {
                type: DataTypes.DATE,
            },
            updated_at: {
                type: DataTypes.DATE,
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
