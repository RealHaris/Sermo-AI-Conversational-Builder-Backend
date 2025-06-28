const { Model, DataTypes } = require('sequelize');

class VapiAssistant extends Model {
  static init(sequelize) {
    super.init(
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
        prompt: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        vapiAssistantId: {
          type: DataTypes.STRING,
          allowNull: true, // Will be populated after creation in Vapi
        },
        config: {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: {},
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
        createdBy: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        updatedBy: {
          type: DataTypes.UUID,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'VapiAssistant',
        tableName: 'vapi_assistant',
        timestamps: true,
      }
    );
  }

  static associate(models) {
    this.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator',
    });
    this.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater',
    });
  }
}

module.exports = VapiAssistant; 
