const httpStatus = require("http-status");
const CronSettingService = require("../service/CronSettingService");
const logger = require("../config/logger");

class CronSettingController {
  constructor() {
    this.cronSettingService = new CronSettingService();
  }

  /**
   * Get all cron settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getAllSettings = async (req, res) => {
    try {
      const result = await this.cronSettingService.getAllSettings();
      res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error("Error in getAllSettings controller:", e);
      res.status(httpStatus.BAD_REQUEST).send({
        status: false,
        statusCode: httpStatus.BAD_REQUEST,
        message: "Error retrieving settings",
        data: null,
      });
    }
  };

  /**
   * Get a setting by key
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getSettingByKey = async (req, res) => {
    try {
      const { key } = req.params;
      const result = await this.cronSettingService.getSettingByKey(key);
      res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error(
        `Error in getSettingByKey controller for key ${req.params.key}:`,
        e
      );
      res.status(httpStatus.BAD_REQUEST).send({
        status: false,
        statusCode: httpStatus.BAD_REQUEST,
        message: "Error retrieving setting",
        data: null,
      });
    }
  };

  /**
   * Update a setting
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  updateSetting = async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;

      if (!value && value !== "0") {
        return res.status(httpStatus.BAD_REQUEST).send({
          status: false,
          statusCode: httpStatus.BAD_REQUEST,
          message: "Value is required",
          data: null,
        });
      }

      const result = await this.cronSettingService.updateSetting(key, value);
      res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error(
        `Error in updateSetting controller for key ${req.params.key}:`,
        e
      );
      res.status(httpStatus.BAD_REQUEST).send({
        status: false,
        statusCode: httpStatus.BAD_REQUEST,
        message: "Error updating setting",
        data: null,
      });
    }
  };
}

module.exports = CronSettingController;
