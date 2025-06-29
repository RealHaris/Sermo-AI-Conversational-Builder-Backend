const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');
const config = require('../config/config');
const logger = require('../config/logger');

class WebhookValidator {
    async validateVapiWebhook(req, res, next) {
        const schema = Joi.object({
            type: Joi.string().required(),
            timestamp: Joi.date().iso().default(() => new Date()),
            call: Joi.object({
                id: Joi.string().required(),
                status: Joi.string(),
                type: Joi.string(),
                duration: Joi.number(),
                startedAt: Joi.date().iso(),
                endedAt: Joi.date().iso(),
                recordingUrl: Joi.string().uri(),
                transcript: Joi.string(),
                cost: Joi.number(),
                endedReason: Joi.string(),
                artifact: Joi.object(),
                customer: Joi.object(),
                phoneNumber: Joi.string()
            }).optional(),
            chat: Joi.object({
                id: Joi.string().required(),
                messages: Joi.array(),
                status: Joi.string()
            }).optional(),
            assistant: Joi.object({
                id: Joi.string().required(),
                name: Joi.string()
            }).optional(),
            message: Joi.object({
                type: Joi.string(),
                role: Joi.string().valid('user', 'assistant', 'system'),
                content: Joi.string(),
                transcript: Joi.string(),
                audio: Joi.any(),
                timestamp: Joi.date().iso()
            }).optional(),
            data: Joi.object().optional()
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

    async validateCallWebhook(req, res, next) {
        const schema = Joi.object({
            type: Joi.string().valid(
                'call-start',
                'call-end',
                'end-of-call-report',
                'status-update',
                'transcript',
                'speech-update'
            ).required(),
            call: Joi.object({
                id: Joi.string().required(),
                status: Joi.string().valid('queued', 'ringing', 'in-progress', 'ended', 'failed'),
                type: Joi.string().valid('webCall', 'outboundPhoneCall', 'inboundPhoneCall'),
                duration: Joi.number().min(0),
                startedAt: Joi.date().iso(),
                endedAt: Joi.date().iso(),
                recordingUrl: Joi.string().uri(),
                transcript: Joi.string(),
                cost: Joi.number().min(0),
                endedReason: Joi.string(),
                artifact: Joi.object({
                    recordingUrl: Joi.string().uri(),
                    messages: Joi.array(),
                    messagesOpenAIFormatted: Joi.array()
                }),
                customer: Joi.object({
                    number: Joi.string(),
                    name: Joi.string(),
                    email: Joi.string().email()
                }),
                phoneNumber: Joi.string()
            }).required(),
            message: Joi.object({
                type: Joi.string(),
                role: Joi.string().valid('user', 'assistant', 'system'),
                content: Joi.string(),
                transcript: Joi.string(),
                audio: Joi.any(),
                timestamp: Joi.date().iso()
            }).optional(),
            timestamp: Joi.date().iso().default(() => new Date()),
            data: Joi.object().optional()
        });

        const options = {
            abortEarly: false,
            allowUnknown: true,
            stripUnknown: false,
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

    async validateChatWebhook(req, res, next) {
        const schema = Joi.object({
            type: Joi.string().valid(
                'conversation-update',
                'message-received',
                'message-sent',
                'chat-started',
                'chat-ended'
            ).required(),
            chat: Joi.object({
                id: Joi.string().required(),
                messages: Joi.array().items(Joi.object({
                    role: Joi.string().valid('user', 'assistant', 'system'),
                    content: Joi.string(),
                    timestamp: Joi.date().iso()
                })),
                status: Joi.string()
            }).required(),
            message: Joi.object({
                role: Joi.string().valid('user', 'assistant', 'system'),
                content: Joi.string(),
                timestamp: Joi.date().iso(),
                messageId: Joi.string()
            }).optional(),
            assistant: Joi.object({
                id: Joi.string().required(),
                name: Joi.string()
            }).optional(),
            timestamp: Joi.date().iso().default(() => new Date()),
            data: Joi.object().optional()
        });

        const options = {
            abortEarly: false,
            allowUnknown: true,
            stripUnknown: false,
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

    async validateAssistantWebhook(req, res, next) {
        const schema = Joi.object({
            type: Joi.string().valid(
                'assistant-request',
                'function-call',
                'tool-calls',
                'assistant-response'
            ).required(),
            assistant: Joi.object({
                id: Joi.string().required(),
                name: Joi.string(),
                model: Joi.object(),
                voice: Joi.object()
            }).required(),
            call: Joi.object({
                id: Joi.string()
            }).optional(),
            chat: Joi.object({
                id: Joi.string()
            }).optional(),
            message: Joi.object({
                role: Joi.string().valid('user', 'assistant', 'system'),
                content: Joi.string(),
                functionCall: Joi.object({
                    name: Joi.string(),
                    arguments: Joi.object()
                }),
                toolCalls: Joi.array().items(Joi.object({
                    id: Joi.string(),
                    type: Joi.string(),
                    function: Joi.object({
                        name: Joi.string(),
                        arguments: Joi.string()
                    })
                }))
            }).optional(),
            timestamp: Joi.date().iso().default(() => new Date()),
            data: Joi.object().optional()
        });

        const options = {
            abortEarly: false,
            allowUnknown: true,
            stripUnknown: false,
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

    async validateWebhookSignature(req, res, next) {
        const signature = req.headers['x-vapi-signature'] || req.headers['vapi-signature'];
        const secret = config.vapi.webhookSecret;

        if (!secret) {
            logger.warn('Vapi webhook secret not configured, skipping validation');
            return next();
        }

        if (!signature) {
            return next(new ApiError(httpStatus.UNAUTHORIZED, 'Missing webhook signature'));
        }

        const crypto = require('crypto');
        const payload = JSON.stringify(req.body);

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');

        if (signature !== expectedSignature) {
            return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid webhook signature'));
        }

        return next();
    }

    async validateHealthCheck(req, res, next) {
        const schema = Joi.object({
            // No validation needed for health check
        });

        const options = {
            abortEarly: false,
            allowUnknown: true,
            stripUnknown: false,
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

    async validateWebhookRetry(req, res, next) {
        const schema = Joi.object({
            webhook_id: Joi.string().required(),
            retry_count: Joi.number().integer().min(0).max(5).default(0),
            delay_seconds: Joi.number().integer().min(0).max(3600).default(30)
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

    async validateBatchWebhook(req, res, next) {
        const schema = Joi.object({
            webhooks: Joi.array().items(
                Joi.object({
                    type: Joi.string().required(),
                    timestamp: Joi.date().iso(),
                    call: Joi.object().optional(),
                    chat: Joi.object().optional(),
                    assistant: Joi.object().optional(),
                    message: Joi.object().optional(),
                    data: Joi.object().optional()
                })
            ).min(1).max(100).required(),
            batch_id: Joi.string().default(() => require('uuid').v4()),
            processing_mode: Joi.string().valid('sequential', 'parallel').default('sequential')
        });

        const options = {
            abortEarly: false,
            allowUnknown: true,
            stripUnknown: false,
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

module.exports = WebhookValidator;
