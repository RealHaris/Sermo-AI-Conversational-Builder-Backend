"use strict";
const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if the cron_schedule setting already exists
    const existingSetting = await queryInterface.sequelize.query(
      `SELECT * FROM cron_setting WHERE \`key\` = 'cron_schedule' AND is_deleted = false`,
      { type: Sequelize.QueryTypes.SELECT }
    ); // Only insert the default setting if it doesn't exist
    if (existingSetting.length === 0) {
      await queryInterface.bulkInsert("cron_setting", [
        {
          uuid: uuidv4(),
          key: "cron_schedule",
          value: "*/2 * * * *", // This will be converted to the appropriate cron expression (every 2 minutes) when read
          is_deleted: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);
      console.log(
        "Default cron_schedule setting created: 0:02 (runs every 2 minutes)"
      );
    } else {
      console.log("cron_schedule setting already exists, skipping seed");
    }
  },
  down: async (queryInterface, Sequelize) => {
    // Remove the default setting if needed
    await queryInterface.bulkDelete("cron_setting", { key: "cron_schedule" });
  },
};
