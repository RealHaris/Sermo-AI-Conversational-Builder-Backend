const httpStatus = require('http-status');
const { v4: uuidv4 } = require('uuid');
const ChatDao = require('../dao/ChatDao');
const MessageDao = require('../dao/MessageDao');
const AssistantDao = require('../dao/AssistantDao');
const responseHandler = require('../helper/responseHandler');
const logger = require('../config/logger');
const models = require('../models');
const VapiService = require('./VapiService');
const CloudinaryService = require('./CloudinaryService');

class ChatService {
    constructor() {
        this.chatDao = new ChatDao();
        this.messageDao = new MessageDao();
        this.assistantDao = new AssistantDao();
        this.vapiService = new VapiService();
        this.cloudinaryService = new CloudinaryService();
    }

    /**
     * Create a chat
     * @param {Object} chatBody
     * @param {Object} user
     * @returns {Object}
     */
    createChat = async (chatBody, user) => {
        try {
            let message = 'Chat created successfully!';

            // Validate assistant exists
            const assistant = await this.assistantDao.findOneByWhere({ uuid: chatBody.assistant_id });
            if (!assistant) {
                return responseHandler.returnError(httpStatus.NOT_FOUND, 'Assistant not found');
            }

            if (!assistant.vapi_assistant_id) {
                return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Assistant not configured for Vapi');
            }

            const uuid = uuidv4();
            chatBody.uuid = uuid;
            chatBody.assistant_id = assistant.id; // Use internal ID
            chatBody.user_id = user?.id || null;
            chatBody.status = 'active';
            chatBody.message_count = 0;

            try {
                // Create chat in Vapi
                const vapiChat = await this.vapiService.createChat({
                    assistantId: assistant.vapi_assistant_id,
                    message: chatBody.initial_message || 'Hello!'
                });

                chatBody.vapi_chat_id = vapiChat.id;
                chatBody.message_count = vapiChat.messages ? vapiChat.messages.length : 0;

                // Start transaction
                const result = await models.sequelize.transaction(async (transaction) => {
                    const chatData = await this.chatDao.createWithTransaction(chatBody, transaction);

                    // Increment assistant chat count
                    await this.assistantDao.incrementChatCount(assistant.id);

                    return chatData;
                });

                if (!result) {
                    message = 'Chat creation failed! Please try again.';
                    return responseHandler.returnError(httpStatus.BAD_REQUEST, message);
                }

                const chatData = result.toJSON();
                chatData.assistant = assistant;
                chatData.vapi_messages = vapiChat.messages || [];

                return responseHandler.returnSuccess(httpStatus.CREATED, message, chatData);
            } catch (error) {
                logger.error('Vapi chat creation failed:', error);
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Failed to create chat: ' + (error.message || 'Unknown error')
                );
            }
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Get all chats with pagination
     * @param {Object} query - Query parameters for filtering and pagination
     * @param {Object} user - Current user
     * @returns {Object}
     */
    getChats = async (query, user) => {
        try {
            const page = parseInt(query.page) || 1;
            const limit = parseInt(query.limit) || 10;
            const { page: _, limit: __, ...filter } = query;

            // Add user filter if not admin
            if (user && user.role !== 'admin') {
                filter.user_id = user.id;
            }

            const chats = await this.chatDao.findWithPagination(page, limit, filter);

            const totalPages = Math.ceil(chats.count / limit);
            const pagination = {
                total: chats.count,
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                has_next_page: page < totalPages,
                has_prev_page: page > 1
            };

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'Chats retrieved successfully',
                {
                    content: chats.rows,
                    pagination
                }
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Get chat by ID
     * @param {String} id - Chat's UUID
     * @param {Object} user - Current user
     * @returns {Object}
     */
    getChatById = async (id, user) => {
        try {
            const chat = await this.chatDao.findOneByWhere({ uuid: id });

            if (!chat) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Chat not found'
                );
            }

            // Check user permissions
            if (user && user.role !== 'admin' && chat.user_id !== user.id) {
                return responseHandler.returnError(
                    httpStatus.FORBIDDEN,
                    'Access denied'
                );
            }

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'Chat retrieved successfully',
                chat
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Get chat history/messages
     * @param {String} id - Chat's UUID
     * @param {Object} query - Query parameters
     * @param {Object} user - Current user
     * @returns {Object}
     */
    getChatHistory = async (id, query, user) => {
        try {
            const chat = await this.chatDao.findOneByWhere({ uuid: id });

            if (!chat) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Chat not found'
                );
            }

            // Check user permissions
            if (user && user.role !== 'admin' && chat.user_id !== user.id) {
                return responseHandler.returnError(
                    httpStatus.FORBIDDEN,
                    'Access denied'
                );
            }

            const page = parseInt(query.page) || 1;
            const limit = parseInt(query.limit) || 50;

            // Get chat history from Vapi
            const vapiChat = await this.vapiService.getChat(chat.vapi_chat_id);
            const messages = vapiChat.messages || [];

            // Combine and paginate
            const startIndex = (page - 1) * limit;
            const paginatedMessages = messages.slice(startIndex, startIndex + limit);

            const totalPages = Math.ceil(messages.length / limit);
            const pagination = {
                total: messages.length,
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                has_next_page: page < totalPages,
                has_prev_page: page > 1
            };

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'Chat history retrieved successfully',
                {
                    messages: paginatedMessages,
                    pagination
                }
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Update chat
     * @param {String} id - Chat's UUID
     * @param {Object} updateBody - Data to update
     * @param {Object} user - Current user
     * @returns {Object}
     */
    updateChat = async (id, updateBody, user) => {
        try {
            const chat = await this.chatDao.findOneByWhere({ uuid: id });

            if (!chat) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Chat not found'
                );
            }

            // Check user permissions
            if (user && user.role !== 'admin' && chat.user_id !== user.id) {
                return responseHandler.returnError(
                    httpStatus.FORBIDDEN,
                    'Access denied'
                );
            }

            await this.chatDao.updateWhere(updateBody, { uuid: id });

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'Chat updated successfully',
                {}
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Delete chat
     * @param {String} id - Chat's UUID
     * @param {Object} user - Current user
     * @returns {Object}
     */
    deleteChat = async (id, user) => {
        try {
            const chat = await this.chatDao.findOneByWhere({ uuid: id });

            if (!chat) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Chat not found'
                );
            }

            // Check user permissions
            if (user && user.role !== 'admin' && chat.user_id !== user.id) {
                return responseHandler.returnError(
                    httpStatus.FORBIDDEN,
                    'Access denied'
                );
            }

            try {
                // Delete from Vapi if exists
                if (chat.vapi_chat_id) {
                    await this.vapiService.deleteChat(chat.vapi_chat_id);
                }
            } catch (error) {
                logger.warn('Failed to delete from Vapi, continuing with local deletion:', error);
            }

            // Soft delete from local database
            const deleted = await this.chatDao.deleteWhere({ uuid: id });

            if (!deleted) {
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Failed to delete chat'
                );
            }

            // Decrement assistant chat count
            if (chat.assistant_id) {
                await this.assistantDao.decrementChatCount(chat.assistant_id);
            }

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'Chat deleted successfully',
                {}
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Send message to chat
     * @param {String} chatId - Chat's UUID
     * @param {Object} messageData - Message data
     * @param {Object} user - Current user
     * @returns {Object}
     */
    sendMessage = async (chatId, messageData, user) => {
        try {
            const chat = await this.chatDao.findOneByWhere({ uuid: chatId });

            if (!chat) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Chat not found'
                );
            }

            // Check user permissions
            if (user && user.role !== 'admin' && chat.user_id !== user.id) {
                return responseHandler.returnError(
                    httpStatus.FORBIDDEN,
                    'Access denied'
                );
            }

            if (!chat.vapi_chat_id) {
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Chat not configured for Vapi'
                );
            }

            try {
                // Send message to Vapi
                const messagePayload = {
                    role: 'user',
                    content: messageData.content
                };
                const vapiResponse = await this.vapiService.sendMessage(chat.vapi_chat_id, messagePayload);

                // Update chat metadata
                await this.chatDao.updateWhere(
                    {
                        message_count: chat.message_count + 1,
                        last_message_at: new Date()
                    },
                    { uuid: chatId }
                );

                return responseHandler.returnSuccess(
                    httpStatus.OK,
                    'Message sent successfully',
                    {
                        message: vapiResponse,
                        chat_id: chatId
                    }
                );
            } catch (error) {
                logger.error('Message sending failed:', error);
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Failed to send message: ' + (error.message || 'Unknown error')
                );
            }
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Send voice message to chat
     * @param {String} chatId - Chat's UUID
     * @param {Object} messageData - Message data
     * @param {Object} user - Current user
     * @returns {Object}
     */
    sendVoiceMessage = async (chatId, messageData, user) => {
        try {
            const chat = await this.chatDao.findOneByWhere({ uuid: chatId });

            if (!chat) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Chat not found'
                );
            }

