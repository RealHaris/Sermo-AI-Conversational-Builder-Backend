const axios = require('axios');
const logger = require('../config/logger');
const config = require('../config/config');

class VapiService {
    constructor() {
        this.apiKey = config.vapi.privateKey;
        this.publicKey = config.vapi.publicKey;
        this.baseURL = 'https://api.vapi.ai';

        if (!this.apiKey) {
            logger.warn('VAPI_PRIVATE_KEY not found in environment variables');
        }

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
    }

    /**
     * Create assistant in Vapi
     * @param {Object} assistantConfig
     * @returns {Object}
     */
    async createAssistant(assistantConfig) {
        try {
            const response = await this.client.post('/assistant', assistantConfig);
            logger.info(`Vapi assistant created: ${response.data.id}`);
            return response.data;
        } catch (error) {
            logger.error('Failed to create Vapi assistant:', error.response?.data || error.message);
            throw new Error(`Vapi assistant creation failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Get assistant from Vapi
     * @param {String} assistantId
     * @returns {Object}
     */
    async getAssistant(assistantId) {
        try {
            const response = await this.client.get(`/assistant/${assistantId}`);
            return response.data;
        } catch (error) {
            logger.error(`Failed to get Vapi assistant ${assistantId}:`, error.response?.data || error.message);
            throw new Error(`Failed to get assistant: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Update assistant in Vapi
     * @param {String} assistantId
     * @param {Object} updateConfig
     * @returns {Object}
     */
    async updateAssistant(assistantId, updateConfig) {
        try {
            const response = await this.client.patch(`/assistant/${assistantId}`, updateConfig);
            logger.info(`Vapi assistant updated: ${assistantId}`);
            return response.data;
        } catch (error) {
            logger.error(`Failed to update Vapi assistant ${assistantId}:`, error.response?.data || error.message);
            throw new Error(`Vapi assistant update failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Delete assistant from Vapi
     * @param {String} assistantId
     * @returns {Boolean}
     */
    async deleteAssistant(assistantId) {
        try {
            await this.client.delete(`/assistant/${assistantId}`);
            logger.info(`Vapi assistant deleted: ${assistantId}`);
            return true;
        } catch (error) {
            logger.error(`Failed to delete Vapi assistant ${assistantId}:`, error.response?.data || error.message);
            throw new Error(`Vapi assistant deletion failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Create chat in Vapi
     * @param {Object} chatConfig
     * @returns {Object}
     */
    async createChat(chatConfig) {
        try {
            const response = await this.client.post('/chat', chatConfig);
            logger.info(`Vapi chat created: ${response.data.id}`);
            return response.data;
        } catch (error) {
            logger.error('Failed to create Vapi chat:', error.response?.data || error.message);
            throw new Error(`Vapi chat creation failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Get chat from Vapi
     * @param {String} chatId
     * @returns {Object}
     */
    async getChat(chatId) {
        try {
            const response = await this.client.get(`/chat/${chatId}`);
            return response.data;
        } catch (error) {
            logger.error(`Failed to get Vapi chat ${chatId}:`, error.response?.data || error.message);
            throw new Error(`Failed to get chat: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Delete chat from Vapi
     * @param {String} chatId
     * @returns {Boolean}
     */
    async deleteChat(chatId) {
        try {
            await this.client.delete(`/chat/${chatId}`);
            logger.info(`Vapi chat deleted: ${chatId}`);
            return true;
        } catch (error) {
            logger.error(`Failed to delete Vapi chat ${chatId}:`, error.response?.data || error.message);
            throw new Error(`Vapi chat deletion failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Create call in Vapi
     * @param {Object} callConfig
     * @returns {Object}
     */
    async createCall(callConfig) {
        try {
            const response = await this.client.post('/call', callConfig);
            logger.info(`Vapi call created: ${response.data.id}`);
            return response.data;
        } catch (error) {
            logger.error('Failed to create Vapi call:', error.response?.data || error.message);
            throw new Error(`Vapi call creation failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Get call from Vapi
     * @param {String} callId
     * @returns {Object}
     */
    async getCall(callId) {
        try {
            const response = await this.client.get(`/call/${callId}`);
            return response.data;
        } catch (error) {
            logger.error(`Failed to get Vapi call ${callId}:`, error.response?.data || error.message);
            throw new Error(`Failed to get call: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * End call in Vapi
     * @param {String} callId
     * @returns {Object}
     */
    async endCall(callId) {
        try {
            const response = await this.client.post(`/call/${callId}/end`);
            logger.info(`Vapi call ended: ${callId}`);
            return response.data;
        } catch (error) {
            logger.error(`Failed to end Vapi call ${callId}:`, error.response?.data || error.message);
            throw new Error(`Failed to end call: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * List assistants from Vapi
     * @param {Object} params
     * @returns {Array}
     */
    async listAssistants(params = {}) {
        try {
            const response = await this.client.get('/assistant', { params });
            return response.data;
        } catch (error) {
            logger.error('Failed to list Vapi assistants:', error.response?.data || error.message);
            throw new Error(`Failed to list assistants: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * List calls from Vapi
     * @param {Object} params
     * @returns {Array}
     */
    async listCalls(params = {}) {
        try {
            const response = await this.client.get('/call', { params });
            return response.data;
        } catch (error) {
            logger.error('Failed to list Vapi calls:', error.response?.data || error.message);
            throw new Error(`Failed to list calls: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Send background message to chat (for voice message context)
     * @param {String} chatId
     * @param {Object} message
     * @returns {Object}
     */
    async addBackgroundMessage(chatId, message) {
        try {
            // Note: This might need to be adjusted based on actual Vapi API
            const response = await this.client.post(`/chat/${chatId}/message`, {
                ...message,
                background: true
            });
            return response.data;
        } catch (error) {
            logger.warn(`Failed to add background message to chat ${chatId}:`, error.response?.data || error.message);
            // Don't throw error for background messages as they're optional
            return null;
        }
    }

    /**
     * Get public key for frontend
     * @returns {String}
     */
    getPublicKey() {
        return this.publicKey;
    }

    /**
     * Validate webhook signature (if Vapi provides this)
     * @param {String} payload
     * @param {String} signature
     * @param {String} secret
     * @returns {Boolean}
     */
    validateWebhookSignature(payload, signature, secret) {
        try {
            const crypto = require('crypto');
            const expectedSignature = crypto
                .createHmac('sha256', secret || this.apiKey)
                .update(payload)
                .digest('hex');

            return signature === expectedSignature;
        } catch (error) {
            logger.error('Webhook signature validation failed:', error);
            return false;
        }
    }

    /**
     * Get service status
     * @returns {Object}
     */
    getStatus() {
        return {
            configured: !!this.apiKey,
            hasPublicKey: !!this.publicKey,
            baseURL: this.baseURL
        };
    }
}

module.exports = VapiService;
