const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SimInventory extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      SimInventory.belongsTo(models.number_type, {
        foreignKey: 'number_type_id',
        as: 'number_type'
      });

      // Add city relationship
      SimInventory.belongsTo(models.city, {
        foreignKey: 'city_id',
        as: 'city'
      });
    }
  }

  SimInventory.init(
    {
      uuid: DataTypes.UUID,

      number_type_id: DataTypes.INTEGER,
      number: {
        type: DataTypes.STRING
      },
      sim_price: DataTypes.FLOAT,
      discount: DataTypes.FLOAT,
      final_sim_price: DataTypes.FLOAT,
      city_id: DataTypes.INTEGER, // Add city_id foreign key
      status: DataTypes.ENUM('Available', 'Sold', 'Not Available'),
      is_deleted: DataTypes.BOOLEAN,
      deleted_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'sim_inventory',
      underscored: true,
    },
  );
  return SimInventory;
}; 
