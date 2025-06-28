/**
 * Initialize all cron jobs for the application
 */
const logger = require("../config/logger");
const CronSettingService = require("../service/CronSettingService");
const cronJobs = require("../cronJobs");
/**
 * Initialize the inventory release cron job
 */
const initializeInventoryReleaseCronJob = async () => {
  try {
    // Then get the schedule and start the job
    const cronSettingService = new CronSettingService();
    const schedule = await cronSettingService.getCronSchedule();

    logger.info(
      `Initializing inventory release cron job with schedule: ${schedule}`
    );
    cronJobs.initializeCronJob(schedule);

    return true;
  } catch (error) {
    logger.error("Failed to initialize inventory release cron job:", error);
    return false;
  }
};

module.exports = {
  initializeInventoryReleaseCronJob,
};
