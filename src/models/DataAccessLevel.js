const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DataAccessLevel extends Model {
    static associate(models) {
      DataAccessLevel.belongsToMany(models.user, {
        through: 'user_data_access_levels',
        foreignKey: 'data_access_level_id',
        otherKey: 'user_id',
        as: 'users'
      });

    }
  }

  DataAccessLevel.init(
    {
      level_type: {
        type: DataTypes.ENUM('all', 'regional', 'city'),
        allowNull: false
      },
      reference_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
    },
    {
      sequelize,
      modelName: 'data_access_level',
      underscored: true,
    }
  );

  return DataAccessLevel;
}; 
