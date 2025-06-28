const express = require('express');
const BundleValidator = require('../validator/BundleValidator');
const BundleController = require('../controllers/BundleController');
const { auth, externalAuth } = require('../middlewares/auth');

const router = express.Router();
const bundleController = new BundleController();
const bundleValidator = new BundleValidator();

// External API endpoint - Get active bundles by number type
router.get(
  '/external/active',
  externalAuth(),
  bundleController.getActiveBundlesByNumberType
);

// Create bulk bundles
router.post('/bulk', auth(), bundleValidator.createBulkBundlesValidator, bundleController.createBulkBundles);

// Bulk delete bundles
router.delete('/bulk', auth(), bundleValidator.bulkDeleteBundlesValidator, bundleController.bulkDeleteBundles);

// Get bundles by number type slug (using query parameters)
router.get('/number-type', auth(), bundleValidator.getBundlesByNumberTypeValidator, bundleController.getBundlesByNumberType);

// Change bundle status
router.patch('/:uuid/status', auth(), bundleValidator.changeStatusValidator, bundleController.changeBundleStatus);

// Operations by UUID
router.get('/:uuid', auth(), bundleValidator.getBundleValidator, bundleController.getBundleByUuid);
router.patch('/:uuid', auth(), bundleValidator.updateBundleValidator, bundleController.updateBundle);
router.delete('/:uuid', auth(), bundleValidator.deleteBundleValidator, bundleController.deleteBundle);

// Create and get bundles
router.post('/', auth(), bundleValidator.createBundleValidator, bundleController.createBundle);
router.get('/', auth(), bundleValidator.getBundlesValidator, bundleController.getBundles);

module.exports = router; 
