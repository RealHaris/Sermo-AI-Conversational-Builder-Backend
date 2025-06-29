const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class VapiMessage extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            VapiMessage.belongsTo(models.vapi_chat, {
                foreignKey: 'chat_id',
                as: 'chat'
            });
            
            VapiMessage.hasOne(models.vapi_voice_message, {
                foreignKey: 'message_id',
                as: 'voice_message'
            });
        }
    }

    VapiMessage.init(
        {
            uuid: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                unique: true,
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
            role: {
                type: DataTypes.STRING(20),
                allowNull: false
            },
            content: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            message_type: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: 'text'
            },
            timestamp: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
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
            modelName: 'vapi_message',
            underscored: true,
        },
    );
    return VapiMessage;
};
