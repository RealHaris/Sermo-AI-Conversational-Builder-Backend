const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Message = sequelize.define('message', {
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
        role: {
            type: DataTypes.STRING(20),
            allowNull: false,
            validate: {
                isIn: [['user', 'assistant', 'system']]
            }
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [1, 10000]
            }
        },
        message_type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'text',
            validate: {
                isIn: [['text', 'voice', 'system']]
            }
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
    }, {
        tableName: 'messages',
        timestamps: true,
        paranoid: false,
        indexes: [
            {
                unique: true,
                fields: ['uuid']
            },
            {
                fields: ['chat_id']
            },
            {
                fields: ['user_id']
            },
            {
                fields: ['role']
            },
            {
                fields: ['message_type']
            },
            {
                fields: ['is_deleted']
            },
            {
                fields: ['timestamp']
            },
            {
                fields: ['createdAt']
            }
        ]
    });

    Message.associate = function(models) {
        Message.belongsTo(models.chat, {
            foreignKey: 'chat_id',
            as: 'chat'
        });
        
        Message.belongsTo(models.user, {
            foreignKey: 'user_id',
            as: 'user'
        });
        
        Message.hasOne(models.voice_message, {
            foreignKey: 'message_id',
            as: 'voice_message',
            onDelete: 'CASCADE'
        });
    };

    return Message;
};