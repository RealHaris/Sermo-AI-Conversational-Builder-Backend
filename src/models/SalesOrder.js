const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SalesOrder extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      SalesOrder.belongsTo(models.sim_inventory, {
        foreignKey: 'msisdn_id',
        as: 'sim_inventory'
      });

      SalesOrder.belongsTo(models.bundle, {
        foreignKey: 'bundle_id',
        as: 'bundle'
      });

      SalesOrder.belongsTo(models.order_status, {
        foreignKey: 'order_status_id',
        as: 'order_status'
      });

      // Add city relationship
      SalesOrder.belongsTo(models.city, {
        foreignKey: 'city_id',
        as: 'city'
      });
    }
  }

  SalesOrder.init(
    {
      uuid: DataTypes.UUID,
      orderId: {
        type: DataTypes.STRING(10),
      },
      customerName: DataTypes.STRING(100),
      cnic: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      personalPhone: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      alternatePhone: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      msisdn_id: DataTypes.INTEGER,
      bundle_id: DataTypes.INTEGER,
      city_id: DataTypes.INTEGER, // Changed from city string to city_id integer
      order_status_id: DataTypes.INTEGER,
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: ''
      },
      // New fields for transaction
      total_transaction_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
      },
      payment_method: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      transaction_ref: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      transaction_created_date: {
        type: DataTypes.DATE,
        allowNull: true
      },
      payment_status: {
        type: DataTypes.ENUM('paid', 'unpaid', 'payment_failed'),
        defaultValue: 'unpaid',
        allowNull: false
      },
      created_date: DataTypes.DATE,
      is_deleted: DataTypes.BOOLEAN,
      deleted_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'sales_order',
      underscored: true,
    }
  );
  return SalesOrder;
}; 