            if (!chat.vapi_chat_id) {
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Chat not configured for Vapi'
                );
            }

            // Assuming voice message has a similar structure to text message
            const messagePayload = {
                role: 'user',
                content: messageData.content,
                type: 'voice'
            };

            // Send to Vapi (Mock example)
            const vapiResponse = await this.vapiService.sendVoiceMessage(chat.vapi_chat_id, messagePayload);

            await this.chatDao.updateWhere(
                {
                    message_count: chat.message_count + 1,
                    last_message_at: new Date()
                },
                { uuid: chatId }
            );

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'Voice message sent successfully',
                {
                    message: vapiResponse,
                    chat_id: chatId
                }
            );

        } catch (error) {
            logger.error('Voice message sending failed:', error);
            return responseHandler.returnError(
                httpStatus.BAD_REQUEST,
                'Failed to send voice message: ' + (error.message || 'Unknown error')
            );
        }
    };

    /**
     * Get chat analytics
     * @param {String} id - Chat's UUID
     * @param {Object} user - Current user
     * @returns {Object}
     */
    getChatAnalytics = async (id, user) => {
        try {
            const chat = await this.chatDao.findOneByWhere({ uuid: id });

            if (!chat) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Chat not found'
                );
            }

            // Check user permissions
            if (user && user.role !== 'admin' && chat.user_id !== user.id) {
                return responseHandler.returnError(
                    httpStatus.FORBIDDEN,
                    'Access denied'
                );
            }

            const analytics = await this.chatDao.getChatAnalytics(chat.id);

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'Chat analytics retrieved successfully',
                analytics
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Archive/unarchive chat
     * @param {String} id - Chat's UUID
     * @param {Boolean} archived - Archive status
     * @param {Object} user - Current user
     * @returns {Object}
     */
    archiveChat = async (id, archived, user) => {
        try {
            const chat = await this.chatDao.findOneByWhere({ uuid: id });

            if (!chat) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Chat not found'
                );
            }

            // Check user permissions
            if (user && user.role !== 'admin' && chat.user_id !== user.id) {
                return responseHandler.returnError(
                    httpStatus.FORBIDDEN,
                    'Access denied'
                );
            }

            const status = archived ? 'archived' : 'active';
            await this.chatDao.updateWhere({ status }, { uuid: id });

            return responseHandler.returnSuccess(
                httpStatus.OK,
                `Chat ${archived ? 'archived' : 'unarchived'} successfully`,
                {}
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };
}

module.exports = ChatService;
