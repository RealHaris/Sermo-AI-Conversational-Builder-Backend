const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');

class CityValidator {
  async createCityValidator(req, res, next) {
    // create schema object
    const schema = Joi.object({
      name: Joi.string().required(),
      region_uuid: Joi.string().required().pattern(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ).message('region_uuid must be a valid UUID'),
      status: Joi.boolean().optional(),
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

  async updateCityValidator(req, res, next) {
    // create schema object for update
    const schema = Joi.object({
      name: Joi.string(),
      region_uuid: Joi.string().pattern(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ).message('region_uuid must be a valid UUID'),
      status: Joi.boolean().optional(),
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

  async validatePriority(req, res, next) {
    const schema = Joi.object({
      priority: Joi.number().integer().min(0).required()
    });

    const options = {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
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
  }
}

module.exports = CityValidator;
