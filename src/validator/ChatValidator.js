const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');

class ChatValidator {
    async chatCreateValidator(req, res, next) {
        const schema = Joi.object({
            assistant_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
            name: Joi.string().allow('', null).max(255),
            initial_message: Joi.string().allow('', null).max(1000).default('Hello!'),
            status: Joi.string().valid('active', 'archived').default('active'),
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

    async chatUpdateValidator(req, res, next) {
        const schema = Joi.object({
            name: Joi.string().allow('', null).max(255),
            status: Joi.string().valid('active', 'archived'),
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

    async messageCreateValidator(req, res, next) {
        const schema = Joi.object({
            content: Joi.string().required().min(1).max(5000),
            type: Joi.string().valid('text', 'voice').default('text'),
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

    async archiveValidator(req, res, next) {
        const schema = Joi.object({
            archived: Joi.boolean().required()
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
            status: Joi.string().valid('active', 'archived'),
            assistant_id: Joi.string().uuid({ version: 'uuidv4' }),
            user_id: Joi.string().uuid({ version: 'uuidv4' }),
            sort: Joi.string().valid('name', 'created_at', 'updated_at', 'last_message_at', 'message_count').default('last_message_at'),
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

    async validateHistoryQuery(req, res, next) {
        const schema = Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(200).default(50),
            include_voice: Joi.boolean().default(true),
            message_type: Joi.string().valid('text', 'voice', 'all').default('all'),
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

    async validateBulkOperation(req, res, next) {
        const schema = Joi.object({
            chat_ids: Joi.array().items(
                Joi.string().uuid({ version: 'uuidv4' })
            ).min(1).max(50).required(),
            operation: Joi.string().valid('archive', 'unarchive', 'delete').required()
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

    async validateVoiceMessage(req, res, next) {
        // This would be used with multer middleware for file upload
        const schema = Joi.object({
            transcribe: Joi.boolean().default(true),
            duration: Joi.number().min(0).max(600), // 10 minutes max
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

    async validateAnalyticsQuery(req, res, next) {
        const schema = Joi.object({
            period: Joi.string().valid('day', 'week', 'month', 'year').default('week'),
            include_messages: Joi.boolean().default(true),
            include_voice: Joi.boolean().default(true)
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
}

module.exports = ChatValidator;