const httpStatus = require('http-status');
const WebhookService = require('../service/WebhookService');
const logger = require('../config/logger');

class WebhookController {
  constructor() {
    this.webhookService = new WebhookService();
  }

  /**
   * Handle all Vapi webhooks
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  handleVapiWebhook = async (req, res) => {
    try {
      logger.info('Vapi webhook received:', {
        type: req.body.type,
        timestamp: new Date().toISOString(),
        headers: req.headers
      });

      const result = await this.webhookService.handleVapiWebhook(req.body, req.headers);
      
      // Always return 200 OK to Vapi to prevent retries
      return res.status(httpStatus.OK).json({
        received: true,
        processed: result.success,
        timestamp: new Date().toISOString(),
        ...(result.error && { error: result.error })
      });
    } catch (error) {
      logger.error('Webhook processing error:', error);
      
      // Still return 200 to prevent Vapi retries
      return res.status(httpStatus.OK).json({
        received: true,
        processed: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Handle Vapi call webhooks
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  handleCallWebhook = async (req, res) => {
    try {
      logger.info('Vapi call webhook received:', {
        type: req.body.type,
        callId: req.body.call?.id,
        timestamp: new Date().toISOString()
      });

      const result = await this.webhookService.handleCallWebhook(req.body, req.headers);
      
      return res.status(httpStatus.OK).json({
        received: true,
        processed: result.success,
        timestamp: new Date().toISOString(),
        ...(result.error && { error: result.error })
      });
    } catch (error) {
      logger.error('Call webhook processing error:', error);
      
      return res.status(httpStatus.OK).json({
        received: true,
        processed: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Handle Vapi chat webhooks
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  handleChatWebhook = async (req, res) => {
    try {
      logger.info('Vapi chat webhook received:', {
        type: req.body.type,
        chatId: req.body.chat?.id,
        timestamp: new Date().toISOString()
      });

      const result = await this.webhookService.handleChatWebhook(req.body, req.headers);
      
      return res.status(httpStatus.OK).json({
        received: true,
        processed: result.success,
        timestamp: new Date().toISOString(),
        ...(result.error && { error: result.error })
      });
    } catch (error) {
      logger.error('Chat webhook processing error:', error);
      
      return res.status(httpStatus.OK).json({
        received: true,
        processed: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Handle Vapi assistant webhooks
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  handleAssistantWebhook = async (req, res) => {
    try {
      logger.info('Vapi assistant webhook received:', {
        type: req.body.type,
        assistantId: req.body.assistant?.id,
        timestamp: new Date().toISOString()
      });

      const result = await this.webhookService.handleAssistantWebhook(req.body, req.headers);
      
      return res.status(httpStatus.OK).json({
        received: true,
        processed: result.success,
        timestamp: new Date().toISOString(),
        ...(result.error && { error: result.error })
      });
    } catch (error) {
      logger.error('Assistant webhook processing error:', error);
      
      return res.status(httpStatus.OK).json({
        received: true,
        processed: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Webhook health check
   * @param {Object} req
   * @param {Object} res
   * @returns {Promise<Object>}
   */
  webhookHealth = async (req, res) => {
    try {
      const health = await this.webhookService.getWebhookHealth();
      
      return res.status(httpStatus.OK).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        ...health
      });
    } catch (error) {
      logger.error('Webhook health check error:', error);
      
      return res.status(httpStatus.SERVICE_UNAVAILABLE).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
}

module.exports = WebhookController;