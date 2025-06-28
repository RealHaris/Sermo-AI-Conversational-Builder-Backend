const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');
const { validateRequest } = require('../middlewares/validateRequest');

class VapiAssistantValidator {
  createAssistantValidator = (req, res, next) => {
    const schema = Joi.object({
      name: Joi.string().required().min(3).max(100),
      prompt: Joi.string().required().min(10).max(4000)
    });
    validateRequest(req, next, schema);
  };

  startChatValidator = (req, res, next) => {
    const schema = Joi.object({
      assistantId: Joi.string().required(),
      message: Joi.string().allow('', null)
    });
    validateRequest(req, next, schema);
  };

  renameChatValidator = (req, res, next) => {
    const schema = Joi.object({
      name: Joi.string().required().min(3).max(100)
    });
    validateRequest(req, next, schema);
  };

  async sendMessageValidator(req, res, next) {
    const schema = Joi.object({
      conversationId: Joi.string().required(),
      message: Joi.string().required().min(1),
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

  async updateAssistantValidator(req, res, next) {
    const paramsSchema = Joi.object({
      assistantId: Joi.string().uuid().required(),
    });

    const bodySchema = Joi.object({
      name: Joi.string().min(3).max(100),
      prompt: Joi.string().min(10),
    }).min(1);

    const options = {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
    };

    const paramsValidation = paramsSchema.validate(req.params, options);
    const bodyValidation = bodySchema.validate(req.body, options);

    if (paramsValidation.error || bodyValidation.error) {
      const errorMessage = [
        ...(paramsValidation.error ? paramsValidation.error.details : []),
        ...(bodyValidation.error ? bodyValidation.error.details : []),
      ]
        .map((details) => details.message)
        .join(', ');
      next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    } else {
      req.params = paramsValidation.value;
      req.body = bodyValidation.value;
      return next();
    }
  }

  async validateAssistantId(req, res, next) {
    const schema = Joi.object({
      assistantId: Joi.string().uuid().required(),
    });

    const options = {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
    };

    const { error, value } = schema.validate(req.params, options);

    if (error) {
      const errorMessage = error.details
        .map((details) => details.message)
        .join(', ');
      next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    } else {
      req.params = value;
      return next();
    }
  }
}

module.exports = VapiAssistantValidator; 
