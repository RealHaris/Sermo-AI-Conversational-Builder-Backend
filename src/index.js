const app = require("./app");
const config = require("./config/config");
const { sequelize } = require("./models");
// const { initializeInventoryReleaseCronJob } = require("./startup/initCronJobs");

console.log("Telenor Backend!!!");
// require('./cronJobs'); // Removed direct require to avoid circular dependency issues
// eslint-disable-next-line import/order
const http = require("http");
// socket initialization
const server = http.createServer(app);
// eslint-disable-next-line import/order
const io = require('socket.io')(server, { cors: { origin: '*' } });

global.io = io;
require('./config/rootSocket')(io);


// Test the database connection before starting the server
sequelize
  .authenticate()
  .then(() => {
    console.log("Database connection has been established successfully.");

    server.listen(config.serverPort, () => {
      console.log("SERVER");
      console.log(`Listening to port ${config.serverPort}`);
    });
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
    process.exit(1);
  });
