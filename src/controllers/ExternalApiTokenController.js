const httpStatus = require('http-status');
const TokenService = require('../service/TokenService');
const UserDao = require('../dao/UserDao');
const responseHandler = require('../helper/responseHandler');
const logger = require('../config/logger');

class ExternalApiTokenController {
  constructor() {
    this.tokenService = new TokenService();
    this.userDao = new UserDao();
  }

  /**
   * Generate an external API token
   * @param {Object} req 
   * @param {Object} res 
   * @returns {Promise<Object>}
   */
  generateToken = async (req, res) => {
    try {
      const { duration, description } = req.body;
      const user = req.user;

      // Validate duration if provided
      if (duration && ![30, 60, 90].includes(Number(duration))) {
        return res.status(httpStatus.BAD_REQUEST).json(
          responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'Duration must be 30, 60, 90 days, or null for no expiration'
          )
        );
      }

      const tokenData = await this.tokenService.generateExternalApiToken(
        user,
        duration ? Number(duration) : null,
        description || ''
      );

      return res.status(httpStatus.CREATED).json(
        responseHandler.returnSuccess(
          httpStatus.CREATED,
          'External API token generated successfully',
          tokenData
        )
      );
    } catch (error) {
      logger.error(error);
      return res.status(httpStatus.BAD_GATEWAY).json(
        responseHandler.returnError(httpStatus.BAD_GATEWAY, 'Something went wrong')
      );
    }
  };

  /**
   * Get all external API tokens for the authenticated user
   * @param {Object} req 
   * @param {Object} res 
   * @returns {Promise<Object>}
   */
  getTokens = async (req, res) => {
    try {
      const user = req.user;
      const tokens = await this.tokenService.getExternalApiTokensForUser(user.uuid);

      return res.status(httpStatus.OK).json(
        responseHandler.returnSuccess(
          httpStatus.OK,
          'External API tokens retrieved successfully',
          tokens
        )
      );
    } catch (error) {
      logger.error(error);
      return res.status(httpStatus.BAD_GATEWAY).json(
        responseHandler.returnError(httpStatus.BAD_GATEWAY, 'Something went wrong')
      );
    }
  };

  /**
   * Revoke an external API token
   * @param {Object} req 
   * @param {Object} res 
   * @returns {Promise<Object>}
   */
  revokeToken = async (req, res) => {
    try {
      const { tokenId } = req.params;
      const result = await this.tokenService.revokeExternalApiToken(tokenId);

      if (!result) {
        return res.status(httpStatus.NOT_FOUND).json(
          responseHandler.returnError(httpStatus.NOT_FOUND, 'Token not found')
        );
      }

      return res.status(httpStatus.OK).json(
        responseHandler.returnSuccess(
          httpStatus.OK,
          'External API token revoked successfully',
          null
        )
      );
    } catch (error) {
      logger.error(error);
      return res.status(httpStatus.BAD_GATEWAY).json(
        responseHandler.returnError(httpStatus.BAD_GATEWAY, 'Something went wrong')
      );
    }
  };
}

module.exports = ExternalApiTokenController; 
