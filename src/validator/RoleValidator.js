const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');

class RoleValidator {
  async validateRoleCreate(req, res, next) {
    // create schema object
    const schema = Joi.object({
      name: Joi.string().required(),
    });

    // schema options
    const options = {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
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

  async validateRoleUpdate(req, res, next) {
    // create schema object
    const schema = Joi.object({
      name: Joi.string(),
    }).min(1); // At least one field must be present

    // schema options
    const options = {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
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

  async validatePermissionUpdate(req, res, next) {
    // create schema object
    const schema = Joi.object({
      field: Joi.string().required(),
      value: Joi.boolean().required()
    });

    // schema options
    const options = {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
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

  async validateRoleAssignment(req, res, next) {
    // create schema object
    const schema = Joi.object({
      role_id: Joi.number().integer().required()
    });

    // schema options
    const options = {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
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

  async validateId(req, res, next) {
    // Create schema object for ID parameter validation
    const schema = Joi.object({
      id: Joi.number().integer().required()
    });

    // Validate request parameter against schema
    const { error } = schema.validate({ id: parseInt(req.params.id) });

    if (error) {
      return next(new ApiError(httpStatus.BAD_REQUEST, 'Invalid role ID'));
    }

    return next();
  }
}

module.exports = RoleValidator; 
