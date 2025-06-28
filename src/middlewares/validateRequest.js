const httpStatus = require('http-status');

/**
 * Generic request validator middleware for Joi schemas
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {string} property - Request property to validate (body, params, query)
 * @returns {Function} Express middleware function
 */
const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    const options = {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
    };

    const data = req[property];
    const { error, value } = schema.validate(data, options);

    if (error) {
      const errorMessage = error.details
        .map((details) => details.message)
        .join(', ');

      return res.status(httpStatus.BAD_REQUEST).json({
        status: false,
        statusCode: httpStatus.BAD_REQUEST,
        message: errorMessage,
        data: null,
      });
    }

    // Replace request data with validated data
    req[property] = value;
    next();
  };
};

/**
 * Middleware to prepare data access filters based on user's access level
 * @returns {Function} Express middleware
 */
const prepareDataAccessFilters = () => {
  return async (req, res, next) => {
    // If no authenticated user, proceed without filters
    if (!req.user) {
      req.dataAccessFilters = {};
      return next();
    }

    const dataAccessFilters = {};

    // For 'all' access type, no filtering required
    if (req.user.data_access_type === 'all') {
      req.dataAccessFilters = dataAccessFilters;
      return next();
    }

    // For regional or city access, collect the reference IDs
    if (req.user.data_access_level && req.user.data_access_level.length > 0) {
      // Get all reference IDs from data access levels
      if (req.user.data_access_type === 'regional') {
        // Filter to get only region records
        const regionIds = req.user.data_access_level
          .filter(access => access.level_type === 'regional')
          .map(access => access.reference_id);

        if (regionIds.length > 0) {
          dataAccessFilters.regionIds = regionIds;
        }
      } else if (req.user.data_access_type === 'city') {
        // Filter to get only city records
        const cityIds = req.user.data_access_level
          .filter(access => access.level_type === 'city')
          .map(access => access.reference_id);

        if (cityIds.length > 0) {
          dataAccessFilters.cityIds = cityIds;
        }
      }
    }

    // Add filters to request object for use in services
    req.dataAccessFilters = dataAccessFilters;
    next();
  };
};

module.exports = {
  validateRequest,
  prepareDataAccessFilters,
}; 
