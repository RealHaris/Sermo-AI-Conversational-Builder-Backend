const passport = require('passport');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');
const { userConstant } = require('../config/constant');
const { tokenTypes } = require('../config/tokens');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const TokenDao = require('../dao/TokenDao');
const UserDao = require('../dao/UserDao');

const tokenDao = new TokenDao();
const userDao = new UserDao();

const verifyCallback = (req, res, resolve, reject, allowedTokenTypes) => {
    return async (err, user, info) => {
        if (err || info || !user) {
            return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
        }

        // Check if user is inactive
        if (user.status === userConstant.STATUS_INACTIVE) {
            return reject(new ApiError(httpStatus.FORBIDDEN, 'Account is In Active , Please Contact Admin'));
        }

        // Check token type if allowedTokenTypes is provided
        if (allowedTokenTypes && allowedTokenTypes.length > 0) {
            try {
                const authHeader = req.headers.authorization;
                const token = authHeader && authHeader.split(' ')[1];

                if (!token) {
                    return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
                }

                const payload = jwt.verify(token, config.jwt.secret);

                if (!allowedTokenTypes.includes(payload.type)) {
                    return reject(new ApiError(
                        httpStatus.FORBIDDEN,
                        `This endpoint cannot be accessed with this token type (${payload.type})`
                    ));
                }
            } catch (error) {
                return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token'));
            }
        }

        // Get user with data access information
        const userWithAccess = await userDao.findOneByWhereWithHiddenFields({ uuid: user.uuid });
        if (!userWithAccess) {
            return reject(new ApiError(httpStatus.UNAUTHORIZED, 'User not found'));
        }

        // Add data access information to the request
        req.user = userWithAccess;
        resolve();
    };
};

// Auth middleware for regular API endpoints - only accepts ACCESS tokens
const auth = () => {
    return async (req, res, next) => {
        return new Promise((resolve, reject) => {
            passport.authenticate(
                'jwt',
                { session: false },
                verifyCallback(req, res, resolve, reject, [tokenTypes.ACCESS])
            )(req, res, next);
        })
            .then(() => {
                return next();
            })
            .catch((err) => {
                return next(err);
            });
    };
};

// Auth middleware for external API endpoints - only accepts EXTERNAL_API tokens
const externalAuth = () => {
    return async (req, res, next) => {
        return new Promise((resolve, reject) => {
            passport.authenticate(
                'jwt',
                { session: false },
                verifyCallback(req, res, resolve, reject, [tokenTypes.EXTERNAL_API])
            )(req, res, next);
        })
            .then(() => {
                return next();
            })
            .catch((err) => {
                return next(err);
            });
    };
};

module.exports = {
    auth,
    externalAuth
};
