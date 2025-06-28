const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');

class ExternalApiTokenValidator {
  async generateTokenValidator(req, res, next) {
    // create schema object
    const schema = Joi.object({
      duration: Joi.number().valid(30, 60, 90).allow(null)
        .messages({
          'any.only': 'Duration must be 30, 60, 90 days, or null for no expiration'
        }),
      description: Joi.string().max(255)
        .messages({
          'string.max': 'Description cannot exceed 255 characters',
          'string.base': 'Description must be a string'
        })
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

  async revokeTokenValidator(req, res, next) {
    // validate tokenId parameter
    const schema = Joi.object({
      tokenId: Joi.number().integer().required()
        .messages({
          'number.base': 'Token ID must be an integer'
        })
    });

    // validate request parameters
    const { error } = schema.validate({ tokenId: parseInt(req.params.tokenId, 10) });

    if (error) {
      const errorMessage = error.details
        .map((details) => {
          return details.message;
        })
        .join(', ');
      next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    } else {
      return next();
    }
  }
}

module.exports = ExternalApiTokenValidator; 
