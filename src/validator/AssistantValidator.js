const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');

class AssistantValidator {
    async assistantCreateValidator(req, res, next) {
        const schema = Joi.object({
            name: Joi.string().required().min(2).max(255),
            description: Joi.string().allow('', null).max(1000),
            system_prompt: Joi.string().required().min(10).max(10000),
            
            // Model configuration
            model_provider: Joi.string().valid('openai', 'anthropic', 'google', 'meta').default('openai'),
            model_name: Joi.string().default('gpt-4'),
            temperature: Joi.number().min(0).max(2).default(0.7),
            max_tokens: Joi.number().integer().min(1).max(4000).default(500),
            
            // Voice configuration
            voice_provider: Joi.string().valid('elevenlabs', 'openai', 'azure', 'deepgram').default('elevenlabs'),
            voice_id: Joi.string().default('burt'),
            voice_speed: Joi.number().min(0.25).max(4.0).default(1.0),
            voice_stability: Joi.number().min(0).max(1).default(0.5),
            voice_similarity_boost: Joi.number().min(0).max(1).default(0.75),
            
            // Transcriber configuration
            transcriber_provider: Joi.string().valid('deepgram', 'assemblyai', 'openai').default('deepgram'),
            transcriber_model: Joi.string().default('nova-2'),
            language: Joi.string().default('en'),
            
            // Assistant behavior
            first_message: Joi.string().allow('', null).max(500),
            silence_timeout: Joi.number().integer().min(5).max(300).default(30),
            max_duration: Joi.number().integer().min(60).max(7200).default(1800), // 30 minutes
            background_sound: Joi.string().valid('off', 'office').default('off'),
            
            // Status and metadata
            status: Joi.number().integer().valid(0, 1).default(1),
            tags: Joi.array().items(Joi.string()).default([]),
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

    async assistantUpdateValidator(req, res, next) {
        const schema = Joi.object({
            name: Joi.string().min(2).max(255),
            description: Joi.string().allow('', null).max(1000),
            system_prompt: Joi.string().min(10).max(10000),
            
            // Model configuration
            model_provider: Joi.string().valid('openai', 'anthropic', 'google', 'meta'),
            model_name: Joi.string(),
            temperature: Joi.number().min(0).max(2),
            max_tokens: Joi.number().integer().min(1).max(4000),
            
            // Voice configuration
            voice_provider: Joi.string().valid('elevenlabs', 'openai', 'azure', 'deepgram'),
            voice_id: Joi.string(),
            voice_speed: Joi.number().min(0.25).max(4.0),
            voice_stability: Joi.number().min(0).max(1),
            voice_similarity_boost: Joi.number().min(0).max(1),
            
            // Transcriber configuration
            transcriber_provider: Joi.string().valid('deepgram', 'assemblyai', 'openai'),
            transcriber_model: Joi.string(),
            language: Joi.string(),
            
            // Assistant behavior
            first_message: Joi.string().allow('', null).max(500),
            silence_timeout: Joi.number().integer().min(5).max(300),
            max_duration: Joi.number().integer().min(60).max(7200),
            background_sound: Joi.string().valid('off', 'office'),
            
            // Status and metadata
            status: Joi.number().integer().valid(0, 1),
            tags: Joi.array().items(Joi.string()),
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

    async changeStatusValidator(req, res, next) {
        const schema = Joi.object({
            status: Joi.number().integer().required().valid(0, 1)
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

    async chatCreateValidator(req, res, next) {
        const schema = Joi.object({
            name: Joi.string().allow('', null).max(255),
            initial_message: Joi.string().allow('', null).max(1000).default('Hello!'),
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

    async callCreateValidator(req, res, next) {
        const schema = Joi.object({
            type: Joi.string().valid('webCall', 'outboundPhoneCall', 'inboundPhoneCall').default('webCall'),
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
            status: Joi.number().integer().valid(0, 1),
            model_provider: Joi.string().valid('openai', 'anthropic', 'google', 'meta'),
            voice_provider: Joi.string().valid('elevenlabs', 'openai', 'azure', 'deepgram'),
            sort: Joi.string().valid('name', 'created_at', 'updated_at', 'chat_count', 'call_count').default('created_at'),
            order: Joi.string().valid('ASC', 'DESC').default('DESC')
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
            assistant_ids: Joi.array().items(
                Joi.string().uuid({ version: 'uuidv4' })
            ).min(1).max(50).required(),
            operation: Joi.string().valid('activate', 'deactivate', 'delete').required()
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

    async validateVapiWebhook(req, res, next) {
        const schema = Joi.object({
            type: Joi.string().required(),
            message: Joi.object(),
            call: Joi.object(),
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
}

module.exports = AssistantValidator;