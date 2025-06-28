const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
            //  User.belongsTo(models.agency, { foreignKey: 'agency_id', targetKey: 'id' });
            User.belongsTo(models.role, { foreignKey: 'role_id', as: 'role' });

            // Using a junction table for many-to-many relationship
            User.belongsToMany(models.data_access_level, {
                through: 'user_data_access_levels',
                foreignKey: 'user_id',
                otherKey: 'data_access_level_id',
                as: 'data_access_level'
            });
        }
    }

    User.init(
        {
            uuid: DataTypes.UUID,
            full_name: DataTypes.STRING,
            email: DataTypes.STRING,
            password: DataTypes.STRING,
            status: DataTypes.INTEGER,
            email_verified: DataTypes.INTEGER,
            address: DataTypes.STRING,
            phone_number: DataTypes.STRING,
            role_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'role',
                    key: 'id'
                }
            },
            data_access_type: {
                type: DataTypes.ENUM('all', 'regional', 'city'),
                defaultValue: 'all'
            },
            is_deleted: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            created_at: {
                type: DataTypes.DATE,

            },
            updated_at: {
                type: DataTypes.DATE,

            }
        },
        {
            sequelize,
            modelName: 'user',
            underscored: true,
        },
    );
    return User;
};
