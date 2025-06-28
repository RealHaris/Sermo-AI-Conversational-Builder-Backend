const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const config = require('../config/config');
const ApiError = require('../helper/ApiError');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

class CloudinaryService {
  /**
   * Get default upload options based on configuration
   * @param {string} folder - Target folder
   * @param {string} publicId - Optional public ID
   * @returns {Object} Upload options
   */
  _getUploadOptions(folder, publicId = null) {
    return {
      resource_type: 'video', // Cloudinary uses 'video' for audio files
      folder,
      public_id: publicId,
      upload_preset: config.cloudinary.uploadPreset,
      format: config.cloudinary.audio.format,
      quality: config.cloudinary.audio.quality,
      max_duration: config.cloudinary.audio.maxDuration,
      auto_tagging: config.cloudinary.audio.autoTagging,
      notification_url: config.cloudinary.notifications.webhookUrl,
      tags: ['vapi', folder.replace('/', '_')],
      overwrite: true,
      resource_options: {
        audio: {
          codec: 'aac',
          bit_rate: this._getAudioBitrate(config.cloudinary.audio.quality),
        }
      }
    };
  }

  /**
   * Get audio bitrate based on quality setting
   * @param {string} quality - Quality setting
   * @returns {string} Bitrate value
   */
  _getAudioBitrate(quality) {
    const bitrates = {
      eco: '32k',
      low: '64k',
      standard: '128k',
      high: '192k'
    };
    return bitrates[quality] || '128k';
  }

  /**
   * Upload audio buffer to Cloudinary
   * @param {Buffer} audioBuffer - Audio buffer to upload
   * @param {string} folder - Cloudinary folder to store in
   * @param {string} publicId - Optional public ID for the file
   * @returns {Promise<string>} Cloudinary URL
   */
  async uploadAudioBuffer(audioBuffer, folder, publicId = null) {
    try {
      // Create a readable stream from the buffer
      const stream = Readable.from(audioBuffer);

      // Create upload stream with options
      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          this._getUploadOptions(folder, publicId),
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        );

        stream.pipe(uploadStream);
      });

      return await uploadPromise;
    } catch (error) {
      throw new ApiError(`Error uploading to Cloudinary: ${error.message}`, 500);
    }
  }

  /**
   * Upload audio from URL to Cloudinary
   * @param {string} audioUrl - URL of the audio to upload
   * @param {string} folder - Cloudinary folder to store in
   * @param {string} publicId - Optional public ID for the file
   * @returns {Promise<string>} Cloudinary URL
   */
  async uploadAudioFromUrl(audioUrl, folder, publicId = null) {
    try {
      const result = await cloudinary.uploader.upload(
        audioUrl,
        this._getUploadOptions(folder, publicId)
      );

      return result.secure_url;
    } catch (error) {
      throw new ApiError(`Error uploading to Cloudinary: ${error.message}`, 500);
    }
  }

  /**
   * Create a write stream for uploading chunks
   * @param {string} folder - Cloudinary folder to store in
   * @param {string} publicId - Public ID for the file
   * @returns {Promise<WriteStream>} Cloudinary upload stream
   */
  createUploadStream(folder, publicId) {
    return cloudinary.uploader.upload_stream(
      this._getUploadOptions(folder, publicId),
      (error, result) => {
        if (error) {
          console.error('Error uploading stream to Cloudinary:', error);
        } else if (config.cloudinary.notifications.webhookUrl) {
          // Additional success handling if webhook URL is configured
          console.log(`Upload success, notifying webhook: ${result.public_id}`);
        }
      }
    );
  }

  /**
   * Delete a file from Cloudinary
   * @param {string} publicId - Public ID of the file to delete
   * @returns {Promise<void>}
   */
  async deleteFile(publicId) {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: 'video',
        invalidate: true // Invalidate CDN cache
      });
    } catch (error) {
      throw new ApiError(`Error deleting from Cloudinary: ${error.message}`, 500);
    }
  }

  /**
   * Get folder path for specific audio type
   * @param {string} audioType - Type of audio content
   * @returns {string} Folder path
   */
  getFolderPath(audioType) {
    const folders = config.cloudinary.folders;
    switch (audioType) {
      case 'voice_note':
        return folders.voiceNotes;
      case 'call_recording':
        return folders.callRecordings;
      case 'assistant_response':
        return folders.assistantResponses;
      default:
        return 'misc';
    }
  }
}

module.exports = new CloudinaryService(); 
