const cloudinary = require('cloudinary').v2;
const logger = require('../config/logger');
const fs = require('fs').promises;
const config = require('../config/config');

class CloudinaryService {
    constructor() {
        this.isConfigured = false;

        if (config.cloudinary.cloudName &&
            config.cloudinary.apiKey &&
            config.cloudinary.apiSecret) {

            cloudinary.config({
                cloud_name: config.cloudinary.cloudName,
                api_key: config.cloudinary.apiKey,
                api_secret: config.cloudinary.apiSecret,
                secure: true
            });

            this.isConfigured = true;
            logger.info('Cloudinary service initialized successfully');
        } else {
            logger.warn('Cloudinary not configured - file uploads will be limited');
        }
    }

    /**
     * Upload file to Cloudinary
     * @param {String} filePath
     * @param {Object} options
     * @returns {String} URL
     */
    async uploadFile(filePath, options = {}) {
        if (!this.isConfigured) {
            throw new Error('Cloudinary is not configured. Please set CLOUDINARY environment variables.');
        }

        try {
            const defaultOptions = {
                resource_type: 'auto',
                folder: 'vapi-uploads',
                public_id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                overwrite: true,
                quality: 'auto',
                format: 'auto'
            };

            const uploadOptions = { ...defaultOptions, ...options };

            const result = await cloudinary.uploader.upload(filePath, uploadOptions);

            logger.info(`File uploaded to Cloudinary: ${result.public_id}`);

            return {
                url: result.secure_url,
                publicId: result.public_id,
                format: result.format,
                size: result.bytes,
                duration: result.duration,
                width: result.width,
                height: result.height
            };
        } catch (error) {
            logger.error('Cloudinary upload failed:', error);
            throw new Error(`File upload failed: ${error.message}`);
        }
    }

    /**
     * Upload audio buffer directly
     * @param {Buffer} audioBuffer
     * @param {Object} options
     * @returns {Object}
     */
    async uploadAudio(audioBuffer, options = {}) {
        if (!this.isConfigured) {
            throw new Error('Cloudinary is not configured.');
        }

        return new Promise((resolve, reject) => {
            const uploadOptions = {
                resource_type: 'video', // Audio files are treated as video by Cloudinary
                folder: options.folder || 'vapi-audio',
                public_id: options.public_id || `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                overwrite: true,
                quality: 'auto',
                ...options
            };

            const uploadStream = cloudinary.uploader.upload_stream(
                uploadOptions,
                (error, result) => {
                    if (error) {
                        logger.error('Cloudinary audio upload failed:', error);
                        reject(new Error(`Audio upload failed: ${error.message}`));
                    } else {
                        logger.info(`Audio uploaded to Cloudinary: ${result.public_id}`);
                        resolve({
                            url: result.secure_url,
                            publicId: result.public_id,
                            format: result.format,
                            size: result.bytes,
                            duration: result.duration
                        });
                    }
                }
            );

            uploadStream.end(audioBuffer);
        });
    }

    /**
     * Upload from URL
     * @param {String} url
     * @param {Object} options
     * @returns {Object}
     */
    async uploadFromUrl(url, options = {}) {
        if (!this.isConfigured) {
            throw new Error('Cloudinary is not configured.');
        }

        try {
            const defaultOptions = {
                resource_type: 'auto',
                folder: 'vapi-backups',
                overwrite: true
            };

            const uploadOptions = { ...defaultOptions, ...options };

            const result = await cloudinary.uploader.upload(url, uploadOptions);

            logger.info(`URL uploaded to Cloudinary: ${result.public_id}`);

            return {
                url: result.secure_url,
                publicId: result.public_id,
                format: result.format,
                size: result.bytes,
                duration: result.duration
            };
        } catch (error) {
            logger.error('Cloudinary URL upload failed:', error);
            throw new Error(`URL upload failed: ${error.message}`);
        }
    }

    /**
     * Delete file from Cloudinary
     * @param {String} publicId
     * @param {String} resourceType
     * @returns {Boolean}
     */
    async deleteFile(publicId, resourceType = 'auto') {
        if (!this.isConfigured) {
            logger.warn('Cloudinary not configured - cannot delete file');
            return false;
        }

        try {
            const result = await cloudinary.uploader.destroy(publicId, {
                resource_type: resourceType
            });

            if (result.result === 'ok') {
                logger.info(`File deleted from Cloudinary: ${publicId}`);
                return true;
            } else {
                logger.warn(`File may not exist in Cloudinary: ${publicId}`);
                return false;
            }
        } catch (error) {
            logger.error('Cloudinary delete failed:', error);
            throw new Error(`File deletion failed: ${error.message}`);
        }
    }

    /**
     * Get file information
     * @param {String} publicId
     * @param {String} resourceType
     * @returns {Object}
     */
    async getFileInfo(publicId, resourceType = 'auto') {
        if (!this.isConfigured) {
            throw new Error('Cloudinary is not configured.');
        }

        try {
            const result = await cloudinary.api.resource(publicId, {
                resource_type: resourceType
            });

            return {
                url: result.secure_url,
                publicId: result.public_id,
                format: result.format,
                size: result.bytes,
                duration: result.duration,
                width: result.width,
                height: result.height,
                createdAt: result.created_at,
                updatedAt: result.updated_at
            };
        } catch (error) {
            logger.error(`Failed to get file info for ${publicId}:`, error);
            throw new Error(`Failed to get file info: ${error.message}`);
        }
    }

    /**
     * Generate optimized URL for audio playback
     * @param {String} publicId
     * @param {Object} options
     * @returns {String}
     */
    generateOptimizedAudioUrl(publicId, options = {}) {
        if (!this.isConfigured) {
            return null;
        }

        return cloudinary.url(publicId, {
            resource_type: 'video',
            quality: 'auto',
            format: 'auto',
            ...options
        });
    }

    /**
     * Get folder stats
     * @param {String} folder
     * @returns {Object}
     */
    async getFolderStats(folder) {
        if (!this.isConfigured) {
            return null;
        }

        try {
            const result = await cloudinary.api.resources({
                type: 'upload',
                prefix: folder,
                max_results: 500
            });

            const totalSize = result.resources.reduce((sum, resource) => sum + (resource.bytes || 0), 0);

            return {
                fileCount: result.resources.length,
                totalSize: totalSize,
                totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100
            };
        } catch (error) {
            logger.error(`Failed to get folder stats for ${folder}:`, error);
            return null;
        }
    }

    /**
     * Check if service is configured
     * @returns {Boolean}
     */
    isServiceConfigured() {
        return this.isConfigured;
    }

    /**
     * Get service status
     * @returns {Object}
     */
    getStatus() {
        return {
            configured: this.isConfigured,
            cloudName: config.cloudinary.cloudName || null,
            hasApiKey: !!config.cloudinary.apiKey
        };
    }
}

module.exports = CloudinaryService;
