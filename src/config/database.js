const config = require('./config');

module.exports = {
    development: {
        username: config.dbUser,
        password: config.dbPass,
        database: config.dbName,
        host: config.dbHost,
        port: config.port,
        serverPort: config.serverPort,
        dialect: 'mysql',
        dialectOptions: {
            bigNumberStrings: true,
            charset: 'utf8mb4',

        },
        define: {
            underscored: true,
            freezeTableName: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
        },
    },
    test: {
        username: config.dbUser,
        password: config.dbPass,
        database: config.dbName,
        host: config.dbHost,
        serverPort: config.serverPort,
        port: config.port,
        dialect: 'mysql',
        dialectOptions: {
            bigNumberStrings: true,
            charset: 'utf8mb4',
        },
        define: {
            underscored: true,
            freezeTableName: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
        },
    },
    production: {
        username: config.dbUser,
        password: config.dbPass,
        database: config.dbName,
        host: config.dbHost,
        port: config.port,
        serverPort: config.serverPort,
        dialect: 'mysql',
        dialectOptions: {
            bigNumberStrings: true,
            charset: 'utf8mb4',
        },
        define: {
            underscored: true,
            freezeTableName: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
        },
    },
};
