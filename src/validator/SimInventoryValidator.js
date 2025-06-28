const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');

class SimInventoryValidator {
  async createSimInventoryValidator(req, res, next) {
    // create schema object
    const schema = Joi.object({
      number_type_id: Joi.number().required(),
      number: Joi.string().required(),
      sim_price: Joi.number().required(),
      discount: Joi.number().min(0).default(0),
      final_sim_price: Joi.number().required(),
      city_uuid: Joi.string().guid({ version: 'uuidv4' }),
      status: Joi.string().valid('Available', 'Sold', 'Not Available').default('Available'),
    });

    // schema options
    const options = {
      abortEarly: false, // include all errors
      allowUnknown: true, // ignore unknown props
      stripUnknown: true, // remove unknown props
    };

    // validate request body against schema
    const { error, value } = schema.validate(req.body, options);

    if (error) {
      // on fail return comma separated errors
      const errorMessage = error.details
        .map((details) => {
          return details.message;
        })
        .join(', ');
      next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    } else {
      // on success replace req.body with validated value and trigger next middleware function
      req.body = value;
      return next();
    }
  }

  async createBulkSimInventoryValidator(req, res, next) {
    // Create schema for array items
    const itemSchema = Joi.object({
      number_type: Joi.string().required(),
      number: Joi.string().required(),
      sim_price: Joi.number().required(),
      discount: Joi.number().min(0).default(0),
      final_sim_price: Joi.number().required(),
      city_name: Joi.string(), // Allow city name for bulk import
    });

    // Create schema for the request body (array of items)
    const schema = Joi.array().items(itemSchema).min(1).required();

    // schema options
    const options = {
      abortEarly: false, // include all errors
    };

    // validate request body against schema
    const { error, value } = schema.validate(req.body, options);

    if (error) {
      // on fail return comma separated errors
      const errorMessage = error.details
        .map((details) => {
          return details.message;
        })
        .join(', ');
      next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    } else {
      // on success replace req.body with validated value and trigger next middleware function
      req.body = value;
      return next();
    }
  }

  async updateSimInventoryValidator(req, res, next) {
    // create schema object for update
    const schema = Joi.object({
      number_type_id: Joi.number(),
      number: Joi.string(),
      sim_price: Joi.number(),
      discount: Joi.number().min(0),
      final_sim_price: Joi.number(),
      city_uuid: Joi.string().guid({ version: 'uuidv4' }),
      status: Joi.string().valid('Available', 'Sold', 'Not Available'),
    });

    // schema options
    const options = {
      abortEarly: false, // include all errors
      allowUnknown: true, // ignore unknown props
      stripUnknown: true, // remove unknown props
    };

    // validate request body against schema
    const { error, value } = schema.validate(req.body, options);

    if (error) {
      // on fail return comma separated errors
      const errorMessage = error.details
        .map((details) => {
          return details.message;
        })
        .join(', ');
      next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    } else {
      // on success replace req.body with validated value and trigger next middleware function
      req.body = value;
      return next();
    }
  }

  async changeCityValidator(req, res, next) {
    // create schema object for city update
    const schema = Joi.object({
      city_uuid: Joi.string().guid({ version: 'uuidv4' }).required(),
    });

    // schema options
    const options = {
      abortEarly: false, // include all errors
      allowUnknown: true, // ignore unknown props
      stripUnknown: true, // remove unknown props
    };

    // validate request body against schema
    const { error, value } = schema.validate(req.body, options);

    if (error) {
      // on fail return comma separated errors
      const errorMessage = error.details
        .map((details) => {
          return details.message;
        })
        .join(', ');
      next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    } else {
      // on success replace req.body with validated value and trigger next middleware function
      req.body = value;
      return next();
    }
  }

  async changeStatusValidator(req, res, next) {
    // create schema object for status update
    const schema = Joi.object({
      status: Joi.string().valid('Available', 'Sold', 'Not Available').required(),
    });

    // schema options
    const options = {
      abortEarly: false, // include all errors
      allowUnknown: true, // ignore unknown props
      stripUnknown: true, // remove unknown props
    };

    // validate request body against schema
    const { error, value } = schema.validate(req.body, options);

    if (error) {
      // on fail return comma separated errors
      const errorMessage = error.details
        .map((details) => {
          return details.message;
        })
        .join(', ');
      next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    } else {
      // on success replace req.body with validated value and trigger next middleware function
      req.body = value;
      return next();
    }
  }

  async validateUUID(req, res, next) {
    // Regex for UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const id = req.params.id;

    if (!id || !uuidRegex.test(id)) {
      return next(new ApiError(httpStatus.BAD_REQUEST, 'Invalid UUID format'));
    }

    return next();
  }

