const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class NumberType extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      NumberType.hasMany(models.sim_inventory, {
        foreignKey: 'number_type_id',
        as: 'sim_inventory'
      });

      // Add many-to-many relationship with Bundle
      NumberType.belongsToMany(models.bundle, {
        through: models.bundle_number_type,
        foreignKey: 'number_type_id',
        otherKey: 'bundle_id',
        as: 'bundle'
      });
    }
  }

  NumberType.init(
    {
      uuid: DataTypes.UUID,
      slug: DataTypes.STRING(64),
      name: DataTypes.STRING,
      status: DataTypes.BOOLEAN,
      is_deleted: DataTypes.BOOLEAN,
      deleted_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'number_type',
      underscored: true,
    },
  );
  return NumberType;
}; 
