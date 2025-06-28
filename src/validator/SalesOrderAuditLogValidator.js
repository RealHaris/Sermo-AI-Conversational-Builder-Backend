const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');

class SalesOrderAuditLogValidator {
  // Common validation options
  #options = {
    abortEarly: false, // include all errors
    allowUnknown: true, // ignore unknown props
    stripUnknown: true, // remove unknown props
  };

  /**
   * Format error message to be more user-friendly
   * @param {Object} error - Joi error object
   * @returns {String} - Formatted error message
   */
  #formatErrorMessage = (error) => {
    return error.details
      .map((detail) => detail.message)
      .join('. ');
  };

  /**
   * Validator for getting audit logs by sales order UUID
   */
  getAuditLogsBySalesOrderUuidValidator = async (req, res, next) => {
    const paramsSchema = Joi.object({
      uuid: Joi.string().required().guid({ version: 'uuidv4' })
    });

    const querySchema = Joi.object({
      page: Joi.number().integer().min(1),
      limit: Joi.number().integer().min(1).max(100)
    });

    const paramsResult = paramsSchema.validate(req.params, this.#options);
    const queryResult = querySchema.validate(req.query, this.#options);

    if (paramsResult.error || queryResult.error) {
      const errorMessages = [
        ...(paramsResult.error ? [this.#formatErrorMessage(paramsResult.error)] : []),
        ...(queryResult.error ? [this.#formatErrorMessage(queryResult.error)] : [])
      ];
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessages.join('. ')));
    }

    req.params = paramsResult.value;
    req.query = queryResult.value;
    return next();
  };

  /**
   * Validator for getting all audit logs with filtering
   */
  getAllAuditLogsValidator = async (req, res, next) => {
    const schema = Joi.object({
      page: Joi.number().integer().min(1),
      limit: Joi.number().integer().min(1).max(100),
      salesOrderUuid: Joi.string().guid({ version: 'uuidv4' }),
      action: Joi.string(),
      doneBy: Joi.string().valid('system', 'user'),
      userEmail: Joi.string().email(),
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso().min(Joi.ref('startDate'))
    });

    const { error, value } = schema.validate(req.query, this.#options);

    if (error) {
      const errorMessage = this.#formatErrorMessage(error);
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    }

    req.query = value;
    return next();
  };
}

module.exports = SalesOrderAuditLogValidator; 
