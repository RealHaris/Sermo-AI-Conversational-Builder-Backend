const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SalesOrderAuditLog extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      SalesOrderAuditLog.belongsTo(models.sales_order, {
        foreignKey: 'sales_order_id',
        as: 'sales_order'
      });
    }
  }

  SalesOrderAuditLog.init(
    {
      uuid: DataTypes.UUID,
      sales_order_id: DataTypes.INTEGER,
      sales_order_uuid: DataTypes.UUID,
      user_full_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      user_email: {
        type: DataTypes.STRING,
        allowNull: true
      },
      done_by: {
        type: DataTypes.ENUM('system', 'user'),
        defaultValue: 'user'
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false
      },
      previous_value: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      new_value: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      details: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      created_at: DataTypes.DATE,
      is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      deleted_at: DataTypes.DATE
    },
    {
      sequelize,
      modelName: 'sales_order_audit_log',
      underscored: true,
    }
  );
  return SalesOrderAuditLog;
}; 
