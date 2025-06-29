const httpStatus = require('http-status');
const { v4: uuidv4 } = require('uuid');
const CallDao = require('../dao/CallDao');
const AssistantDao = require('../dao/AssistantDao');
const ChatDao = require('../dao/ChatDao');
const responseHandler = require('../helper/responseHandler');
const logger = require('../config/logger');
const models = require('../models');
const VapiService = require('./VapiService');
const CloudinaryService = require('./CloudinaryService');
const config = require('../config/config');

class CallService {
    constructor() {
        this.callDao = new CallDao();
        this.assistantDao = new AssistantDao();
        this.chatDao = new ChatDao();
        this.vapiService = new VapiService();
        this.cloudinaryService = new CloudinaryService();
    }

    /**
     * Create a call
     * @param {Object} callBody
     * @param {Object} user
     * @returns {Object}
     */
    createCall = async (callBody, user) => {
        try {
            let message = 'Call created successfully!';

            // Validate assistant exists
            const assistant = await this.assistantDao.findOneByWhere({ uuid: callBody.assistant_id });
            if (!assistant) {
                return responseHandler.returnError(httpStatus.NOT_FOUND, 'Assistant not found');
            }

            if (!assistant.vapi_assistant_id) {
                return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Assistant not configured for Vapi');
            }

            const uuid = uuidv4();
            callBody.uuid = uuid;
            callBody.assistant_id = assistant.id; // Use internal ID
            callBody.user_id = user?.id || null;
            callBody.status = 'queued';
            callBody.direction = callBody.direction || 'outbound';

            try {
                // Create call in Vapi
                const vapiCall = await this.vapiService.createCall({
                    type: callBody.type || 'webCall',
                    assistantId: assistant.vapi_assistant_id,
                    customer: callBody.customer || {}
                });

                callBody.vapi_call_id = vapiCall.id;

                // Start transaction
                const result = await models.sequelize.transaction(async (transaction) => {
                    const callData = await this.callDao.createWithTransaction(callBody, transaction);

                    // Increment assistant call count
                    await this.assistantDao.incrementCallCount(assistant.id);

                    return callData;
                });

                if (!result) {
                    message = 'Call creation failed! Please try again.';
                    return responseHandler.returnError(httpStatus.BAD_REQUEST, message);
                }

                const callData = result.toJSON();
                callData.assistant = assistant;
                callData.public_key = this.vapiService.getPublicKey();

                return responseHandler.returnSuccess(httpStatus.CREATED, message, callData);
            } catch (error) {
                logger.error('Vapi call creation failed:', error);
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Failed to create call: ' + (error.message || 'Unknown error')
                );
            }
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Get all calls with pagination
     * @param {Object} query - Query parameters for filtering and pagination
     * @param {Object} user - Current user
     * @returns {Object}
     */
    getCalls = async (query, user) => {
        try {
            const page = parseInt(query.page) || 1;
            const limit = parseInt(query.limit) || 10;
            const { page: _, limit: __, ...filter } = query;

            // Add user filter if not admin
            if (user && user.role !== 'admin') {
                filter.user_id = user.id;
            }

            const calls = await this.callDao.findWithPagination(page, limit, filter);

            const totalPages = Math.ceil(calls.count / limit);
            const pagination = {
                total: calls.count,
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                has_next_page: page < totalPages,
                has_prev_page: page > 1
            };

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'Calls retrieved successfully',
                {
                    content: calls.rows,
                    pagination
                }
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Get call by ID
     * @param {String} id - Call's UUID
     * @param {Object} user - Current user
     * @returns {Object}
     */
    getCallById = async (id, user) => {
        try {
            const call = await this.callDao.findOneByWhere({ uuid: id });

            if (!call) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Call not found'
                );
            }

            // Check user permissions
            if (user && user.role !== 'admin' && call.user_id !== user.id) {
                return responseHandler.returnError(
                    httpStatus.FORBIDDEN,
                    'Access denied'
                );
            }

            // Get additional data from Vapi if needed
            let vapiCallData = null;
            if (call.vapi_call_id) {
                try {
                    vapiCallData = await this.vapiService.getCall(call.vapi_call_id);
                } catch (error) {
                    logger.warn('Failed to fetch Vapi call data:', error);
                }
            }

            const callData = call.toJSON();
            if (vapiCallData) {
                callData.vapi_data = vapiCallData;
            }

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'Call retrieved successfully',
                callData
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Update call
     * @param {String} id - Call's UUID
     * @param {Object} updateBody - Data to update
     * @param {Object} user - Current user
     * @returns {Object}
     */
    updateCall = async (id, updateBody, user) => {
        try {
            const call = await this.callDao.findOneByWhere({ uuid: id });

            if (!call) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Call not found'
                );
            }

            // Check user permissions
            if (user && user.role !== 'admin' && call.user_id !== user.id) {
                return responseHandler.returnError(
                    httpStatus.FORBIDDEN,
                    'Access denied'
                );
            }

            await this.callDao.updateWhere(updateBody, { uuid: id });

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'Call updated successfully',
                {}
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * End call
     * @param {String} id - Call's UUID
     * @param {Object} user - Current user
     * @returns {Object}
     */
    endCall = async (id, user) => {
        try {
            const call = await this.callDao.findOneByWhere({ uuid: id });

            if (!call) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Call not found'
                );
            }

            // Check user permissions
            if (user && user.role !== 'admin' && call.user_id !== user.id) {
                return responseHandler.returnError(
                    httpStatus.FORBIDDEN,
                    'Access denied'
                );
            }

            if (call.status === 'ended') {
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Call is already ended'
                );
            }

            try {
                // End call in Vapi
                if (call.vapi_call_id) {
                    await this.vapiService.endCall(call.vapi_call_id);
                }

                // Calculate duration
                const duration = call.started_at ?
                    Math.round((new Date() - new Date(call.started_at)) / 1000) : 0;

                // Update call status
                await this.callDao.updateCallStatus(call.id, 'ended', {
                    ended_at: new Date(),
                    duration: duration
                });

                return responseHandler.returnSuccess(
                    httpStatus.OK,
                    'Call ended successfully',
                    {
                        call_id: id,
                        duration: duration
                    }
                );
            } catch (error) {
                logger.error('Call ending failed:', error);
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Failed to end call: ' + (error.message || 'Unknown error')
                );
            }
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Delete call
     * @param {String} id - Call's UUID
     * @param {Object} user - Current user
     * @returns {Object}
     */
    deleteCall = async (id, user) => {
        try {
            const call = await this.callDao.findOneByWhere({ uuid: id });

            if (!call) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Call not found'
                );
            }

            // Check user permissions
            if (user && user.role !== 'admin' && call.user_id !== user.id) {
                return responseHandler.returnError(
                    httpStatus.FORBIDDEN,
                    'Access denied'
                );
            }

            // Soft delete from local database
            const deleted = await this.callDao.deleteWhere({ uuid: id });

            if (!deleted) {
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Failed to delete call'
                );
            }

