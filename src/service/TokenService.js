const jwt = require('jsonwebtoken');
const moment = require('moment');
const { Op } = require('sequelize');
const config = require('../config/config');
const { tokenTypes } = require('../config/tokens');
const TokenDao = require('../dao/TokenDao');
// const RedisService = require('./RedisService');

class TokenService {
    constructor() {
        this.tokenDao = new TokenDao();
        // this.redisService = new RedisService();
    }

    /**
     * Generate token
     * @param {string} uuid
     * @param {Moment} expires
     * @param {string} type
     * @param {string} [secret]
     * @returns {string}
     */

    generateToken = (uuid, expires, type, secret = config.jwt.secret) => {
        const payload = {
            sub: uuid,
            iat: moment().unix(),
            exp: expires.unix(),
            type,
        };
        return jwt.sign(payload, secret);
    };

    verifyToken = async (token, type) => {
        const payload = await jwt.verify(token, config.jwt.secret, (err, decoded) => {
            if (err) {
                throw new Error('Token not found');
            } else {
                // if everything is good, save to request for use in other routes
                return decoded;
            }
        });

        const tokenDoc = await this.tokenDao.findOne({
            token,
            type,
            user_uuid: payload.sub,
            blacklisted: false,
        });
        if (!tokenDoc) {
            throw new Error('Token not found');
        }
        return tokenDoc;
    };

    /**
     * Save a token
     * @param {string} token
     * @param {integer} userId
     * @param {Moment} expires
     * @param {string} type
     * @param {boolean} [blacklisted]
     * @returns {Promise<Token>}
     */
    saveToken = async (token, userId, expires, type, blacklisted = false) => {
        return this.tokenDao.create({
            token,
            user_id: userId,
            expires: expires.toDate(),
            type,
            blacklisted,
        });
    };
    /**
     * Save a multiple token
     * @param {Object} tokens
     * @returns {Promise<Token>}
     */

    saveMultipleTokens = async (tokens) => {
        return this.tokenDao.bulkCreate(tokens);
    };

    removeTokenById = async (id) => {
        return this.tokenDao.remove({ id });
    };

    /**
     * Generate auth tokens
     * @param {{}} user
     * @returns {Promise<Object>}
     */
    generateAuthTokens = async (user) => {
        const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
        const accessToken = await this.generateToken(
            user.uuid,
            accessTokenExpires,
            tokenTypes.ACCESS,
        );
        const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
        const refreshToken = await this.generateToken(
            user.uuid,
            refreshTokenExpires,
            tokenTypes.REFRESH,
        );
        const authTokens = [];
        authTokens.push({
            token: accessToken,
            user_uuid: user.uuid,
            expires: accessTokenExpires.toDate(),
            type: tokenTypes.ACCESS,
            blacklisted: false,
        });
        authTokens.push({
            token: refreshToken,
            user_uuid: user.uuid,
            expires: refreshTokenExpires.toDate(),
            type: tokenTypes.REFRESH,
            blacklisted: false,
        });

        await this.saveMultipleTokens(authTokens);
        const expiredAccessTokenWhere = {
            expires: {
                [Op.lt]: moment(),
            },
            type: tokenTypes.ACCESS,
        };
        await this.tokenDao.remove(expiredAccessTokenWhere);
        const expiredRefreshTokenWhere = {
            expires: {
                [Op.lt]: moment(),
            },
            type: tokenTypes.REFRESH,
        };
        await this.tokenDao.remove(expiredRefreshTokenWhere);
        const tokens = {
            access: {
                token: accessToken,
                expires: accessTokenExpires.toDate(),
            },
            refresh: {
                token: refreshToken,
                expires: refreshTokenExpires.toDate(),
            },
        };
        // await this.redisService.createTokens(user.uuid, tokens);

        return tokens;
    };

    /**
     * Generate long-lived token for external API access
     * @param {{}} user
     * @param {number} duration - Duration in days (30, 60, or null for no expiration)
     * @param {string} description - Optional description for the token
     * @returns {Promise<Object>}
     */
    generateExternalApiToken = async (user, duration = null, description = '') => {
        let externalTokenExpires;

        if (duration) {
            externalTokenExpires = moment().add(duration, 'days');
        } else {
            // If no duration, set a very long expiration (100 years) - effectively no expiration
            externalTokenExpires = moment().add(100, 'years');
        }

        const externalToken = await this.generateToken(
            user.uuid,
            externalTokenExpires,
            tokenTypes.EXTERNAL_API,
        );

        await this.tokenDao.create({
            token: externalToken,
            user_uuid: user.uuid,
            expires: externalTokenExpires.toDate(),
            type: tokenTypes.EXTERNAL_API,
            blacklisted: false,
            duration: duration,
            description: description,
        });

        return {
            token: externalToken,
            expires: duration ? externalTokenExpires.toDate() : null,
            duration: duration,
            description: description
        };
    };

    /**
     * Get all active external API tokens for a user
     * @param {string} userUuid
     * @returns {Promise<Array>}
     */
    getExternalApiTokensForUser = async (userUuid) => {
        const tokens = await this.tokenDao.findAll({
            user_uuid: userUuid,
            type: tokenTypes.EXTERNAL_API,
            blacklisted: false,
            expires: {
                [Op.gt]: moment().toDate()
            }
        });

        return tokens.map(token => ({
            id: token.id,
            expires: token.expires,
            duration: token.duration,
            description: token.description,
            createdAt: token.created_at
        }));
    };

    /**
     * Revoke an external API token
     * @param {string} tokenId
     * @returns {Promise<boolean>}
     */
    revokeExternalApiToken = async (tokenId) => {
        const token = await this.tokenDao.findOne({
            id: tokenId,
            type: tokenTypes.EXTERNAL_API
        });

        if (!token) {
            return false;
        }

        await this.tokenDao.update(
            { blacklisted: true },
            { id: tokenId }
        );

        return true;
    };
}

module.exports = TokenService;
