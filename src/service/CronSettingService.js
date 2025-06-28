const httpStatus = require("http-status");
const CronSettingDao = require("../dao/CronSettingDao");
const responseHandler = require("../helper/responseHandler");
const logger = require("../config/logger");
const {
  convertTimeToCronExpression,
  isValidCronExpression,
} = require("../helper/CronHelper");
// Import cronJobs but don't immediately use the functions to avoid circular dependencies
const cronJobs = require("../cronJobs");

class CronSettingService {
  constructor() {
    this.cronSettingDao = new CronSettingDao();
  }

  /**
   * Get all cron settings
   * @returns {Object} - Response with settings
   */
  getAllSettings = async () => {
    try {
      const settings = await this.cronSettingDao.getAll();

      return responseHandler.returnSuccess(
        httpStatus.OK,
        "Settings retrieved successfully",
        settings
      );
    } catch (e) {
      logger.error("Error getting cron settings:", e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        "Something went wrong!"
      );
    }
  };

  /**
   * Get a setting by key
   * @param {String} key - Setting key
   * @returns {Object} - Response with setting
   */
  getSettingByKey = async (key) => {
    try {
      const setting = await this.cronSettingDao.findByKey(key);

      if (!setting) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          `Setting with key '${key}' not found`
        );
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        "Setting retrieved successfully",
        setting
      );
    } catch (e) {
      logger.error(`Error getting setting with key '${key}':`, e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        "Something went wrong!"
      );
    }
  };
  /**
   * Update a setting
   * @param {String} key - Setting key
   * @param {String} value - New value
   * @returns {Object} - Response with result
   */
  updateSetting = async (key, value) => {
    try {
      // Check if setting exists
      const existing = await this.cronSettingDao.findByKey(key);

      if (!existing) {
        return responseHandler.returnError(
          httpStatus.NOT_FOUND,
          `Setting with key '${key}' not found`
        );
      } // If updating cron_schedule, convert from simple time format to cron expression
      if (key === "cron_schedule") {
        // Convert the value to a valid cron expression using our helper
        const originalValue = value;
        value = convertTimeToCronExpression(value);

        // Log the conversion for debugging
        if (value !== originalValue) {
          logger.info(
            `Converted time format '${originalValue}' to cron expression '${value}'`
          );
        }

        // Double-check that we have a valid cron expression
        if (!isValidCronExpression(value)) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            "Invalid cron schedule format or time format. Use H:MM or valid cron expression."
          );
        }
      }
      await this.cronSettingDao.updateByKey(key, value); // If the cron_schedule setting was updated, trigger a cron job update
      if (key === "cron_schedule") {
        try {
          await cronJobs.updateCronSchedule(value);
          logger.info(`Triggered cron job update with new schedule: ${value}`);
        } catch (error) {
          logger.error("Error triggering cron job update:", error);
          // We don't want to fail the setting update if the job update fails
        }
      }

      return responseHandler.returnSuccess(
        httpStatus.OK,
        "Setting updated successfully",
        { key, value }
      );
    } catch (e) {
      logger.error(`Error updating setting with key '${key}':`, e);
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        "Something went wrong!"
      );
    }
  };
  /**
   * Get cron schedule for the inventory release job
   * @returns {String} - Cron schedule expression (defaults to every 5 minutes)
   */
  getCronSchedule = async () => {
    try {
      const setting = await this.cronSettingDao.findByKey("cron_schedule");
      const rawValue = setting ? setting.value : "1:00";

      // Convert the value to a valid cron expression using our helper
      const cronExpression = convertTimeToCronExpression(rawValue);

      if (rawValue !== cronExpression) {
        logger.info(
          `Converted stored cron schedule '${rawValue}' to valid expression '${cronExpression}'`
        );
      }

      return cronExpression;
    } catch (e) {
      logger.error("Error getting cron schedule:", e);
      return "*/5 * * * *"; // Default to every 5 minutes on error
    }
  };
}

module.exports = CronSettingService;
