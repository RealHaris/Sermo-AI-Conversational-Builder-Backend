const httpStatus = require('http-status');

const responseHandler = require('../helper/responseHandler');
const logger = require('../config/logger');
const VapiService = require('./VapiService');
const config = require('../config/config');
class AssistantService {
    constructor() {
        this.vapiService = new VapiService();
    }

    createAssistant = async (assistantBody) => {
        try {
            const { name, system_prompt } = assistantBody;

            if (!name || !system_prompt) {
                return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Name and system_prompt are required');
            }

            const vapiConfig = {
                name: name,
                model: {
                    provider: 'openai',
                    model: 'gpt-4',
                    messages: [
                        {
                            role: 'system',
                            content: system_prompt,
                        },
                    ],
                },
                voice: {
                    provider: 'elevenlabs',
                    voiceId: 'burt',
                },
                transcriber: {
                    provider: 'deepgram',
                    model: 'nova-2',
                    language: 'en',
                },
                firstMessage: 'Hello! How can I help you today?',
            };

            if (config.app.url && config.vapi.webhookSecret) {
                vapiConfig.serverUrl = `${config.app.url}/api/webhooks/vapi`;
                vapiConfig.serverUrlSecret = config.vapi.webhookSecret;
            }

            try {
                const vapiAssistant = await this.vapiService.createAssistant(vapiConfig);
                return responseHandler.returnSuccess(httpStatus.CREATED, 'Assistant created successfully!', vapiAssistant);
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

    getAssistants = async (query) => {
        try {
            const assistants = await this.vapiService.listAssistants(query);
            return responseHandler.returnSuccess(httpStatus.OK, 'Assistants retrieved successfully', assistants);
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    getAssistantById = async (id) => {
        try {
            const assistant = await this.vapiService.getAssistant(id);
            return responseHandler.returnSuccess(httpStatus.OK, 'Assistant retrieved successfully', assistant);
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    updateAssistant = async (id, updateBody) => {
        try {
            const updatedAssistant = await this.vapiService.updateAssistant(id, updateBody);
            return responseHandler.returnSuccess(httpStatus.OK, 'Assistant updated successfully', updatedAssistant);
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    deleteAssistant = async (id) => {
        try {
            await this.vapiService.deleteAssistant(id);
            return responseHandler.returnSuccess(httpStatus.OK, 'Assistant deleted successfully', {});
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };
}

module.exports = AssistantService;
