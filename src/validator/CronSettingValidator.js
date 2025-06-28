const Joi = require("joi");
const httpStatus = require("http-status");
const ApiError = require("../helper/ApiError");

/**
 * Validator for cron_schedule settings
 * The only supported setting key is 'cron_schedule'
 */
class CronSettingValidator {
  /**
   * Validate key parameter
   */
  validateKey = async (req, res, next) => {
    const schema = Joi.object({
      key: Joi.string().valid("cron_schedule").required(),
    });

    const options = {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: false,
    };

    const { error } = schema.validate(req.params, options);

    if (error) {
      const errorMessage = error.details
        .map((details) => details.message)
        .join(", ");
      next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    } else {
      return next();
    }
  };
  /**
   * Validate update setting
   */
  validateUpdateSetting = async (req, res, next) => {
    const schema = Joi.object({
      value: Joi.string()
        .required()
    });

    const options = {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: false,
    };

    const { error, value } = schema.validate(req.body, options);

    if (error) {
      const errorMessage = error.details
        .map((details) => details.message)
        .join(", ");
      next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    } else {
      req.body = value;
      return next();
    }
  };
}

module.exports = CronSettingValidator;
