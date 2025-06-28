const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');

class SalesOrderValidator {
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
      .map((detail) => {
        // Handle different error types
        if (detail.type === 'any.only') {
          const fieldName = detail.path.join('.');
          const invalidValue = detail.context.value;
          const allowedValues = detail.context.valids
            .filter(v => v !== null && typeof v !== 'object')
            .join(', ');

          return `Invalid value "${invalidValue}" for ${fieldName}. Allowed values are [${allowedValues}]`;
        }

        return detail.message;
      })
      .join('. ');
  };

  createSalesOrderValidator = async (req, res, next) => {
    const schema = Joi.object({
      customerName: Joi.string().max(100),
      personalPhone: Joi.string().required().max(20),
      alternatePhone: Joi.string().allow(null, '').max(20),
      msisdn: Joi.string().allow(null, ''),
      bundleId: Joi.string().allow(null, '').guid({ version: 'uuidv4' }),
      city_uuid: Joi.string().allow(null, '').guid({ version: 'uuidv4' }),
      notes: Joi.string().allow(null, ''),
      total_transaction_price: Joi.number().allow(null).min(0),
      payment_method: Joi.string().allow(null, ''),
      transaction_ref: Joi.string().allow(null, ''),
      payment_status: Joi.string().valid('paid', 'unpaid')
    });

    const { error, value } = schema.validate(req.body, this.#options);

    if (error) {
      const errorMessage = this.#formatErrorMessage(error);
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    }

    req.body = value;
    return next();
  };

  /**
   * Validator for external order creation API
   */
  createExternalOrderValidator = async (req, res, next) => {
    const schema = Joi.object({
      name: Joi.string().required().max(100).messages({
        'string.empty': 'Name is required',
        'any.required': 'Name is required'
      }),
      address: Joi.string().required().messages({
        'string.empty': 'Address is required',
        'any.required': 'Address is required'
      }),
      cityId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
        'string.empty': 'City ID is required',
        'any.required': 'City ID is required',
        'string.guid': 'City ID must be a valid UUID'
      }),
      alternateContactNumber: Joi.string().allow(null, '').max(20),
      customerContactNumber: Joi.string().required().max(20).messages({
        'string.empty': 'Customer contact number is required',
        'any.required': 'Customer contact number is required'
      }),
      selectedMsisdnId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
        'string.empty': 'Selected MSISDN ID is required',
        'any.required': 'Selected MSISDN ID is required',
        'string.guid': 'Selected MSISDN ID must be a valid UUID'
      }),

      bundleId: Joi.string().guid({ version: 'uuidv4' }).allow(null, ''),
      notes: Joi.string().allow(null, ''),
      total_transaction_price: Joi.number().allow(null).min(0),
      payment_method: Joi.string().allow(null, ''),
      transaction_ref: Joi.string().allow(null, ''),
      payment_status: Joi.string().valid('paid', 'unpaid')
    })

    /*
    {
      "name": "John Doe",
      "address": "123 Main Street",
      "cityId": "123e4567-e89b-12d3-a456-426614174000",
      "alternateContactNumber": "03001234567",
      "customerContactNumber": "03001234567",
      "selectedMsisdnId": "123e4567-e89b-12d3-a456-426614174000", 
      "numberTypeId": "123e4567-e89b-12d3-a456-426614174000",
      "bundleId": "123e4567-e89b-12d3-a456-426614174000",
      "notes": "Customer prefers delivery in the evening",
      "total_transaction_price": 1500,
      "payment_method": "credit_card",
      "transaction_ref": "TX123456",
      "payment_status": "paid"
    }
    */

    const { error, value } = schema.validate(req.body, this.#options);

    if (error) {
      const errorMessage = this.#formatErrorMessage(error);
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    }

    req.body = value;
    return next();
  };

  getSalesOrdersValidator = async (req, res, next) => {
    const schema = Joi.object({
      page: Joi.number().integer().min(1),
      limit: Joi.number().integer().min(1).max(100),
      search: Joi.string(),
      cnic: Joi.string(),
      personalPhone: Joi.string(),
      alternatePhone: Joi.string(),
      city_id: Joi.number().integer(),
      orderStatusId: Joi.number().integer(),
      orderStatusName: Joi.string(),
      payment_status: Joi.string().valid('paid', 'unpaid', 'payment_failed'),
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')),
      sortBy: Joi.string(),
      sortOrder: Joi.string().valid('ASC', 'DESC')
    });

    const { error, value } = schema.validate(req.query, this.#options);

    if (error) {
      const errorMessage = this.#formatErrorMessage(error);
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    }

    req.query = value;
    return next();
  };

  getSalesOrderValidator = async (req, res, next) => {
    const schema = Joi.object({
      uuid: Joi.string().required().guid({ version: 'uuidv4' })
    });

    const { error, value } = schema.validate(req.params, this.#options);

    if (error) {
      const errorMessage = this.#formatErrorMessage(error);
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    }

    req.params = value;
    return next();
  };

  getSalesOrderByOrderIdValidator = async (req, res, next) => {
    const schema = Joi.object({
      orderId: Joi.string().required().pattern(/^SO-\d+$/).messages({
        'string.empty': 'Order ID is required',
        'any.required': 'Order ID is required',
        'string.pattern.base': 'Order ID must be in format SO-XXXX (e.g., SO-1000)'
      })
    });

    const { error, value } = schema.validate(req.params, this.#options);

    if (error) {
      const errorMessage = this.#formatErrorMessage(error);
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    }

    req.params = value;
    return next();
  };

  updateCnicValidator = async (req, res, next) => {
    const paramsSchema = Joi.object({
      uuid: Joi.string().required().guid({ version: 'uuidv4' })
    });

    const bodySchema = Joi.object({
      cnic: Joi.string().required().max(15)
    });

    const paramsResult = paramsSchema.validate(req.params, this.#options);
    const bodyResult = bodySchema.validate(req.body, this.#options);

    if (paramsResult.error || bodyResult.error) {
      const errorMessages = [
        ...(paramsResult.error ? [this.#formatErrorMessage(paramsResult.error)] : []),
        ...(bodyResult.error ? [this.#formatErrorMessage(bodyResult.error)] : [])
      ];
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessages.join('. ')));
    }

    req.params = paramsResult.value;
    req.body = bodyResult.value;
    return next();
  };

  updateNotesValidator = async (req, res, next) => {
    const paramsSchema = Joi.object({
      uuid: Joi.string().required().guid({ version: 'uuidv4' })
    });

    const bodySchema = Joi.object({
      notes: Joi.string().required()
    });

    const paramsResult = paramsSchema.validate(req.params, this.#options);
    const bodyResult = bodySchema.validate(req.body, this.#options);

    if (paramsResult.error || bodyResult.error) {
      const errorMessages = [
        ...(paramsResult.error ? [this.#formatErrorMessage(paramsResult.error)] : []),
        ...(bodyResult.error ? [this.#formatErrorMessage(bodyResult.error)] : [])
      ];
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessages.join('. ')));
    }

    req.params = paramsResult.value;
    req.body = bodyResult.value;
    return next();
  };

  updateOrderStatusValidator = async (req, res, next) => {
    const paramsSchema = Joi.object({
      uuid: Joi.string().required().guid({ version: 'uuidv4' })
    });

    const bodySchema = Joi.object({
      orderStatusUuid: Joi.string().required().guid({ version: 'uuidv4' })
    });

    const paramsResult = paramsSchema.validate(req.params, this.#options);
    const bodyResult = bodySchema.validate(req.body, this.#options);

    if (paramsResult.error || bodyResult.error) {
      const errorMessages = [
        ...(paramsResult.error ? [this.#formatErrorMessage(paramsResult.error)] : []),
        ...(bodyResult.error ? [this.#formatErrorMessage(bodyResult.error)] : [])
      ];
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessages.join('. ')));
    }

    req.params = paramsResult.value;
    req.body = bodyResult.value;
    return next();
  };

  /**
   * Validator for updating city
   */
  updateCityValidator = async (req, res, next) => {
    const paramsSchema = Joi.object({
      uuid: Joi.string().required().guid({ version: 'uuidv4' })
    });

    const bodySchema = Joi.object({
      city_uuid: Joi.string().required().guid({ version: 'uuidv4' })
    });

    const paramsResult = paramsSchema.validate(req.params, this.#options);
    const bodyResult = bodySchema.validate(req.body, this.#options);

    if (paramsResult.error || bodyResult.error) {
      const errorMessages = [
        ...(paramsResult.error ? [this.#formatErrorMessage(paramsResult.error)] : []),
        ...(bodyResult.error ? [this.#formatErrorMessage(bodyResult.error)] : [])
      ];
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessages.join('. ')));
    }

    req.params = paramsResult.value;
    req.body = bodyResult.value;
    return next();
  };

  /**
   * Validator for updating transaction details
   */
  updateTransactionValidator = async (req, res, next) => {
    const paramsSchema = Joi.object({
      uuid: Joi.string().guid({ version: 'uuidv4' })
    });

    const bodySchema = Joi.object({
      total_transaction_price: Joi.number().required().min(0),
      payment_method: Joi.string().allow(null, ''),
      transaction_ref: Joi.string().allow(null, ''),
      transaction_created_date: Joi.date().allow(null),
      payment_status: Joi.string().valid('paid', 'unpaid', 'payment_failed').default('unpaid')
    });


    // {
    //   "total_transaction_price": 1500,
    //     "payment_method": "credit_card",
    //       "transaction_ref": "TX123456",
    //         "payment_status": "paid"
    // }

    const paramsResult = paramsSchema.validate(req.params, this.#options);
    const bodyResult = bodySchema.validate(req.body, this.#options);

    if (paramsResult.error || bodyResult.error) {
      const errorMessages = [
        ...(paramsResult.error ? [this.#formatErrorMessage(paramsResult.error)] : []),
        ...(bodyResult.error ? [this.#formatErrorMessage(bodyResult.error)] : [])
      ];
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessages.join('. ')));
    }

    req.params = paramsResult.value;
    req.body = bodyResult.value;
    return next();
  };

  /**
   * Validator for updating transaction details using query parameters (orderId or uuid)
   */
  updateTransactionByIdentifierValidator = async (req, res, next) => {
    const querySchema = Joi.object({
      orderId: Joi.string(),
      uuid: Joi.string().guid({ version: 'uuidv4' })
    }).or('orderId', 'uuid');

    const bodySchema = Joi.object({
      total_transaction_price: Joi.number().required().min(0),
      payment_method: Joi.string().allow(null, ''),
      transaction_ref: Joi.string().allow(null, ''),
      transaction_created_date: Joi.date().allow(null),
      payment_status: Joi.string().valid('paid', 'unpaid', 'payment_failed').default('unpaid')
    });

    const queryResult = querySchema.validate(req.query, this.#options);
    const bodyResult = bodySchema.validate(req.body, this.#options);

    if (queryResult.error || bodyResult.error) {
      const errorMessages = [
        ...(queryResult.error ? [this.#formatErrorMessage(queryResult.error)] : []),
        ...(bodyResult.error ? [this.#formatErrorMessage(bodyResult.error)] : [])
      ];
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessages.join('. ')));
    }

    req.query = queryResult.value;
    req.body = bodyResult.value;
    return next();
  };

  /**
   * Validator for updating payment status
   */
  updatePaymentStatusValidator = async (req, res, next) => {
    const paramsSchema = Joi.object({
      uuid: Joi.string().required().guid({ version: 'uuidv4' })
    });

    const bodySchema = Joi.object({
      payment_status: Joi.string().required().valid('paid', 'unpaid', 'payment_failed')
    });

    const paramsResult = paramsSchema.validate(req.params, this.#options);
    const bodyResult = bodySchema.validate(req.body, this.#options);

    if (paramsResult.error || bodyResult.error) {
      const errorMessages = [
        ...(paramsResult.error ? [this.#formatErrorMessage(paramsResult.error)] : []),
        ...(bodyResult.error ? [this.#formatErrorMessage(bodyResult.error)] : [])
      ];
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessages.join('. ')));
    }

    req.params = paramsResult.value;
    req.body = bodyResult.value;
    return next();
  };

  deleteSalesOrderValidator = async (req, res, next) => {
    const schema = Joi.object({
      uuid: Joi.string().required().guid({ version: 'uuidv4' })
    });

    const { error, value } = schema.validate(req.params, this.#options);

    if (error) {
      const errorMessage = this.#formatErrorMessage(error);
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    }

    req.params = value;
    return next();
  };

  /**
   * Validator for updating sales order details
   */
  updateSalesOrderDetailsValidator = async (req, res, next) => {
    const paramsSchema = Joi.object({
      uuid: Joi.string().required().guid({ version: 'uuidv4' })
    });

    const bodySchema = Joi.object({
      customerName: Joi.string().max(100).required(),
      personalPhone: Joi.string().max(20).required(),
      alternatePhone: Joi.string().allow(null, '').max(20),
      cnic: Joi.string().allow(null, '').max(15),
      address: Joi.string().allow(null, '')
    });

    const paramsResult = paramsSchema.validate(req.params, this.#options);
    const bodyResult = bodySchema.validate(req.body, this.#options);

    if (paramsResult.error || bodyResult.error) {
      const errorMessages = [
        ...(paramsResult.error ? [this.#formatErrorMessage(paramsResult.error)] : []),
        ...(bodyResult.error ? [this.#formatErrorMessage(bodyResult.error)] : [])
      ];
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessages.join('. ')));
    }

    req.params = paramsResult.value;
    req.body = bodyResult.value;
    return next();
  };

  /**
   * Validator for updating MSISDN in a sales order
   */
  updateMsisdnValidator = async (req, res, next) => {
    const paramsSchema = Joi.object({
      uuid: Joi.string().required().guid({ version: 'uuidv4' })
    });

    const bodySchema = Joi.object({
      msisdn_uuid: Joi.string().required().guid({ version: 'uuidv4' }).messages({
        'string.empty': 'MSISDN UUID is required',
        'any.required': 'MSISDN UUID is required',
        'string.guid': 'MSISDN UUID must be a valid UUID'
      }),
      bundle_id: Joi.string().guid({ version: 'uuidv4' }).allow(null, '').messages({
        'string.guid': 'Bundle ID must be a valid UUID'
      })
    });

    const paramsResult = paramsSchema.validate(req.params, this.#options);
    const bodyResult = bodySchema.validate(req.body, this.#options);

    if (paramsResult.error || bodyResult.error) {
      const errorMessages = [
        ...(paramsResult.error ? [this.#formatErrorMessage(paramsResult.error)] : []),
        ...(bodyResult.error ? [this.#formatErrorMessage(bodyResult.error)] : [])
      ];
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessages.join('. ')));
    }

    req.params = paramsResult.value;
    req.body = bodyResult.value;
    return next();
  };
}

module.exports = SalesOrderValidator; 
