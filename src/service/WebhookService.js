const logger = require('../config/logger');
const CallService = require('./CallService');
const ChatService = require('./ChatService');
const AssistantService = require('./AssistantService');
const VapiService = require('./VapiService');
const config = require('../config/config');

class WebhookService {
    constructor() {
        this.callService = new CallService();
        this.chatService = new ChatService();
        this.assistantService = new AssistantService();
        this.vapiService = new VapiService();
    }

    /**
     * Handle all Vapi webhooks
     * @param {Object} webhookData
     * @param {Object} headers
     * @returns {Object}
     */
    async handleVapiWebhook(webhookData, headers = {}) {
        try {
            // Basic validation
            if (!webhookData || !webhookData.type) {
                logger.warn('Invalid webhook data received');
                return { success: false, error: 'Invalid data' };
            }

            const { type, call, chat, assistant, message } = webhookData;

            logger.info(`Processing Vapi webhook: ${type}`, {
                callId: call?.id,
                chatId: chat?.id,
                assistantId: assistant?.id,
                messageType: message?.type
            });

            // Verify webhook signature if available
            const signature = headers['x-vapi-signature'] || headers['vapi-signature'];
            if (signature && config.vapi.webhookSecret) {
                const isValid = this.vapiService.validateWebhookSignature(
                    JSON.stringify(webhookData),
                    signature,
                    config.vapi.webhookSecret
                );

                if (!isValid) {
                    logger.warn('Invalid webhook signature');
                    return { success: false, error: 'Invalid signature' };
                }
            }

            let result;
            if (webhookData.call) {
                result = await this.handleCallWebhook(webhookData);
            } else if (webhookData.chat) {
                result = await this.handleChatWebhook(webhookData);
            } else if (webhookData.assistant) {
                result = await this.handleAssistantWebhook(webhookData);
            } else {
                logger.warn(`Unknown webhook type: ${webhookData.type}`);
                return { success: false, error: 'Unknown webhook type' };
            }

            return result;
        } catch (error) {
            logger.error('Webhook processing failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle call-specific webhooks
     * @param {Object} webhookData
     * @param {Object} headers
     * @returns {Object}
     */
    async handleCallWebhook(webhookData) {
        try {
            const vapiCallId = webhookData.call?.id;
            if (!vapiCallId) {
                return { success: false, error: 'Missing call ID' };
            }

            const result = await this.callService.handleWebhookUpdate(vapiCallId, webhookData);

            return {
                success: result.success,
                ...(result.error && { error: result.error })
            };
        } catch (error) {
            logger.error('Call webhook handler failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle chat-specific webhooks
     * @param {Object} webhookData
     * @param {Object} headers
     * @returns {Object}
     */
    async handleChatWebhook(webhookData) {
        try {
            // Placeholder for chat webhook logic
            logger.info('Chat webhook handled:', webhookData);
            return { success: true };
        } catch (error) {
            logger.error('Chat webhook handler failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle assistant-specific webhooks
     * @param {Object} webhookData
     * @param {Object} headers
     * @returns {Object}
     */
    async handleAssistantWebhook(webhookData) {
        try {
            // Placeholder for assistant webhook logic
            logger.info('Assistant webhook handled:', webhookData);
            return { success: true };
        } catch (error) {
            logger.error('Assistant webhook handler failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get webhook health status
     * @returns {Object}
     */
    async getWebhookHealth() {
        return {
            webhook_endpoint: '/api/webhooks/vapi',
            services: {
                vapi: this.vapiService.getStatus(),
                call: true,
                chat: true,
                assistant: true
            },
            last_webhook: new Date().toISOString(),
            uptime: process.uptime()
        };
    }
}

module.exports = WebhookService;
