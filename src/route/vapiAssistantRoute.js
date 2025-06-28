const express = require('express');
const router = express.Router();
const VapiAssistantController = require('../controllers/VapiAssistantController');
const { validateRequest } = require('../middlewares/validateRequest');
const { auth } = require('../middlewares/auth');
const Joi = require('joi');

// Validation schemas
const createAssistantSchema = {
  body: Joi.object({
    name: Joi.string().required().min(3).max(100),
    prompt: Joi.string().required().min(10),
  }),
};

const startConversationSchema = {
  body: Joi.object({
    assistantId: Joi.string().uuid().required(),
    message: Joi.string().required().min(1),
  }),
};

const sendMessageSchema = {
  body: Joi.object({
    conversationId: Joi.string().required(),
    message: Joi.string().required().min(1),
  }),
};

const updateAssistantSchema = {
  params: Joi.object({
    assistantId: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    name: Joi.string().min(3).max(100),
    prompt: Joi.string().min(10),
  }).min(1),
};

const deleteAssistantSchema = {
  params: Joi.object({
    assistantId: Joi.string().uuid().required(),
  }),
};

// Routes
router.post(
  '/create',
  auth,
  validateRequest(createAssistantSchema),
  VapiAssistantController.createAssistant
);

router.get(
  '/list',
  auth,
  VapiAssistantController.listAssistants
);

router.post(
  '/conversation/start',
  auth,
  validateRequest(startConversationSchema),
  VapiAssistantController.startConversation
);

router.post(
  '/conversation/message',
  auth,
  validateRequest(sendMessageSchema),
  VapiAssistantController.sendMessage
);

router.put(
  '/:assistantId',
  auth,
  validateRequest(updateAssistantSchema),
  VapiAssistantController.updateAssistant
);

router.delete(
  '/:assistantId',
  auth,
  validateRequest(deleteAssistantSchema),
  VapiAssistantController.deleteAssistant
);

module.exports = router; 
