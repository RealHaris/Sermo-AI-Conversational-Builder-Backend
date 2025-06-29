const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Assistant = sequelize.define('assistant', {
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
        vapi_assistant_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
            unique: true,
            comment: 'Vapi API Assistant ID'
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [2, 255]
            }
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        system_prompt: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [10, 10000]
            }
        },
        // Model configuration
        model_provider: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'openai',
            validate: {
                isIn: [['openai', 'anthropic', 'google', 'meta']]
            }
        },
        model_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: 'gpt-4'
        },
        temperature: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0.7,
            validate: {
                min: 0,
                max: 2
            }
        },
        max_tokens: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 500,
            validate: {
                min: 1,
                max: 4000
            }
        },
        // Voice configuration
        voice_provider: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'elevenlabs',
            validate: {
                isIn: [['elevenlabs', 'openai', 'azure', 'deepgram']]
            }
        },
        voice_id: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: 'burt'
        },
        voice_speed: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 1.0,
            validate: {
                min: 0.25,
                max: 4.0
            }
        },
        voice_stability: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0.5,
            validate: {
                min: 0,
                max: 1
            }
        },
        voice_similarity_boost: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0.75,
            validate: {
                min: 0,
                max: 1
            }
        },
        // Transcriber configuration
        transcriber_provider: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'deepgram',
            validate: {
                isIn: [['deepgram', 'assemblyai', 'openai']]
            }
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
        // Assistant behavior
        first_message: {
            type: DataTypes.TEXT,
            allowNull: true,
            validate: {
                len: [0, 500]
            }
        },
        silence_timeout: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 30,
            validate: {
                min: 5,
                max: 300
            }
        },
        max_duration: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1800,
            validate: {
                min: 60,
                max: 7200
            }
        },
        background_sound: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'off',
            validate: {
                isIn: [['off', 'office']]
            }
        },
        // Status and metadata
        status: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: {
                isIn: [[0, 1]]
            }
        },
        chat_count: {
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
        tableName: 'assistants',
        timestamps: true,
        paranoid: false,
        indexes: [
            {
                unique: true,
                fields: ['uuid']
            },
            {
                unique: true,
                fields: ['vapi_assistant_id'],
                where: {
                    vapi_assistant_id: {
                        [sequelize.Sequelize.Op.ne]: null
                    }
                }
            },
            {
                fields: ['status']
            },
            {
                fields: ['is_deleted']
            },
            {
                fields: ['model_provider']
            },
            {
                fields: ['voice_provider']
            }
        ]
    });

    Assistant.associate = function(models) {
        Assistant.hasMany(models.chat, {
            foreignKey: 'assistant_id',
            as: 'chats',
            onDelete: 'CASCADE'
        });
        
        Assistant.hasMany(models.call, {
            foreignKey: 'assistant_id',
            as: 'calls',
            onDelete: 'CASCADE'
        });
    };

    return Assistant;
};