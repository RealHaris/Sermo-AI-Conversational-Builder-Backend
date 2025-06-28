const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OrderStatus extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      OrderStatus.hasMany(models.event_status_mapping, {
        foreignKey: 'order_status_id',
        as: 'event_mapping'
      });
    }
  }

  OrderStatus.init(
    {
      uuid: DataTypes.UUID,
      name: DataTypes.STRING,
      is_deleted: DataTypes.BOOLEAN,
      deleted_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'order_status',
      underscored: true,
    },
  );
  return OrderStatus;
}; 
