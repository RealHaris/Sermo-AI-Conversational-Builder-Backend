const { Op } = require("sequelize");
const SalesOrderDao = require("../dao/SalesOrderDao");
const SimInventoryDao = require("../dao/SimInventoryDao");
const BundleDao = require("../dao/BundleDao");
const EventStatusMappingService = require("./EventStatusMappingService");
const SalesOrderAuditLogService = require("./SalesOrderAuditLogService");
const logger = require("../config/logger");
const { convertCronScheduleToMinutes } = require("../helper/CronHelper");

class InventoryReleaseService {
  constructor() {
    this.salesOrderDao = new SalesOrderDao();
    this.simInventoryDao = new SimInventoryDao();
    this.bundleDao = new BundleDao();
    this.eventStatusMappingService = new EventStatusMappingService();
    this.salesOrderAuditLogService = new SalesOrderAuditLogService();
  }

  /**
   * Release inventory for unpaid orders in ORDER_CREATION status that have exceeded payment deadline
   * @param {String} cronSchedule - The cron schedule to determine payment deadline
   * @returns {Promise<Array>} - Array of processed orders
   */
  releaseInventoryForExpiredOrders = async (cronSchedule = null) => {
    try {
      // Get order status IDs for ORDER_CREATION event
      const orderCreationStatusIds =
        await this.eventStatusMappingService.getStatusIdsForEvent(
          "ORDER_CREATION"
        );

      if (!orderCreationStatusIds.length) {
        logger.warn("No status IDs found for ORDER_CREATION event");
        return [];
      }

      // Calculate payment deadline based on cron schedule
      const paymentDeadlineMinutes = cronSchedule
        ? convertCronScheduleToMinutes(cronSchedule)
        : 30; // Default to 30 minutes if no schedule provided

      logger.info(`Payment deadline calculated as ${paymentDeadlineMinutes} minutes based on schedule: ${cronSchedule}`);

      // Calculate the cutoff date - orders created before this date are considered expired
      const cutoffDate = new Date(); // this is the current date and time
      cutoffDate.setMinutes(cutoffDate.getMinutes() - paymentDeadlineMinutes);

      logger.info(`Processing orders created before: ${cutoffDate.toISOString()}`);

      // Find orders using the specialized function with date filtering
      const unpaidOrders = await this.salesOrderDao.findOrdersByStatusPaymentAndDate(
        orderCreationStatusIds,
        "PAID",
        true,
        cutoffDate
      );

      if (!unpaidOrders.length) {
        logger.info("No expired unpaid orders found to process");
        return [];
      }

      logger.info(`Found ${unpaidOrders.length} expired unpaid orders to process`);

      const processedOrders = [];

      // Process each unpaid order
      for (const order of unpaidOrders) {
        try {
          const orderUuid = order.uuid;

          // Log order details for debugging
          logger.info(`Processing expired order ${order.orderId} created at: ${order.created_date}`);

          // Check if order has MSISDN or bundle assigned
          if (order.msisdn_id) {
            // Release the MSISDN
            await this.simInventoryDao.releaseSimInventory(
              order.sim_inventory.id
            );
            logger.info(
              `Released MSISDN ${order.sim_inventory.number} for order ${order.orderId}`
            );
          }
          // Get the first status ID for AUTO_RELEASE_INVENTORY event
          const autoReleaseStatusId = await this.eventStatusMappingService.getFirstStatusIdForEvent(
            "AUTO_RELEASE_INVENTORY"
          );

          // Prepare update data
          const updateData = {
            msisdn_id: null,
            bundle_id: null,
          };

          // Add order status if one is configured
          if (autoReleaseStatusId) {
            updateData.order_status_id = autoReleaseStatusId;
            logger.info(`Setting order ${order.orderId} status to AUTO_RELEASE_INVENTORY status ID: ${autoReleaseStatusId}`);
          }

          // Update the sales order
          await this.salesOrderDao.update(orderUuid, updateData);

          // Create audit log
          await this.salesOrderAuditLogService.createAuditLog({
            sales_order_uuid: orderUuid,
            action: "automatic_release_inventory",
            done_by: "system",
            details: order.bundle ?
              `SIM Number ${order.sim_inventory.number} , Bundle ${order.bundle.bundleId} was released due to exceeding the payment deadline of ${paymentDeadlineMinutes} minutes`
              : `SIM Number ${order.sim_inventory.number} was released due to exceeding the payment deadline of ${paymentDeadlineMinutes} minutes`,
          });

          processedOrders.push({
            uuid: orderUuid,
            orderId: order.orderId,
            msisdn: order.sim_inventory ? order.sim_inventory.number : null,
            createdDate: order.created_date,
            paymentDeadlineExceededBy: Math.floor((new Date() - new Date(order.created_date)) / (1000 * 60)) // minutes
          });

          logger.info(`Successfully processed expired order ${order.orderId}`);
        } catch (error) {
          logger.error(
            `Error processing expired order ${order.orderId}:`,
            error
          );
        }
      }

      return processedOrders;
    } catch (error) {
      logger.error("Error in releaseInventoryForExpiredOrders:", error);
      return [];
    }
  };
}

module.exports = InventoryReleaseService;
