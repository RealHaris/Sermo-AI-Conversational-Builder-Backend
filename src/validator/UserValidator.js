const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');

class UserValidator {
    async userCreateValidator(req, res, next) {
        // create schema object
        const schema = Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().min(6).required(),
            confirm_password: Joi.string().valid(Joi.ref('password')).required(),
            full_name: Joi.string().required(),
            address: Joi.string().allow('', null),
            phone_number: Joi.string().allow('', null),
            role_id: Joi.number().integer().allow(null),
            data_access_type: Joi.string().valid('all', 'regional', 'city').default('all'),
            reference_ids: Joi.when('data_access_type', {
                is: Joi.string().valid('regional', 'city'),
                then: Joi.array().items(Joi.number().integer()).min(1),
                otherwise: Joi.optional()
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

    async userLoginValidator(req, res, next) {
        // create schema object
        const schema = Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().min(6).required(),
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

    async checkEmailValidator(req, res, next) {
        // create schema object
        const schema = Joi.object({
            email: Joi.string().email().required(),
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

    async changePasswordValidator(req, res, next) {
        // create schema object
        const schema = Joi.object({
            new_password: Joi.string().min(6).required(),
            confirm_password: Joi.string().valid(Joi.ref('new_password')).required(),
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

    async userUpdateValidator(req, res, next) {
        // create schema object for update
        const schema = Joi.object({
            email: Joi.string().email(),
            full_name: Joi.string(),
            address: Joi.string().allow('', null),
            phone_number: Joi.string().allow('', null),
            status: Joi.number().integer(),
            role_id: Joi.number().integer().allow(null),
            data_access_type: Joi.string().valid('all', 'regional', 'city'),
            reference_ids: Joi.when('data_access_type', {
                is: Joi.string().valid('regional', 'city'),
                then: Joi.array().items(Joi.number().integer()).min(1),
                otherwise: Joi.optional()
            }),
            // Allow password but don't require it
            password: Joi.string().min(6),
            // If password is present, require confirm_password
            confirm_password: Joi.when('password', {
                is: Joi.exist(),
                then: Joi.string().valid(Joi.ref('password')).required(),
                otherwise: Joi.optional()
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

    async changeStatusValidator(req, res, next) {
        // create schema object
        const schema = Joi.object({
            status: Joi.number().integer().required().valid(0, 1) // Assuming 0=inactive, 1=active
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
            const errorMessage = error.details
                .map((details) => {
                    return details.message;
                })
                .join(', ');
            next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
        } else {
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
}

module.exports = UserValidator;
