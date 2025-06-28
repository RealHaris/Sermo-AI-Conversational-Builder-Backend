const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');

class NumberTypeValidator {
  async createNumberTypeValidator(req, res, next) {
    // create schema object
    const schema = Joi.object({
      name: Joi.string().required(),
      slug: Joi.string().required(),
      status: Joi.boolean().default(true),
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

  async updateNumberTypeValidator(req, res, next) {
    // create schema object for update
    const schema = Joi.object({
      name: Joi.string(),
      slug: Joi.string(),
      status: Joi.boolean(),
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

  async validateSlug(req, res, next) {
    const slug = req.params.slug;

    if (!slug) {
      return next(new ApiError(httpStatus.BAD_REQUEST, 'Slug is required'));
    }

    return next();
  }
}

module.exports = NumberTypeValidator; 