            // Decrement assistant call count
            if (call.assistant_id) {
                await this.assistantDao.decrementCallCount(call.assistant_id);
            }

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'Call deleted successfully',
                {}
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Get call analytics
     * @param {String} id - Call's UUID
     * @param {Object} user - Current user
     * @returns {Object}
     */
    getCallAnalytics = async (id, user) => {
        try {
            const call = await this.callDao.findOneByWhere({ uuid: id });

            if (!call) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Call not found'
                );
            }

            // Check user permissions
            if (user && user.role !== 'admin' && call.user_id !== user.id) {
                return responseHandler.returnError(
                    httpStatus.FORBIDDEN,
                    'Access denied'
                );
            }

            const analytics = await this.callDao.getCallAnalytics(call.id);

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'Call analytics retrieved successfully',
                analytics
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Get call transcript
     * @param {String} id - Call's UUID
     * @param {Object} user - Current user
     * @returns {Object}
     */
    getCallTranscript = async (id, user) => {
        try {
            const call = await this.callDao.findOneByWhere({ uuid: id });

            if (!call) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Call not found'
                );
            }

            // Check user permissions
            if (user && user.role !== 'admin' && call.user_id !== user.id) {
                return responseHandler.returnError(
                    httpStatus.FORBIDDEN,
                    'Access denied'
                );
            }

