const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Region extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Region.hasMany(models.city, { foreignKey: 'region_id' });
    }
  }

  Region.init(
    {
      uuid: DataTypes.UUID,
      name: DataTypes.STRING,
      is_deleted: DataTypes.BOOLEAN,
      deleted_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'region',
      underscored: true,
    },
  );
  return Region;
}; 
