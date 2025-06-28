const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CronSetting extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // No associations needed
    }
  }

  CronSetting.init(
    {
      uuid: DataTypes.UUID,
      key: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      value: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      deleted_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "cron_setting",
      underscored: true,
    }
  );
  return CronSetting;
};
