const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Chat = sequelize.define('chat', {
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
        vapi_chat_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
            unique: true,
            comment: 'Vapi API Chat ID'
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
        name: {
            type: DataTypes.STRING(255),
            allowNull: true,
            validate: {
                len: [0, 255]
            }
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'active',
            validate: {
                isIn: [['active', 'archived', 'deleted']]
            }
        },
        message_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: 0
            }
        },
        voice_message_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: 0
            }
        },
        call_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: 0
            }
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
    }, {
        tableName: 'chats',
        timestamps: true,
        paranoid: false,
        indexes: [
            {
                unique: true,
                fields: ['uuid']
            },
            {
                unique: true,
                fields: ['vapi_chat_id'],
                where: {
                    vapi_chat_id: {
                        [sequelize.Sequelize.Op.ne]: null
                    }
                }
            },
            {
                fields: ['assistant_id']
            },
            {
                fields: ['user_id']
            },
            {
                fields: ['status']
            },
            {
                fields: ['is_deleted']
            },
            {
                fields: ['last_message_at']
            },
            {
                fields: ['createdAt']
            }
        ]
    });

    Chat.associate = function(models) {
        Chat.belongsTo(models.assistant, {
            foreignKey: 'assistant_id',
            as: 'assistant'
        });
        
        Chat.belongsTo(models.user, {
            foreignKey: 'user_id',
            as: 'user'
        });
        
        Chat.hasMany(models.message, {
            foreignKey: 'chat_id',
            as: 'messages',
            onDelete: 'CASCADE'
        });
        
        Chat.hasMany(models.voice_message, {
            foreignKey: 'chat_id',
            as: 'voice_messages',
            onDelete: 'CASCADE'
        });
        
        Chat.hasMany(models.call, {
            foreignKey: 'chat_id',
            as: 'calls'
        });
    };

    return Chat;
};