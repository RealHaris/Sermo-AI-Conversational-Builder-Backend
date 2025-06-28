const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');

class BundleValidator {
  // Common validation options
  #options = {
    abortEarly: false, // include all errors
    allowUnknown: true, // ignore unknown props
    stripUnknown: true, // remove unknown props
  };

  // Common bundle schema to reuse
  #bundleSchema = Joi.object({
    bundleName: Joi.string().required().max(100),
    type: Joi.string().required().valid('post_paid', 'pre_paid'),
    category: Joi.string().valid('monthly', 'weekly', 'international_roaming', 'easy_card').default('monthly'),
    validity: Joi.number().integer().required().min(1),
    validityType: Joi.string().required().valid('days', 'month'),
    voiceOnNetMins: Joi.string().allow('', null),
    voiceOffNetMins: Joi.string().allow('', null),
    sms: Joi.string().allow('', null),
    data: Joi.string().allow('', null),
    dataUnit: Joi.string().required().valid('MB', 'GB'),
    bundlePrice: Joi.number().required().min(0),
    discount: Joi.number().min(0),
    bundleFinalPrice: Joi.number().required().min(0),
    offerId: Joi.string().allow(null, '').max(100),
    numberTypes: Joi.array().items(Joi.string()).min(1).required(),
    status: Joi.boolean()
  });

  /**
   * Format error message to be more user-friendly
   * @param {Object} error - Joi error object
   * @returns {String} - Formatted error message
   */
  #formatErrorMessage = (error) => {
    return error.details
      .map((detail) => {
        // Handle enum validation errors
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

  createBundleValidator = async (req, res, next) => {
    const { error, value } = this.#bundleSchema.validate(req.body, this.#options);

    if (error) {
      const errorMessage = this.#formatErrorMessage(error);
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    }

    req.body = value;
    return next();
  };

  createBulkBundlesValidator = async (req, res, next) => {
    const schema = Joi.array().items(this.#bundleSchema).min(1).max(100);

    const { error, value } = schema.validate(req.body, this.#options);

    if (error) {
      const formattedErrors = error.details.map(detail => {
        // Extract the index and field from the path
        const pathMatch = detail.path.toString().match(/^(\d+)\.(.+)$/);
        if (pathMatch) {
          const [, index, field] = pathMatch;
          const itemIndex = parseInt(index) + 1; // Make it 1-based for user-friendliness

          // Format the message based on the error type
          if (detail.type === 'any.only') {
            const invalidValue = detail.context.value;
            const allowedValues = detail.context.valids
              .filter(v => v !== null && typeof v !== 'object')
              .join(', ');

            return `Item #${itemIndex}: Invalid value "${invalidValue}" for ${field}. Allowed values are [${allowedValues}]`;
          }

          // Format other error types
          return `Item #${itemIndex}: ${detail.message.replace(/^"[^"]+"/, field)}`;
        }

        return detail.message;
      });

      const errorMessage = formattedErrors.join('. ');
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    }

    req.body = value;
    return next();
  };

  getBundlesValidator = async (req, res, next) => {
    const schema = Joi.object({
      page: Joi.number().integer().min(1),
      limit: Joi.number().integer().min(1).max(100),
      category: Joi.string().valid('monthly', 'weekly', 'international_roaming', 'easy_card'),
      type: Joi.string().valid('post_paid', 'pre_paid'),
      search: Joi.string(),
      number_type_slug: Joi.string(),
      status: Joi.boolean(),
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')),
      sortBy: Joi.string().valid('createdAt', 'bundleName', 'bundlePrice', 'bundleFinalPrice'),
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

  getBundleValidator = async (req, res, next) => {
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

  getBundlesByCategoryValidator = async (req, res, next) => {
    const paramsSchema = Joi.object({
      category: Joi.string().required().valid('monthly', 'weekly', 'international_roaming', 'easy_card')
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

  getBundlesByNumberTypeValidator = async (req, res, next) => {
    const querySchema = Joi.object({
      slug: Joi.string().required(),
      cityId: Joi.number().integer().min(1)
    });

    const queryResult = querySchema.validate(req.query, this.#options);

    if (queryResult.error) {
      const errorMessage = this.#formatErrorMessage(queryResult.error);
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    }

    req.query = queryResult.value;
    return next();
  };

  updateBundleCategoriesBulkValidator = async (req, res, next) => {
    const categoryItemSchema = Joi.object({
      uuid: Joi.string().required().guid({ version: 'uuidv4' }),
      category: Joi.string().required().valid('monthly', 'weekly', 'international_roaming', 'easy_card')
    });

    const schema = Joi.array().items(categoryItemSchema).min(1).max(100).required();

    const { error, value } = schema.validate(req.body, this.#options);

    if (error) {
      const formattedErrors = error.details.map(detail => {
        // Extract the index and field from the path
        const pathMatch = detail.path.toString().match(/^(\d+)\.(.+)$/);
        if (pathMatch) {
          const [, index, field] = pathMatch;
          const itemIndex = parseInt(index) + 1; // Make it 1-based for user-friendliness

          // Format the message based on the error type
          if (detail.type === 'any.only') {
            const invalidValue = detail.context.value;
            const allowedValues = detail.context.valids
              .filter(v => v !== null && typeof v !== 'object')
              .join(', ');

            return `Item #${itemIndex}: Invalid value "${invalidValue}" for ${field}. Allowed values are [${allowedValues}]`;
          }

          // Format other error types
          return `Item #${itemIndex}: ${detail.message.replace(/^"[^"]+"/, field)}`;
        }

        return detail.message;
      });

      const errorMessage = formattedErrors.join('. ');
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    }

    req.body = value;
    return next();
  };

  updateBundleValidator = async (req, res, next) => {
    const paramsSchema = Joi.object({
      uuid: Joi.string().required().guid({ version: 'uuidv4' })
    });

    const bodySchema = Joi.object({
      bundleName: Joi.string().max(100),
      type: Joi.string().valid('post_paid', 'pre_paid'),
      category: Joi.string().valid('monthly', 'weekly', 'international_roaming', 'easy_card'),
      validity: Joi.number().integer().min(1),
      validityType: Joi.string().valid('days', 'month'),
      voiceOnNetMins: Joi.string().allow('', null),
      voiceOffNetMins: Joi.string().allow('', null),
      sms: Joi.string().allow('', null),
      data: Joi.string().allow('', null),
      dataUnit: Joi.string().valid('MB', 'GB'),
      bundlePrice: Joi.number().min(0),
      discount: Joi.number().min(0),
      bundleFinalPrice: Joi.number().min(0),
      offerId: Joi.string().allow(null, '').max(100),
      numberTypes: Joi.array().items(Joi.string()).min(1),
      status: Joi.boolean()
    }).min(1);

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

  changeStatusValidator = async (req, res, next) => {
    const paramsSchema = Joi.object({
      uuid: Joi.string().required().guid({ version: 'uuidv4' })
    });

    const bodySchema = Joi.object({
      status: Joi.boolean().required()
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

  deleteBundleValidator = async (req, res, next) => {
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

  bulkDeleteBundlesValidator = async (req, res, next) => {
    // Create schema for bulk delete request body (array of UUIDs)
    const schema = Joi.array()
      .items(Joi.string().guid({ version: 'uuidv4' }))
      .min(1)
      .max(100)
      .required();

    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // include all errors
      allowUnknown: false, // don't allow unknown props
    });

    if (error) {
      const errorMessage = this.#formatErrorMessage(error);
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    }

    req.body = value;
    return next();
  };
}

module.exports = BundleValidator;
