const logger = require('../config/logger');

class SuperDao {
    constructor(model) {
        this.Model = model;
    }

    async findAll() {
        return this.Model.findAll({
            where: { is_deleted: false }
        })
            .then((result) => {
                return result;
            })
            .catch((e) => {
                logger.error(e);
                console.log(e);
            });
    }

    async findById(id) {
        return this.Model.findOne({
            where: {
                id,
                is_deleted: false
            }
        })
            .then((result) => {
                return result;
            })
            .catch((e) => {
                logger.error(e);
                console.log(e);
            });
    }

    async findOneByWhere(where, attributes = null, order = ['id', 'desc']) {
        const whereCondition = { ...where, is_deleted: false };

        if (attributes == null) {
            return this.Model.findOne({
                where: whereCondition,
                order: [order],
            })
                .then((result) => {
                    return result;
                })
                .catch((e) => {
                    logger.error(e);
                    console.log(e);
                });
        }
        return this.Model.findOne({
            where: whereCondition,
            attributes,
            order: [order],
        })
            .then((result) => {
                return result;
            })
            .catch((e) => {
                logger.error(e);
                console.log(e);
            });
    }

    async updateWhere(data, where) {
        const whereCondition = { ...where, is_deleted: false };
        return this.Model.update(data, { where: whereCondition })
            .then((result) => {
                return result;
            })
            .catch((e) => {
                logger.error(e);
                console.log(e);
            });
    }

    async updateById(data, id) {
        return this.Model.update(data, {
            where: {
                id,
                is_deleted: false
            }
        })
            .then((result) => {
                return result;
            })
            .catch((e) => {
                logger.error(e);
                console.log(e);
            });
    }

    async create(data) {
        try {
            // Set is_deleted to false by default for new records
            const newData = new this.Model({ ...data, is_deleted: false });
            return newData
                .save()
                .then((result) => {
                    return result;
                })
                .catch((e) => {
                    logger.error(e);
                    console.log(e);
                });
        } catch (e) {
            console.log(e);
        }
    }

    async findByWhere(
        where,
        attributes = undefined,
        order = ['id', 'asc'],
        limit = null,
        offset = null,
    ) {
        const whereCondition = { ...where, is_deleted: false };

        if (!attributes) {
            return this.Model.findAll({
                where: whereCondition,
                order: [order],
                limit,
                offset,
            });
        }

        return this.Model.findAll({
            where: whereCondition,
            attributes,
            order: [order],
            limit,
            offset,
        });
    }

    // Modified to perform soft delete instead of hard delete
    async deleteByWhere(where) {
        return this.Model.update(
            {
                is_deleted: true,
                deleted_at: new Date()
            },
            { where }
        );
    }

    // Hard delete if really needed
    async permanentDeleteByWhere(where) {
        return this.Model.destroy({ where });
    }

    async bulkCreate(data) {
        // Set is_deleted to false by default for all records
        const dataWithSoftDelete = data.map(item => ({ ...item, is_deleted: false }));

        return this.Model.bulkCreate(dataWithSoftDelete)
            .then((result) => {
                return result;
            })
            .catch((e) => {
                logger.error(e);
                console.log(e.message);
            });
    }

    async getCountByWhere(where) {
        const whereCondition = { ...where, is_deleted: false };
        return this.Model.count({ where: whereCondition })
            .then((result) => {
                return result;
            })
            .catch((e) => {
                logger.error(e);
                console.log(e);
            });
    }

    async incrementCountInFieldByWhere(fieldName, where, incrementValue = 1) {
        const whereCondition = { ...where, is_deleted: false };
        const instance = await this.Model.findOne({ where: whereCondition });
        if (!instance) {
            return false;
        }
        // eslint-disable-next-line no-return-await
        return await instance.increment(fieldName, { by: incrementValue });
    }

    async decrementCountInFieldByWhere(fieldName, where, decrementValue = 1) {
        const whereCondition = { ...where, is_deleted: false };
        const instance = await this.Model.findOne({ where: whereCondition });
        if (!instance) {
            return false;
        }
        // eslint-disable-next-line no-return-await
        return await instance.decrement(fieldName, { by: decrementValue });
    }

    async updateOrCreate(values, condition) {
        const whereCondition = { ...condition, is_deleted: false };
        return this.Model.findOne({ where: whereCondition }).then((obj) => {
            // update
            if (obj) {
                return obj.update(values);
            }
            // insert
            return this.Model.create({ ...values, is_deleted: false });
        });
    }

    async checkExist(condition) {
        const whereCondition = { ...condition, is_deleted: false };
        return this.Model.count({ where: whereCondition }).then((count) => {
            if (count !== 0) {
                return true;
            }
            return false;
        });
    }

    async getDataTableData(where, limit, offset, order = [['id', 'DESC']]) {
        const whereCondition = { ...where, is_deleted: false };
        return this.Model.findAndCountAll({
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            where: whereCondition,
            order,
        })
            .then((result) => {
                return result;
            })
            .catch((e) => {
                logger.error(e);
                console.log(e);
                return [];
            });
    }

    // Get all records including soft deleted ones
    async findAllWithDeleted() {
        return this.Model.findAll()
            .then((result) => {
                return result;
            })
            .catch((e) => {
                logger.error(e);
                console.log(e);
            });
    }

    // Restore soft deleted records
    async restoreByWhere(where) {
        return this.Model.update(
            {
                is_deleted: false,
                deleted_at: null
            },
            { where: { ...where, is_deleted: true } }
        );
    }
}
module.exports = SuperDao;
