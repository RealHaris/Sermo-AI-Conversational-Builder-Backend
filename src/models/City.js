const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class City extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      City.belongsTo(models.region, { foreignKey: 'region_id', as: 'region' });
    }
  }

  City.init(
    {
      uuid: DataTypes.UUID,
      name: DataTypes.STRING,
      region_id: DataTypes.INTEGER,
      priority: {
        type: DataTypes.INTEGER,
        defaultValue: 999999,
      },
      status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      is_deleted: DataTypes.BOOLEAN,
      deleted_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'city',
      underscored: true,
    },
  );
  return City;
};
