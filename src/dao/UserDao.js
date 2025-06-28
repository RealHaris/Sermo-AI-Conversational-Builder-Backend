const SuperDao = require('./SuperDao');
const models = require('../models');
const { Sequelize } = require('sequelize');

const User = models.user;
const Role = models.role;
const DataAccessLevel = models.data_access_level;

class UserDao extends SuperDao {
    constructor() {
        super(User);
    }

    async findByEmail(email) {
        return User.findOne({
            where: {
                email,
                is_deleted: false
            }
        }).then(user => {
            if (user && user.role && user.role.permissions && typeof user.role.permissions === 'string') {
                user.role.permissions = JSON.parse(user.role.permissions);
            }
            return user;
        });
    }

    async isEmailExists(email) {
        return User.count({
            where: {
                email,
                is_deleted: false
            }
        }).then((count) => {
            if (count != 0) {
                return true;
            }
            return false;
        });
    }

    async createWithTransaction(user, transaction) {
        return User.create(user, { transaction });
    }

    async deleteWhere(where) {
        return this.deleteByWhere(where);
    }

    async findAll(query = {}) {
        const { limit, offset, ...filter } = query;
        return User.findAndCountAll({
            where: {
                ...filter,
                is_deleted: false
            },
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
            attributes: {
                exclude: ['password', 'is_deleted', 'createdAt', 'updatedAt']
            },
            include: [
                {
                    model: Role,
                    as: 'role',
                    attributes: ['id', 'name', 'permissions'],
                    required: false
                },
                {
                    model: DataAccessLevel,
                    as: 'data_access_level',
                    attributes: ['id', 'level_type', 'reference_id'],
                    required: false,
                    where: {
                        is_deleted: false
                    }
                }
            ],
            order: [['createdAt', 'DESC']]
        }).then(result => {
            // Process permissions in each role
            if (result.rows) {
                result.rows.forEach(user => {
                    if (user.role && user.role.permissions && typeof user.role.permissions === 'string') {
                        user.role.permissions = JSON.parse(user.role.permissions);
                    }
                });
            }
            return result;
        });
    }

    async findWithPagination(page = 1, limit = 10, filter = {}) {
        const offset = (page - 1) * limit;

        return User.findAndCountAll({
            where: {
                ...filter,
                is_deleted: false
            },
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            attributes: {
                exclude: ['password', 'is_deleted', 'createdAt', 'updatedAt']
            },
            include: [
                {
                    model: Role,
                    as: 'role',
                    attributes: ['id', 'name', 'permissions'],
                    required: false
                },
                {
                    model: DataAccessLevel,
                    as: 'data_access_level',
                    attributes: ['id', 'level_type', 'reference_id'],
                    required: false,
                    where: {
                        is_deleted: false
                    }
                }
            ],
            order: [['createdAt', 'DESC']]
        }).then(result => {
            // Process permissions in each role
            if (result.rows) {
                result.rows.forEach(user => {
                    if (user.role && user.role.permissions && typeof user.role.permissions === 'string') {
                        user.role.permissions = JSON.parse(user.role.permissions);
                    }
                });
            }
            return result;
        });
    }

    async findOneByWhere(where) {
        return User.findOne({
            where: {
                ...where,
                is_deleted: false
            },
            include: [
                {
                    model: Role,
                    as: 'role',
                    attributes: ['id', 'name', 'permissions'],
                    required: false
                },
                {
                    model: DataAccessLevel,
                    as: 'data_access_level',
                    attributes: ['id', 'level_type', 'reference_id'],
                    required: false,
                    where: {
                        is_deleted: false
                    }
                }
            ]
        }).then(user => {
            if (user && user.role && user.role.permissions && typeof user.role.permissions === 'string') {
                user.role.permissions = JSON.parse(user.role.permissions);
            }
            return user;
        });
    }

    async findOneByWhereWithHiddenFields(where) {
        return User.findOne({
            where: {
                ...where,
                is_deleted: false
            },
            attributes: {
                exclude: ['password', 'is_deleted', 'createdAt', 'updatedAt']
            },
            include: [
                {
                    model: Role,
                    as: 'role',
                    attributes: ['id', 'name', 'permissions'],
                    required: false
                },
                {
                    model: DataAccessLevel,
                    as: 'data_access_level',
                    attributes: ['id', 'level_type', 'reference_id'],
                    required: false,
                    where: {
                        is_deleted: false
                    }
                }
            ]
        }).then(user => {
            if (user && user.role && user.role.permissions && typeof user.role.permissions === 'string') {
                user.role.permissions = JSON.parse(user.role.permissions);
            }
            return user;
        });
    }

    async changeStatus(uuid, status) {
        return this.updateWhere(
            { status },
            { uuid }
        );
    }

    async updateRole(uuid, roleId) {
        return this.updateWhere(
            { role_id: roleId },
            { uuid }
        );
    }

    async updateDataAccessType(uuid, dataAccessType) {
        return this.updateWhere(
            { data_access_type: dataAccessType },
            { uuid }
        );
    }

    async deleteDataAccessLevels(userId, transaction) {
        // Delete entries from the junction table directly
        return models.sequelize.query(
            'DELETE FROM user_data_access_levels WHERE user_id = ?',
            {
                replacements: [userId],
                type: models.sequelize.QueryTypes.DELETE,
                transaction
            }
        );
    }

    async createDataAccessLevels(userId, accessLevels, transaction) {
        // Process each access level and create entries in DataAccessLevel and junction table
        const results = [];

        for (const level of accessLevels) {
            // Find or create data access level within the transaction
            const [dataAccessLevel] = await DataAccessLevel.findOrCreate({
                where: {
                    level_type: level.level_type,
                    reference_id: level.reference_id,
                    is_deleted: false
                },
                defaults: {
                    level_type: level.level_type,
                    reference_id: level.reference_id,
                    is_deleted: false
                },
                transaction
            });

            // Insert into junction table using the same transaction
            await models.sequelize.query(
                'INSERT INTO user_data_access_levels (user_id, data_access_level_id) VALUES (?, ?)',
                {
                    replacements: [userId, dataAccessLevel.id],
                    type: models.sequelize.QueryTypes.INSERT,
                    transaction
                }
            );

            results.push(dataAccessLevel);
        }

        return results;
    }

    // Override findById to ensure permissions is returned as object
    async findById(id) {
        return super.findById(id).then(user => {
            if (user && user.role && user.role.permissions && typeof user.role.permissions === 'string') {
                user.role.permissions = JSON.parse(user.role.permissions);
            }
            return user;
        });
    }
}

module.exports = UserDao;
