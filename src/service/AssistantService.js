const httpStatus = require('http-status');
const { v4: uuidv4 } = require('uuid');
const AssistantDao = require('../dao/AssistantDao');
const ChatDao = require('../dao/ChatDao');
const CallDao = require('../dao/CallDao');
const responseHandler = require('../helper/responseHandler');
const logger = require('../config/logger');
const models = require('../models');
const VapiService = require('./VapiService');

class AssistantService {
    constructor() {
        this.assistantDao = new AssistantDao();
        this.chatDao = new ChatDao();
        this.callDao = new CallDao();
        this.vapiService = new VapiService();
    }

    /**
     * Create a Vapi assistant
     * @param {Object} assistantBody
     * @returns {Object}
     */
    createAssistant = async (assistantBody) => {
        try {
            let message = 'Assistant created successfully!';

            const uuid = uuidv4();
            assistantBody.uuid = uuid;
            assistantBody.status = 1; // Active by default

            // Prepare Vapi assistant configuration
            const vapiConfig = {
                name: assistantBody.name,
                model: {
                    provider: assistantBody.model_provider || 'openai',
                    model: assistantBody.model_name || 'gpt-4',
                    messages: [{
                        role: 'system',
                        content: assistantBody.system_prompt
                    }],
                    temperature: assistantBody.temperature || 0.7,
                    maxTokens: assistantBody.max_tokens || 500
                },
                voice: {
                    provider: assistantBody.voice_provider || 'elevenlabs',
                    voiceId: assistantBody.voice_id || 'burt',
                    speed: assistantBody.voice_speed || 1.0,
                    stability: assistantBody.voice_stability || 0.5,
                    similarityBoost: assistantBody.voice_similarity_boost || 0.75
                },
                transcriber: {
                    provider: assistantBody.transcriber_provider || 'deepgram',
                    model: assistantBody.transcriber_model || 'nova-2',
                    language: assistantBody.language || 'en'
                },
                firstMessage: assistantBody.first_message || 'Hello! How can I help you today?',
                clientMessages: ['conversation-update', 'speech-update', 'status-update', 'transcript', 'hang'],
                serverMessages: ['conversation-update', 'end-of-call-report', 'status-update', 'hang', 'speech-update', 'transcript'],
                silenceTimeoutSeconds: assistantBody.silence_timeout || 30,
                maxDurationSeconds: assistantBody.max_duration || 1800, // 30 minutes
                backgroundSound: assistantBody.background_sound || 'off'
            };

            try {
                // Create assistant in Vapi
                const vapiAssistant = await this.vapiService.createAssistant(vapiConfig);

                // Store Vapi assistant ID
                assistantBody.vapi_assistant_id = vapiAssistant.id;

                // Start transaction
                const result = await models.sequelize.transaction(async (transaction) => {
                    const assistantData = await this.assistantDao.createWithTransaction(assistantBody, transaction);
                    return assistantData;
                });

                if (!result) {
                    message = 'Assistant creation failed! Please try again.';
                    return responseHandler.returnError(httpStatus.BAD_REQUEST, message);
                }

                const assistantData = result.toJSON();
                assistantData.vapi_assistant_id = vapiAssistant.id;

                return responseHandler.returnSuccess(httpStatus.CREATED, message, assistantData);
            } catch (error) {
                logger.error('Vapi assistant creation failed:', error);
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Failed to create assistant in Vapi: ' + (error.message || 'Unknown error')
                );
            }
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Get all assistants with pagination
     * @param {Object} query - Query parameters for filtering and pagination
     * @returns {Object}
     */
    getAssistants = async (query) => {
        try {
            const page = parseInt(query.page) || 1;
            const limit = parseInt(query.limit) || 10;
            const { page: _, limit: __, ...filter } = query;

            const assistants = await this.assistantDao.findWithPagination(page, limit, filter);

            const totalPages = Math.ceil(assistants.count / limit);
            const pagination = {
                total: assistants.count,
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                has_next_page: page < totalPages,
                has_prev_page: page > 1
            };

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'Assistants retrieved successfully',
                {
                    content: assistants.rows,
                    pagination
                }
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Get assistant by ID
     * @param {String} id - Assistant's UUID
     * @returns {Object}
     */
    getAssistantById = async (id) => {
        try {
            const assistant = await this.assistantDao.findOneByWhere({ uuid: id });

            if (!assistant) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Assistant not found'
                );
            }

            // Get additional stats
            const [chatCount, callCount] = await Promise.all([
                this.chatDao.getCountByWhere({ assistant_id: assistant.id }),
                this.callDao.getCountByWhere({ assistant_id: assistant.id })
            ]);

            const assistantData = assistant.toJSON();
            assistantData.stats = {
                total_chats: chatCount,
                total_calls: callCount
            };

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'Assistant retrieved successfully',
                assistantData
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Update assistant
     * @param {String} id - Assistant's UUID
     * @param {Object} updateBody - Data to update
     * @returns {Object}
     */
    updateAssistant = async (id, updateBody) => {
        try {
            const assistant = await this.assistantDao.findOneByWhere({ uuid: id });

            if (!assistant) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Assistant not found'
                );
            }

            try {
                // If Vapi-related fields are being updated, update in Vapi as well
                if (this.hasVapiFields(updateBody) && assistant.vapi_assistant_id) {
                    const vapiUpdateConfig = this.buildVapiUpdateConfig(updateBody, assistant);
                    await this.vapiService.updateAssistant(assistant.vapi_assistant_id, vapiUpdateConfig);
                }

                // Update in local database
                await this.assistantDao.updateWhere(updateBody, { uuid: id });

                return responseHandler.returnSuccess(
                    httpStatus.OK,
                    'Assistant updated successfully',
                    {}
                );
            } catch (error) {
                logger.error('Assistant update failed:', error);
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Failed to update assistant: ' + (error.message || 'Unknown error')
                );
            }
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Delete assistant
     * @param {String} id - Assistant's UUID
     * @returns {Object}
     */
    deleteAssistant = async (id) => {
        try {
            const assistant = await this.assistantDao.findOneByWhere({ uuid: id });

            if (!assistant) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Assistant not found'
                );
            }

            try {
                // Delete from Vapi if exists
                if (assistant.vapi_assistant_id) {
                    await this.vapiService.deleteAssistant(assistant.vapi_assistant_id);
                }
            } catch (error) {
                logger.warn('Failed to delete from Vapi, continuing with local deletion:', error);
            }

            // Soft delete from local database
            const deleted = await this.assistantDao.deleteWhere({ uuid: id });

            if (!deleted) {
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Failed to delete assistant'
                );
            }

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'Assistant deleted successfully',
                {}
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Change assistant status
     * @param {String} id - Assistant's UUID
     * @param {Number} status - New status (0=inactive, 1=active)
     * @returns {Object}
     */
    changeStatus = async (id, status) => {
        try {
            const assistant = await this.assistantDao.findOneByWhere({ uuid: id });

            if (!assistant) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Assistant not found'
                );
            }

            const updated = await this.assistantDao.changeStatus(id, status);

            if (!updated) {
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Failed to update assistant status'
                );
            }

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'Assistant status updated successfully',
                {}
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Start chat with assistant
     * @param {String} assistantId - Assistant's UUID
     * @param {Object} chatData - Chat configuration
     * @param {Object} user - Current user
     * @returns {Object}
     */
    startChat = async (assistantId, chatData, user) => {
        try {
            const assistant = await this.assistantDao.findOneByWhere({ uuid: assistantId });

            if (!assistant) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Assistant not found'
                );
            }

