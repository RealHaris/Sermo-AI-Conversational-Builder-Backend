const express = require('express');
const router = express.Router();
const VapiAssistantController = require('../controllers/VapiAssistantController');
const VapiAssistantValidator = require('../validator/VapiAssistantValidator');
const { auth } = require('../middlewares/auth');

const vapiAssistantValidator = new VapiAssistantValidator();
const vapiAssistantController = new VapiAssistantController();

// Routes
router.post(
  '/create',
  auth,
  vapiAssistantValidator.createAssistantValidator,
  VapiAssistantController.createAssistant
);

router.get(
  '/list',
  auth,
  VapiAssistantController.listAssistants
)

router.post(
  '/conversation/start',
  auth,
  vapiAssistantValidator.startChatValidator,
  VapiAssistantController.startChat
);

router.post(
  '/conversation/message',
  auth,
  vapiAssistantValidator.sendMessageValidator,
  VapiAssistantController.sendVoiceMessage
);

router.put(
  '/:assistantId',
  auth,
  vapiAssistantValidator.updateAssistantValidator,
  VapiAssistantController.sendVoiceMessage
);

router.delete(
  '/:assistantId',
  auth,
  vapiAssistantValidator.validateAssistantId,
  VapiAssistantController.deleteMessage
);

module.exports = router; 