  /**
   * Validate slug parameter
   * @param {Object} req
   * @param {Object} res
   * @param {Function} next
   */
  async validateSlug(req, res, next) {
    try {
      // Validate params
      const paramsSchema = Joi.object({
        slug: Joi.string().required()
      });

      // Validate query parameters
      const querySchema = Joi.object({
        cityId: Joi.number().integer().min(1)
      });

      const paramsResult = paramsSchema.validate(req.params, {
        abortEarly: false,
        allowUnknown: true,
      });

      const queryResult = querySchema.validate(req.query, {
        abortEarly: false,
        allowUnknown: true,
      });

      if (paramsResult.error || queryResult.error) {
        const errorMessages = [
          ...(paramsResult.error ? paramsResult.error.details.map(detail => detail.message) : []),
          ...(queryResult.error ? queryResult.error.details.map(detail => detail.message) : [])
        ].join(', ');

        return next(new ApiError(httpStatus.BAD_REQUEST, errorMessages));
      }

      req.params = paramsResult.value;
      req.query = queryResult.value;
      return next();
    } catch (error) {
      return next(new ApiError(httpStatus.BAD_REQUEST, error.message));
    }
  }

  async validatePagination(req, res, next) {
    // Create schema for pagination query parameters
    const schema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      status: Joi.string().valid('Available', 'Sold', 'Not Available'),
      number_type_id: Joi.number().integer(),
      number_type_slug: Joi.string(),
      number: Joi.string(),
      search: Joi.string(), // New search filter for number
      min_price: Joi.number().min(0),
      max_price: Joi.number().min(0),
      city_id: Joi.number().integer(),
      city_uuid: Joi.string().guid({ version: 'uuidv4' }),
      startDate: Joi.date().iso(), // New start date filter
      endDate: Joi.date().iso().min(Joi.ref('startDate')), // New end date filter (must be after startDate)
      sort_by: Joi.string().valid('created_at', 'number', 'sim_price', 'status').default('created_at'),
      sort_order: Joi.string().valid('asc', 'desc').default('desc'),
    });

    // schema options
    const options = {
      abortEarly: false, // include all errors
      allowUnknown: true, // ignore unknown props
    };

    // validate request query against schema
    const { error, value } = schema.validate(req.query, options);

    if (error) {
      // on fail return comma separated errors
      const errorMessage = error.details
        .map((details) => {
          return details.message;
        })
        .join(', ');
      next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    } else {
      // on success replace req.query with validated value and trigger next middleware function
      req.query = value;
      return next();
    }
  }

  async validateExternalAvailableSimsRequest(req, res, next) {
    // Create schema for external API endpoint query parameters
    const schema = Joi.object({
      cityId: Joi.number().integer().required(),
      numberTypeId: Joi.number().integer().required(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      offset: Joi.number().integer().min(0),
    });

    // schema options
    const options = {
      abortEarly: false, // include all errors
      allowUnknown: true, // ignore unknown props
    };

    // validate request query against schema
    const { error, value } = schema.validate(req.query, options);

    if (error) {
      // on fail return comma separated errors
      const errorMessage = error.details
        .map((details) => {
          return details.message;
        })
        .join(', ');
      next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    } else {
      // on success replace req.query with validated value and trigger next middleware function
      req.query = value;
      return next();
    }
  }

  /**
   * Validate number type query parameters
   * @param {Object} req
   * @param {Object} res
   * @param {Function} next
   */
  async validateNumberTypeQuery(req, res, next) {
    try {
      // Validate query parameters
      const querySchema = Joi.object({
        slug: Joi.string().required(),
        cityId: Joi.number().integer().min(1)
      });

      const queryResult = querySchema.validate(req.query, {
        abortEarly: false,
        allowUnknown: true,
      });

      if (queryResult.error) {
        const errorMessages = queryResult.error.details
          .map(detail => detail.message)
          .join(', ');

        return next(new ApiError(httpStatus.BAD_REQUEST, errorMessages));
      }

      req.query = queryResult.value;
      return next();
    } catch (error) {
      return next(new ApiError(httpStatus.BAD_REQUEST, error.message));
    }
  }

  async bulkDeleteValidator(req, res, next) {
    // Create schema for bulk delete request body (array of UUIDs)
    const schema = Joi.array()
      .items(Joi.string().guid({ version: 'uuidv4' }))
      .min(1)
      .max(100)
      .required();

    // schema options
    const options = {
      abortEarly: false, // include all errors
      allowUnknown: false, // don't allow unknown props
    };

    // validate request body against schema
    const { error, value } = schema.validate(req.body, options);

    if (error) {
      // on fail return comma separated errors
      const errorMessage = error.details
        .map((details) => {
          return details.message;
        })
        .join(', ');
      next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    } else {
      // on success replace req.body with validated value and trigger next middleware function
      req.body = value;
      return next();
    }
  }
}

module.exports = SimInventoryValidator; 
