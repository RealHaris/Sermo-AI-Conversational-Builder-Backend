const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Token extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
    }

    Token.init(
        {
            token: DataTypes.STRING,
            user_uuid: DataTypes.UUID,
            type: DataTypes.STRING,
            expires: DataTypes.DATE,
            blacklisted: DataTypes.BOOLEAN,
            duration: DataTypes.INTEGER, // Duration in days for LLT (null for regular tokens)
            description: DataTypes.STRING, // Optional description for the token
        },
        {
            sequelize,
            modelName: 'token',
            underscored: true,
        },
    );
    return Token;
};
