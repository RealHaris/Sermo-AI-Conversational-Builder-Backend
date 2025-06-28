const httpStatus = require('http-status');
const BundleService = require('../service/BundleService');
const NumberTypeService = require('../service/NumberTypeService');
const responseHandler = require('../helper/responseHandler');
const logger = require('../config/logger');

class BundleController {
  constructor() {
    this.bundleService = new BundleService();
    this.numberTypeService = new NumberTypeService();
  }

  /**
   * Create a new bundle
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  createBundle = async (req, res) => {
    try {
      const bundle = await this.bundleService.createBundle(req.body);
      res.status(bundle.statusCode).send(bundle.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Create multiple bundles
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  createBulkBundles = async (req, res) => {
    try {
      const bundles = await this.bundleService.createBulkBundles(req.body);
      res.status(bundles.statusCode).send(bundles.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Get all bundles with pagination and filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getBundles = async (req, res) => {
    try {
      const bundles = await this.bundleService.getBundles(req.query);
      res.status(bundles.statusCode).send(bundles.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Get a bundle by UUID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getBundleByUuid = async (req, res) => {
    try {
      const bundle = await this.bundleService.getBundleByUuid(req.params.uuid);
      res.status(bundle.statusCode).send(bundle.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Get bundles by number type (using query parameters)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getBundlesByNumberType = async (req, res) => {
    try {
      const { slug } = req.query;
      if (!slug) {
        return res.status(httpStatus.BAD_REQUEST).json(
          responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'Number type slug is required'
          )
        );
      }

      const bundles = await this.bundleService.getBundlesByNumberTypeSlug(slug, req.query);
      res.status(bundles.statusCode).send(bundles.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Get bundles by category
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getBundlesByCategory = async (req, res) => {
    try {
      const bundles = await this.bundleService.getBundlesByCategory(
        req.params.category,
        req.query
      );
      res.status(bundles.statusCode).send(bundles.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Update bundle categories in bulk
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  updateBundleCategoriesBulk = async (req, res) => {
    try {
      const result = await this.bundleService.updateBundleCategoriesBulk(req.body);
      res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Update a bundle
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  updateBundle = async (req, res) => {
    try {
      const bundle = await this.bundleService.updateBundle(
        req.params.uuid,
        req.body
      );
      res.status(bundle.statusCode).send(bundle.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Change bundle status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  changeBundleStatus = async (req, res) => {
    try {
      const bundle = await this.bundleService.changeBundleStatus(
        req.params.uuid,
        req.body.status
      );
      res.status(bundle.statusCode).send(bundle.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Delete a bundle
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  deleteBundle = async (req, res) => {
    try {
      const bundle = await this.bundleService.deleteBundle(req.params.uuid);
      res.status(bundle.statusCode).send(bundle.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Bulk delete bundles
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  bulkDeleteBundles = async (req, res) => {
    try {
      const result = await this.bundleService.bulkDeleteBundles(req.body);
      res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  /**
   * Get active bundles by number type ID or slug
   * @param {Object} req 
   * @param {Object} res 
   * @returns {Promise<Object>}
   */
  getActiveBundlesByNumberType = async (req, res) => {
    try {
      const { numberTypeId, slug } = req.query;

      if (!numberTypeId && !slug) {
        return res.status(httpStatus.BAD_REQUEST).json(
          responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'Either number type ID or slug is required'
          )
        );
      }

      let actualNumberTypeId = numberTypeId;

      // If slug is provided instead of ID, get the number type ID from the slug
      if (!numberTypeId && slug) {
        const numberType = await this.numberTypeService.findBySlug(slug);
        if (!numberType) {
          return res.status(httpStatus.NOT_FOUND).json(
            responseHandler.returnError(
              httpStatus.NOT_FOUND,
              'Number type not found'
            )
          );
        }
        actualNumberTypeId = numberType.id;
      }

      // Get active bundles for the specified number type
      const bundles = await this.bundleService.getActiveBundlesByNumberType(actualNumberTypeId);

      return res.status(httpStatus.OK).json(
        responseHandler.returnSuccess(
          httpStatus.OK,
          'Active bundles retrieved successfully',
          bundles
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

module.exports = BundleController; 
