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
                as: 'chat',
            });
            VapiMessage.belongsTo(models.user, {
                foreignKey: 'created_by',
                as: 'creator',
            });
        }
    }

    VapiMessage.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            chat_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            role: {
                type: DataTypes.ENUM('user', 'assistant'),
                allowNull: false,
            },
            content: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            audio_url: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            cloudinary_public_id: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            audio_type: {
                type: DataTypes.ENUM('voice_note', 'call_recording', 'assistant_response'),
                allowNull: true,
            },
            duration: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            created_by: {
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
            modelName: 'vapi_message',
            underscored: true,
        },
    );
    return VapiMessage;
};
