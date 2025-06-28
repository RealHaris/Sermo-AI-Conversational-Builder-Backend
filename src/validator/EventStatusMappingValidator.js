const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');

class EventStatusMappingValidator {
  /**
   * Validator for checking event parameter
   */
  validateEvent = async (req, res, next) => {
    const schema = Joi.object({
      event: Joi.string().required().valid(
        'ORDER_CREATION',
        'PAYMENT_SUCCESSFUL',
        'PAYMENT_FAILED',
        'RELEASE_INVENTORY',
        'CANCELED',
        'ORDER_COMPLETED',
        'ASSIGN_NUMBER',
        'AUTO_RELEASE_INVENTORY',
      )
    });

    const options = {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: false
    };

    const { error } = schema.validate(req.params, options);

    if (error) {
      const errorMessage = error.details
        .map((details) => details.message)
        .join(', ');
      next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    } else {
      return next();
    }
  };

  /**
   * Validator for bulk update of event mappings
   */
  validateBulkUpdate = async (req, res, next) => {
    const schema = Joi.object({
      statusUuids: Joi.array().items(
        Joi.string().guid({ version: 'uuidv4' })
      ).required()
    });

    const options = {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: false
    };

    const { error, value } = schema.validate(req.body, options);

    if (error) {
      const errorMessage = error.details
        .map((details) => details.message)
        .join(', ');
      next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    } else {
      req.body = value;
      return next();
    }
  };
}

module.exports = EventStatusMappingValidator; 
