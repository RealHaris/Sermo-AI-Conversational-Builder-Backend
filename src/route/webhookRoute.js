const express = require('express');
const WebhookController = require('../controllers/WebhookController');
const WebhookValidator = require('../validator/WebhookValidator');

const router = express.Router();
const webhookController = new WebhookController();
const webhookValidator = new WebhookValidator();

// // Vapi webhook endpoint
// router.post('/vapi', webhookValidator.validateVapiWebhook, webhookController.handleVapiWebhook);

// // Vapi call webhooks
// router.post('/vapi/call', webhookValidator.validateVapiWebhook, webhookController.handleCallWebhook);

// // Vapi chat webhooks
// router.post('/vapi/chat', webhookValidator.validateVapiWebhook, webhookController.handleChatWebhook);

// // Vapi assistant webhooks
// router.post('/vapi/assistant', webhookValidator.validateVapiWebhook, webhookController.handleAssistantWebhook);

// // Health check for webhooks
// router.get('/health', webhookController.webhookHealth);

module.exports = router;
