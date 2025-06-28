const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BundleNumberType extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // associations defined in Bundle and NumberType models
    }
  }

  BundleNumberType.init(
    {
      bundle_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'bundle',
          key: 'id'
        }
      },
      number_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'number_type',
          key: 'id'
        }
      },
      is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'bundle_number_type',
      underscored: true,
    }
  );
  return BundleNumberType;
}; 