            if (!assistant.vapi_assistant_id) {
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Assistant not configured for Vapi'
                );
            }

            try {
                // Create chat in Vapi
                const vapiChat = await this.vapiService.createChat({
                    assistantId: assistant.vapi_assistant_id,
                    message: chatData.initial_message || 'Hello!'
                });

                // Create chat record in database
                const chatRecord = await this.chatDao.create({
                    uuid: uuidv4(),
                    assistant_id: assistant.id,
                    user_id: user?.id || null,
                    vapi_chat_id: vapiChat.id,
                    name: chatData.name || `Chat with ${assistant.name}`,
                    status: 'active',
                    message_count: vapiChat.messages ? vapiChat.messages.length : 0
                });

                return responseHandler.returnSuccess(
                    httpStatus.CREATED,
                    'Chat started successfully',
                    {
                        chat: chatRecord,
                        vapi_chat_id: vapiChat.id,
                        messages: vapiChat.messages || []
                    }
                );
            } catch (error) {
                logger.error('Chat creation failed:', error);
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Failed to start chat: ' + (error.message || 'Unknown error')
                );
            }
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Start voice call with assistant
     * @param {String} assistantId - Assistant's UUID
     * @param {Object} callData - Call configuration
     * @param {Object} user - Current user
     * @returns {Object}
     */
    startCall = async (assistantId, callData, user) => {
        try {
            const assistant = await this.assistantDao.findOneByWhere({ uuid: assistantId });

            if (!assistant) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Assistant not found'
                );
            }

            if (!assistant.vapi_assistant_id) {
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Assistant not configured for Vapi'
                );
            }

            try {
                // Create call in Vapi
                const vapiCall = await this.vapiService.createCall({
                    type: callData.type || 'webCall',
                    assistantId: assistant.vapi_assistant_id,
                    customer: callData.customer || {}
                });

                // Create call record in database
                const callRecord = await this.callDao.create({
                    uuid: uuidv4(),
                    assistant_id: assistant.id,
                    user_id: user?.id || null,
                    vapi_call_id: vapiCall.id,
                    type: callData.type || 'webCall',
                    status: 'queued',
                    customer_phone: callData.customer?.number || null
                });

                return responseHandler.returnSuccess(
                    httpStatus.CREATED,
                    'Call started successfully',
                    {
                        call: callRecord,
                        vapi_call_id: vapiCall.id,
                        public_key: this.vapiService.getPublicKey()
                    }
                );
            } catch (error) {
                logger.error('Call creation failed:', error);
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Failed to start call: ' + (error.message || 'Unknown error')
                );
            }
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Check if update body contains Vapi-related fields
     * @param {Object} updateBody
     * @returns {Boolean}
     */
    hasVapiFields = (updateBody) => {
        const vapiFields = [
            'name', 'system_prompt', 'model_provider', 'model_name', 'temperature', 'max_tokens',
            'voice_provider', 'voice_id', 'voice_speed', 'voice_stability', 'voice_similarity_boost',
            'transcriber_provider', 'transcriber_model', 'language', 'first_message'
        ];
        return vapiFields.some(field => updateBody.hasOwnProperty(field));
    };

    /**
     * Build Vapi update configuration from update body
     * @param {Object} updateBody
     * @param {Object} assistant
     * @returns {Object}
     */
    buildVapiUpdateConfig = (updateBody, assistant) => {
        const config = {};

        if (updateBody.name) config.name = updateBody.name;
        if (updateBody.first_message) config.firstMessage = updateBody.first_message;

        if (updateBody.system_prompt || updateBody.model_provider || updateBody.model_name ||
            updateBody.temperature || updateBody.max_tokens) {
            config.model = {
                provider: updateBody.model_provider || assistant.model_provider || 'openai',
                model: updateBody.model_name || assistant.model_name || 'gpt-4',
                messages: [{
                    role: 'system',
                    content: updateBody.system_prompt || assistant.system_prompt
                }],
                temperature: updateBody.temperature || assistant.temperature || 0.7,
                maxTokens: updateBody.max_tokens || assistant.max_tokens || 500
            };
        }

        if (updateBody.voice_provider || updateBody.voice_id || updateBody.voice_speed ||
            updateBody.voice_stability || updateBody.voice_similarity_boost) {
            config.voice = {
                provider: updateBody.voice_provider || assistant.voice_provider || 'elevenlabs',
                voiceId: updateBody.voice_id || assistant.voice_id || 'burt',
                speed: updateBody.voice_speed || assistant.voice_speed || 1.0,
                stability: updateBody.voice_stability || assistant.voice_stability || 0.5,
                similarityBoost: updateBody.voice_similarity_boost || assistant.voice_similarity_boost || 0.75
            };
        }

        if (updateBody.transcriber_provider || updateBody.transcriber_model || updateBody.language) {
            config.transcriber = {
                provider: updateBody.transcriber_provider || assistant.transcriber_provider || 'deepgram',
                model: updateBody.transcriber_model || assistant.transcriber_model || 'nova-2',
                language: updateBody.language || assistant.language || 'en'
            };
        }

        return config;
    };
}

module.exports = AssistantService;
