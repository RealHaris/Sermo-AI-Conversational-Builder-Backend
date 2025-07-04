const express = require('express');
const AssistantController = require('../controllers/AssistantController');
const AssistantValidator = require('../validator/AssistantValidator');

const router = express.Router();
const assistantController = new AssistantController();
const assistantValidator = new AssistantValidator();

// Get all assistants
router.get('/', assistantController.getAssistants);

// Get assistant by id
router.get('/:id', assistantController.getAssistantById);

// Create new assistant
router.post('/', assistantValidator.assistantCreateValidator, assistantController.createAssistant);

// Update assistant
router.put('/:id', assistantValidator.validateUUID, assistantValidator.assistantUpdateValidator, assistantController.updateAssistant);

// Delete assistant
router.delete('/:id', assistantValidator.validateUUID, assistantController.deleteAssistant);

module.exports = router;
