const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const UserDao = require('../dao/UserDao');
const RoleDao = require('../dao/RoleDao');
const responseHandler = require('../helper/responseHandler');
const logger = require('../config/logger');
const { userConstant } = require('../config/constant');
const models = require('../models');

class UserService {
    constructor() {
        this.userDao = new UserDao();
        this.roleDao = new RoleDao();
    }

    /**
     * Create a user
     * @param {Object} userBody
     * @returns {Object}
     */
    createUser = async (userBody) => {
        try {
            let message = 'Successfully Registered the account! Please Verify your email.';
            if (await this.userDao.isEmailExists(userBody.email)) {
                return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Email already taken');
            }

            const uuid = uuidv4();
            userBody.email = userBody.email.toLowerCase();
            userBody.password = bcrypt.hashSync(userBody.password, 8);
            userBody.uuid = uuid;
            userBody.status = userConstant.STATUS_ACTIVE;
            userBody.email_verified = userConstant.EMAIL_VERIFIED_FALSE;

            // Set data access type to 'all' by default if not provided
            if (!userBody.data_access_type) {
                userBody.data_access_type = 'all';
            }

            // Check if role_id is provided and valid
            if (userBody.role_id) {
                const role = await this.roleDao.findById(userBody.role_id);
                if (!role) {
                    return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Invalid role ID');
                }
            }

            try {
                // Start transaction for user and data access levels
                const result = await models.sequelize.transaction(async (transaction) => {
                    // Create the user
                    const userData = await this.userDao.createWithTransaction(userBody, transaction);

                    // If data access levels are provided and type is not 'all', create them
                    if (userBody.data_access_type !== 'all' && userBody.reference_ids && userBody.reference_ids.length > 0) {
                        const accessLevels = userBody.reference_ids.map(refId => ({
                            level_type: userBody.data_access_type,
                            reference_id: refId
                        }));

                        await this.userDao.createDataAccessLevels(userData.id, accessLevels, transaction);
                    }

                    return userData;
                });

                if (!result) {
                    message = 'Registration Failed! Please Try again.';
                    return responseHandler.returnError(httpStatus.BAD_REQUEST, message);
                }

                const userData = result.toJSON();
                delete userData.password;

                return responseHandler.returnSuccess(httpStatus.CREATED, message, userData);
            } catch (error) {
                logger.error(error);
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Failed to create user: ' + (error.message || 'Unknown error')
                );
            }
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Get all users with pagination
     * @param {Object} query - Query parameters for filtering and pagination
     * @returns {Object}
     */
    getUsers = async (query) => {
        try {
            const page = parseInt(query.page) || 1;
            const limit = parseInt(query.limit) || 10;
            const { page: _, limit: __, ...filter } = query;

            const users = await this.userDao.findWithPagination(page, limit, filter);

            const totalPages = Math.ceil(users.count / limit);
            const pagination = {
                total: users.count,
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                has_next_page: page < totalPages,
                has_prev_page: page > 1
            };

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'Users retrieved successfully',
                {
                    content: users.rows,
                    pagination
                }
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Get user by ID
     * @param {String} id - User's UUID
     * @returns {Object}
     */
    getUserById = async (id) => {
        try {
            const user = await this.userDao.findOneByWhereWithHiddenFields({ uuid: id });

            if (!user) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'User not found'
                );
            }

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'User retrieved successfully',
                user
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Update user
     * @param {String} id - User's UUID
     * @param {Object} updateBody - Data to update
     * @returns {Object}
     */
    updateUser = async (id, updateBody) => {
        try {
            const user = await this.userDao.findOneByWhere({ uuid: id });

            if (!user) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'User not found'
                );
            }

            // If trying to update email, check if the new email already exists
            if (updateBody.email && updateBody.email !== user.email) {
                if (await this.userDao.isEmailExists(updateBody.email)) {
                    return responseHandler.returnError(
                        httpStatus.BAD_REQUEST,
                        'Email already taken'
                    );
                }
                updateBody.email = updateBody.email.toLowerCase();
            }

            // If updating password, hash it
            if (updateBody.password) {
                updateBody.password = bcrypt.hashSync(updateBody.password, 8);
            }

            // Check if role_id is provided and valid
            if (updateBody.role_id) {
                const role = await this.roleDao.findById(updateBody.role_id);
                if (!role) {
                    return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Invalid role ID');
                }
            }

            try {
                // Start transaction for user update and data access levels
                await models.sequelize.transaction(async (transaction) => {
                    // Update user data
                    await this.userDao.updateWhere(updateBody, { uuid: id }, transaction);

                    // If data access type is being updated or reference IDs are provided
                    if (updateBody.data_access_type || updateBody.reference_ids) {
                        const dataAccessType = updateBody.data_access_type || user.data_access_type;

                        // Delete existing data access levels
                        await this.userDao.deleteDataAccessLevels(user.id, transaction);

                        // If data access type is not 'all' and reference IDs are provided, create new access levels
                        if (dataAccessType !== 'all' && updateBody.reference_ids && updateBody.reference_ids.length > 0) {
                            const accessLevels = updateBody.reference_ids.map(refId => ({
                                level_type: dataAccessType,
                                reference_id: refId
                            }));

                            await this.userDao.createDataAccessLevels(user.id, accessLevels, transaction);
                        }
                    }
                });

                return responseHandler.returnSuccess(
                    httpStatus.OK,
                    'User updated successfully',
                    {}
                );
            } catch (error) {
                logger.error(error);
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Failed to update user: ' + (error.message || 'Unknown error')
                );
            }
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Delete user
     * @param {String} id - User's UUID
     * @returns {Object}
     */
    deleteUser = async (id) => {
        try {
            const user = await this.userDao.findOneByWhere({ uuid: id });

            if (!user) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'User not found'
                );
            }

            const deleted = await this.userDao.deleteWhere({ uuid: id });

            if (!deleted) {
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Failed to delete user'
                );
            }

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'User deleted successfully',
                {}
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Check if email exists
     * @param {String} email
     * @returns {Object}
     */
    isEmailExists = async (email) => {
        const message = 'Email found!';
        if (!(await this.userDao.isEmailExists(email))) {
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Email not Found!!');
        }
        return responseHandler.returnSuccess(httpStatus.OK, message);
    };

    /**
     * Get user by UUID
     * @param {String} uuid
     * @returns {Object}
     */
    getUserByUuid = async (uuid) => {
        return this.userDao.findOneByWhereWithHiddenFields({ uuid });
    };

    /**
     * Change user password
     * @param {Object} data - Password data containing new_password and confirm_password
     * @param {String} uuid - User's UUID
     * @returns {Object}
     */
    changePassword = async (data, uuid) => {
        try {
            // Get user to verify it exists
            let user = await this.userDao.findOneByWhereWithHiddenFields({ uuid });

            if (!user) {
                return responseHandler.returnError(httpStatus.NOT_FOUND, 'User Not found!');
            }

            if (data.new_password !== data.confirm_password) {
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Confirm password does not match new password',
                );
            }

            const updateUser = await this.userDao.updateWhere(
                { password: bcrypt.hashSync(data.new_password, 8) },
                { uuid },
            );

            if (updateUser) {
                return responseHandler.returnSuccess(
                    httpStatus.OK,
                    'Password updated successfully!',
                    {},
                );
            }

            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Password update failed!');
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };

    /**
     * Change user status
     * @param {String} id - User's UUID
     * @param {Number} status - New status (0=inactive, 1=active)
     * @returns {Object}
     */
    changeStatus = async (id, status) => {
        try {
            const user = await this.userDao.findOneByWhere({ uuid: id });

            if (!user) {
                return responseHandler.returnError(
                    httpStatus.NOT_FOUND,
                    'User not found'
                );
            }

            const updated = await this.userDao.changeStatus(id, status);

            if (!updated) {
                return responseHandler.returnError(
                    httpStatus.BAD_REQUEST,
                    'Failed to update user status'
                );
            }

            return responseHandler.returnSuccess(
                httpStatus.OK,
                'User status updated successfully',
                {}
            );
        } catch (e) {
            logger.error(e);
            return responseHandler.returnError(httpStatus.BAD_REQUEST, 'Something went wrong!');
        }
    };
}

module.exports = UserService;
