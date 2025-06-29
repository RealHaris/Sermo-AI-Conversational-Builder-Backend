const express = require('express');
const ChatController = require('../controllers/ChatController');
const ChatValidator = require('../validator/ChatValidator');

const router = express.Router();
const chatController = new ChatController();
const chatValidator = new ChatValidator();

// Get all chats
router.get('/', chatValidator.validateSearchQuery, chatController.getChats);

// Get chat by id
router.get('/:id', chatValidator.validateUUID, chatController.getChatById);

// Get chat history/messages
router.get('/:id/history', chatValidator.validateUUID, chatValidator.validateHistoryQuery, chatController.getChatHistory);

// Create new chat
router.post('/', chatValidator.chatCreateValidator, chatController.createChat);

// Update chat
router.put('/:id', chatValidator.validateUUID, chatValidator.chatUpdateValidator, chatController.updateChat);

// Delete chat
router.delete('/:id', chatValidator.validateUUID, chatController.deleteChat);

// Send message to chat
router.post('/:id/message', chatValidator.validateUUID, chatValidator.messageCreateValidator, chatController.sendMessage);

// Send voice message to chat
router.post('/:id/voice', chatValidator.validateUUID, chatController.sendVoiceMessage);

// Get chat analytics
router.get('/:id/analytics', chatValidator.validateUUID, chatController.getChatAnalytics);

// Archive/unarchive chat
router.patch('/:id/archive', chatValidator.validateUUID, chatValidator.archiveValidator, chatController.archiveChat);

module.exports = router;