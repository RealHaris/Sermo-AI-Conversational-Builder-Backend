const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Bundle extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Bundle.belongsToMany(models.number_type, {
        through: models.bundle_number_type,
        foreignKey: 'bundle_id',
        otherKey: 'number_type_id',
        as: 'number_type'
      });

      //  User.belongsTo(models.agency, { foreignKey: 'agency_id', targetKey: 'id' });
    }
  }

  Bundle.init(
    {
      uuid: DataTypes.UUID,
      bundleId: {
        type: DataTypes.STRING(10),
        // unique: true
      },
      bundleName: DataTypes.STRING(100),
      type: DataTypes.ENUM('post_paid', 'pre_paid'),
      category: DataTypes.ENUM('monthly', 'weekly', 'international_roaming', 'easy_card'),
      validity: DataTypes.INTEGER,
      validityType: DataTypes.ENUM('days', 'month'),
      voiceOnNetMins: DataTypes.STRING,
      voiceOffNetMins: DataTypes.STRING,
      sms: DataTypes.STRING,
      data: DataTypes.STRING,
      dataUnit: DataTypes.ENUM('MB', 'GB'),
      bundlePrice: DataTypes.FLOAT,
      discount: DataTypes.FLOAT,
      bundleFinalPrice: DataTypes.FLOAT,
      offerId: DataTypes.STRING(50),
      status: DataTypes.BOOLEAN,
      is_deleted: DataTypes.BOOLEAN,
      deleted_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: 'bundle',
      underscored: true,
    }
  );
  return Bundle;
}; 
