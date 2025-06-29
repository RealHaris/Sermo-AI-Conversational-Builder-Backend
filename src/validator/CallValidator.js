const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');

class CallValidator {
    async callCreateValidator(req, res, next) {
        const schema = Joi.object({
            assistant_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
            chat_id: Joi.string().uuid({ version: 'uuidv4' }).allow(null),
            type: Joi.string().valid('webCall', 'outboundPhoneCall', 'inboundPhoneCall').default('webCall'),
            direction: Joi.string().valid('inbound', 'outbound').default('outbound'),
            customer: Joi.object({
                number: Joi.string().when('..type', {
                    is: Joi.string().valid('outboundPhoneCall', 'inboundPhoneCall'),
                    then: Joi.required(),
                    otherwise: Joi.optional()
                }),
                name: Joi.string().allow('', null),
                email: Joi.string().email().allow('', null)
            }).default({}),
            metadata: Joi.object().default({})
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

    async callUpdateValidator(req, res, next) {
        const schema = Joi.object({
            status: Joi.string().valid('queued', 'ringing', 'in-progress', 'ended', 'failed'),
            duration: Joi.number().integer().min(0),
            recording_url: Joi.string().uri().allow('', null),
            transcript: Joi.string().allow('', null),
            customer_phone: Joi.string().allow('', null),
            ended_reason: Joi.string().allow('', null),
            metadata: Joi.object()
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

    async statusUpdateValidator(req, res, next) {
        const schema = Joi.object({
            status: Joi.string().valid('queued', 'ringing', 'in-progress', 'ended', 'failed').required()
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

    async validateUUID(req, res, next) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const id = req.params.id;

        if (!id || !uuidRegex.test(id)) {
            return next(new ApiError(httpStatus.BAD_REQUEST, 'Invalid UUID format'));
        }

        return next();
    }

    async validateSearchQuery(req, res, next) {
        const schema = Joi.object({
            q: Joi.string().min(1).max(100),
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(10),
            status: Joi.string().valid('queued', 'ringing', 'in-progress', 'ended', 'failed'),
            type: Joi.string().valid('webCall', 'outboundPhoneCall', 'inboundPhoneCall'),
            assistant_id: Joi.string().uuid({ version: 'uuidv4' }),
            user_id: Joi.string().uuid({ version: 'uuidv4' }),
            duration_min: Joi.number().integer().min(0),
            duration_max: Joi.number().integer().min(Joi.ref('duration_min')),
            sort: Joi.string().valid('created_at', 'started_at', 'ended_at', 'duration', 'status').default('created_at'),
            order: Joi.string().valid('ASC', 'DESC').default('DESC'),
            date_from: Joi.date().iso(),
            date_to: Joi.date().iso().when('date_from', {
                is: Joi.exist(),
                then: Joi.date().min(Joi.ref('date_from')),
                otherwise: Joi.optional()
            })
        });

        const options = {
            abortEarly: false,
            allowUnknown: true,
            stripUnknown: true,
        };

        const { error, value } = schema.validate(req.query, options);

        if (error) {
            const errorMessage = error.details
                .map((details) => details.message)
                .join(', ');
            next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
        } else {
            req.query = value;
            return next();
        }
    }

    async validateAnalyticsQuery(req, res, next) {
        const schema = Joi.object({
            period: Joi.string().valid('day', 'week', 'month', 'year').default('week'),
            include_transcript: Joi.boolean().default(true),
            include_recording: Joi.boolean().default(true)
        });

        const options = {
            abortEarly: false,
            allowUnknown: true,
            stripUnknown: true,
        };

        const { error, value } = schema.validate(req.query, options);

        if (error) {
            const errorMessage = error.details
                .map((details) => details.message)
                .join(', ');
            next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
        } else {
            req.query = value;
            return next();
        }
    }

    async validateBulkOperation(req, res, next) {
        const schema = Joi.object({
            call_ids: Joi.array().items(
                Joi.string().uuid({ version: 'uuidv4' })
            ).min(1).max(50).required(),
            operation: Joi.string().valid('end', 'delete', 'archive').required()
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

    async validateWebhook(req, res, next) {
        const schema = Joi.object({
            type: Joi.string().required(),
            call: Joi.object().required(),
            message: Joi.object(),
            assistant: Joi.object(),
            timestamp: Joi.date().iso(),
            data: Joi.object()
        });

        const options = {
            abortEarly: false,
            allowUnknown: true,
            stripUnknown: false, // Keep all webhook data
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

    async validatePhoneNumber(req, res, next) {
        const schema = Joi.object({
            phone_number: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required().messages({
                'string.pattern.base': 'Phone number must be in valid international format'
            })
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

module.exports = CallValidator;