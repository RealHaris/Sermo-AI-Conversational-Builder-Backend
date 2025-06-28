const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Role extends Model {
    static associate(models) {
      Role.hasMany(models.user, { foreignKey: 'role_id', as: 'users' });
    }
  }

  Role.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      permissions: {
        type: DataTypes.JSON,
        allowNull: false,
        get() {
          const permissions = this.getDataValue('permissions');
          if (permissions === null) return null;
          return typeof permissions === 'string' ? JSON.parse(permissions) : permissions;
        },
      },
      is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
    },
    {
      sequelize,
      modelName: 'role',
      underscored: true,
    }
  );

  // Add a hook to ensure permissions are properly formatted before output
  Role.addHook('afterFind', (result) => {
    if (Array.isArray(result)) {
      // Handle array of instances (like in findAll)
      result.forEach(instance => {
        if (instance.permissions && typeof instance.permissions === 'string') {
          instance.permissions = JSON.parse(instance.permissions);
        }
      });
    } else if (result && result.permissions && typeof result.permissions === 'string') {
      // Handle single instance
      result.permissions = JSON.parse(result.permissions);
    }
    return result;
  });

  return Role;
};
