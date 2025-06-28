const SuperDao = require('./SuperDao');
const models = require('../models');

const Token = models.token;

class TokenDao extends SuperDao {
    constructor() {
        super(Token);
    }

    async findOne(where) {
        return Token.findOne({ where });
    }

    async findAll(where) {
        return Token.findAll({ where });
    }

    async remove(where) {
        return Token.destroy({ where });
    }

    async update(values, where) {
        return Token.update(values, { where });
    }
}

module.exports = TokenDao;