            if (!call.transcript) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Transcript not available for this call'
                );
            }

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'Call transcript retrieved successfully',
                {
                    call_id: id,
                    transcript: call.transcript,
                    duration: call.duration
                }
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Get call recording
     * @param {String} id - Call's UUID
     * @param {Object} user - Current user
     * @returns {Object}
     */
    getCallRecording = async (id, user) => {
        try {
            const call = await this.callDao.findOneByWhere({ uuid: id });

            if (!call) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Call not found'
                );
            }

            // Check user permissions
            if (user && user.role !== 'admin' && call.user_id !== user.id) {
                return responseHandler.returnError(
                    httpStatus.FORBIDDEN,
                    'Access denied'
                );
            }

            if (!call.recording_url && !call.backup_recording_url) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Recording not available for this call'
                );
            }

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'Call recording retrieved successfully',
                {
                    call_id: id,
                    recording_url: call.backup_recording_url || call.recording_url,
                    backup_url: call.backup_recording_url,
                    original_url: call.recording_url,
                    duration: call.duration
                }
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Update call status
     * @param {String} id - Call's UUID
     * @param {String} status - New status
     * @param {Object} user - Current user
     * @returns {Object}
     */
    updateCallStatus = async (id, status, user) => {
        try {
            const call = await this.callDao.findOneByWhere({ uuid: id });

            if (!call) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'Call not found'
                );
            }

            // Check user permissions (allow system to update)
            if (user && user.role !== 'admin' && user.role !== 'system' && call.user_id !== user.id) {
                return responseHandler.returnError(
                    httpStatus.FORBIDDEN,
                    'Access denied'
                );
            }

            const updated = await this.callDao.updateCallStatus(call.id, status);

            if (!updated) {
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Failed to update call status'
                );
            }

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'Call status updated successfully',
                {
                    call_id: id,
                    status: status
                }
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Handle webhook call status updates
     * @param {String} vapiCallId - Vapi call ID
     * @param {Object} webhookData - Webhook data
     * @returns {Object}
     */
    handleWebhookUpdate = async (vapiCallId, webhookData) => {
        try {
            const call = await this.callDao.findByVapiCallId(vapiCallId);

            if (!call) {
                logger.warn(`Call not found for Vapi ID: ${vapiCallId}`);
                return { success: false, error: 'Call not found' };
            }

            const updateData = {};

            // Handle different webhook types
            switch (webhookData.type) {
                case 'call-start':
                    updateData.status = 'in-progress';
                    updateData.started_at = new Date();
                    break;

                case 'call-end':
                    updateData.status = 'ended';
                    updateData.ended_at = new Date();
                    if (webhookData.call?.duration) {
                        updateData.duration = webhookData.call.duration;
                    }
                    if (webhookData.call?.recordingUrl) {
                        updateData.recording_url = webhookData.call.recordingUrl;
                    }
                    if (webhookData.call?.transcript) {
                        updateData.transcript = webhookData.call.transcript;
                    }
                    if (webhookData.call?.endReason) {
                        updateData.end_reason = webhookData.call.endReason;
                    }
                    break;

                case 'end-of-call-report':
                    if (webhookData.call?.recordingUrl) {
                        updateData.recording_url = webhookData.call.recordingUrl;

                        // Backup recording to Cloudinary if enabled
                        if (config.cloudinary.storeCallRecordings) {
                            try {
                                const backupUrl = await this.cloudinaryService.uploadFromUrl(
                                    webhookData.call.recordingUrl,
                                    {
                                        folder: 'call-recordings',
                                        public_id: `call-${call.uuid}-recording`
                                    }
                                );
                                updateData.backup_recording_url = backupUrl.url;
                            } catch (error) {
                                logger.warn('Failed to backup call recording:', error);
                            }
                        }
                    }
                    if (webhookData.call?.transcript) {
                        updateData.transcript = webhookData.call.transcript;
                    }
                    break;
            }

            if (Object.keys(updateData).length > 0) {
                await this.callDao.updateWhere(updateData, { id: call.id });
            }

            return { success: true, call: call };
        } catch (error) {
            logger.error('Webhook call update failed:', error);
            return { success: false, error: error.message };
        }
    };
}

module.exports = CallService;
