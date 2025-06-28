const SuperDao = require("./SuperDao");
const models = require("../models");
const CronSetting = models.cron_setting;

class CronSettingDao extends SuperDao {
  constructor() {
    super(CronSetting);
  }

  /**
   * Find a setting by key
   * @param {String} key - The setting key
   * @returns {Promise<Object>} - The setting object
   */
  async findByKey(key) {
    return CronSetting.findOne({
      where: {
        key,
        is_deleted: false,
      },
    });
  }

  /**
   * Get all settings
   * @returns {Promise<Array>} - Array of settings
   */
  async getAll() {
    return CronSetting.findAll({
      where: {
        is_deleted: false,
      },
    });
  }

  /**
   * Update a setting by key
   * @param {String} key - The setting key
   * @param {String} value - The new value
   * @returns {Promise<Number>} - Number of rows updated
   */
  async updateByKey(key, value) {
    return CronSetting.update(
      { value },
      {
        where: {
          key,
          is_deleted: false,
        },
      }
    );
  }
}

module.exports = CronSettingDao;
