const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class VapiCall extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            VapiCall.belongsTo(models.vapi_chat, {
                foreignKey: 'chat_id',
                as: 'chat'
            });
        }
    }

    VapiCall.init(
        {
            uuid: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                unique: true,
                allowNull: false
            },
            vapi_call_id: {
                type: DataTypes.STRING(100),
                allowNull: true,
                unique: true
            },
            chat_id: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            customer_number: {
                type: DataTypes.STRING(20),
                allowNull: true
            },
            phone_number_id: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            status: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: 'pending'
            },
            end_reason: {
                type: DataTypes.STRING(50),
                allowNull: true
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
                allowNull: true
            },
            cost: {
                type: DataTypes.DECIMAL(10, 4),
                allowNull: true
            },
            cost_breakdown: {
                type: DataTypes.JSON,
                allowNull: true,
                defaultValue: {}
            },
            recording_url: {
                type: DataTypes.TEXT,
                allowNull: true
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
            summary: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            analysis: {
                type: DataTypes.JSON,
                allowNull: true,
                defaultValue: {}
            },
            stereo_recording_url: {
                type: DataTypes.TEXT,
                allowNull: true
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
                defaultValue: 0
            },
            quality_rating: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            quality_feedback: {
                type: DataTypes.TEXT,
                allowNull: true
            },
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
        },
        {
            sequelize,
            modelName: 'vapi_call',
            underscored: true,
        },
    );
    return VapiCall;
};
