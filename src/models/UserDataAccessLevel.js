const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserDataAccessLevel extends Model {
    static associate(models) {
      // No additional associations needed as this is a junction table
    }
  }

  UserDataAccessLevel.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'user',
          key: 'id'
        }
      },
      data_access_level_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'data_access_level',
          key: 'id'
        }
      }
    },
    {
      sequelize,
      modelName: 'user_data_access_levels',
      tableName: 'user_data_access_levels',
      underscored: true,
      timestamps: false
    }
  );

  return UserDataAccessLevel;
}; 
