const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EventStatusMapping extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      EventStatusMapping.belongsTo(models.order_status, {
        foreignKey: 'order_status_id',
        as: 'order_status'
      });
    }
  }

  EventStatusMapping.init(
    {
      uuid: DataTypes.UUID,
      event: {
        type: DataTypes.ENUM(
          'ORDER_CREATION',
          'PAYMENT_SUCCESSFUL',
          'PAYMENT_FAILED',
          'RELEASE_INVENTORY',
          'CANCELED',
          'ORDER_COMPLETED',
          'ASSIGN_NUMBER',
          'AUTO_RELEASE_INVENTORY',
        ),
        allowNull: false
      },
      order_status_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'order_status',
          key: 'id'
        }
      },
      is_deleted: DataTypes.BOOLEAN,
      deleted_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'event_status_mapping',
      underscored: true,
    },
  );
  return EventStatusMapping;
}; 
