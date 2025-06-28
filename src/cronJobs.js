const cron = require("node-cron");
const InventoryReleaseService = require("./service/InventoryReleaseService");
const logger = require("./config/logger");
const { convertTimeToCronExpression, isValidCronExpression } = require("./helper/CronHelper");

// Initialize services
const inventoryReleaseService = new InventoryReleaseService();
// Don't initialize cronSettingService here to avoid circular dependency

// Initialize the task as a variable but don't schedule it yet
let inventoryReleaseTask;
let currentSchedule; // Track the current schedule

/**
 * Start or restart the cron job with a new schedule
 * @param {String} schedule - Cron schedule expression
 */
const startOrRestartCronJob = (schedule) => {
  // Make sure we have a valid cron expression
  if (!schedule || !isValidCronExpression(schedule)) {
    const defaultSchedule = "*/5 * * * *";
    logger.warn(`Invalid cron schedule: "${schedule}". Using default: "${defaultSchedule}"`);
    schedule = defaultSchedule;
  }

  // Stop the current task if it exists
  if (inventoryReleaseTask) {
    inventoryReleaseTask.stop();
    logger.info(`Stopped existing inventory release cron job`);
  }

  // Store the current schedule
  currentSchedule = schedule;

  // Create and start a new task with the provided schedule
  inventoryReleaseTask = cron.schedule(schedule, async () => {
    try {
      logger.info(
        `Running inventory release cron job with schedule: ${schedule}`
      );
      // Pass the current schedule to the service so it can calculate expiration dates
      const processedOrders =
        await inventoryReleaseService.releaseInventoryForExpiredOrders(currentSchedule);
      logger.info(
        `Inventory release job completed. Processed ${processedOrders.length} orders.`
      );

      if (processedOrders.length > 0) {
        logger.info(
          `Processed order IDs: ${processedOrders
            .map((order) => order.orderId)
            .join(", ")}`
        );

        // Log additional details about processed orders
        processedOrders.forEach(order => {
          logger.info(
            `Order ${order.orderId}: Created ${order.createdDate}, Exceeded deadline by ${order.paymentDeadlineExceededBy} minutes`
          );
        });
      }
    } catch (error) {
      logger.error("Error in inventory release cron job:", error);
    }
  });

  logger.info(`Started inventory release cron job with schedule: ${schedule}`);
};

/**
 * Update the cron schedule
 * @param {String} newSchedule - New cron schedule expression
 */
const updateCronSchedule = async (newSchedule) => {
  try {
    console.log(`Updating cron schedule to: ${newSchedule}`);
    const previousSchedule = currentSchedule;

    if (newSchedule !== previousSchedule) {
      logger.info(
        `Cron schedule changed from ${previousSchedule} to ${newSchedule}`
      );
      startOrRestartCronJob(newSchedule);
      return true;
    }
    return false;
  } catch (error) {
    logger.error("Error updating cron schedule:", error);
    return false;
  }
};

/**
 * Initialize the cron job with a schedule
 * @param {String} schedule - Cron schedule expression
 */
const initializeCronJob = (schedule) => {
  try {
    console.log("Starting inventory release cron job...");
    startOrRestartCronJob(schedule);
    return true;
  } catch (error) {
    logger.error("Error starting inventory release cron job:", error);
    return false;
  }
};

// Export functions for external use
module.exports = {
  updateCronSchedule,
  initializeCronJob,
};
