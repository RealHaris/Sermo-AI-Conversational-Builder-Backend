const express = require("express");
const CronSettingController = require("../controllers/CronSettingController");
const CronSettingValidator = require("../validator/CronSettingValidator");
const { auth } = require("../middlewares/auth");

const router = express.Router();
const cronSettingController = new CronSettingController();
const cronSettingValidator = new CronSettingValidator();

// Get all settings
router.get("/", auth(), cronSettingController.getAllSettings);

// Get setting by key
router.get(
  "/:key",
  auth(),
  cronSettingValidator.validateKey,
  cronSettingController.getSettingByKey
);

// Update setting by key
router.patch(
  "/:key",
  auth(),
  cronSettingValidator.validateKey,
  cronSettingValidator.validateUpdateSetting,
  cronSettingController.updateSetting
);

module.exports = router;
