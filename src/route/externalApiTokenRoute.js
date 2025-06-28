const express = require('express');
const { auth } = require('../middlewares/auth');
const ExternalApiTokenController = require('../controllers/ExternalApiTokenController');
const ExternalApiTokenValidator = require('../validator/ExternalApiTokenValidator');

const router = express.Router();
const externalApiTokenController = new ExternalApiTokenController();
const externalApiTokenValidator = new ExternalApiTokenValidator();

// Routes for managing external API tokens - require normal authentication
router.post(
  '/',
  auth(),
  (req, res, next) => externalApiTokenValidator.generateTokenValidator(req, res, next),
  externalApiTokenController.generateToken
);

router.get(
  '/',
  auth(),
  externalApiTokenController.getTokens
);

router.delete(
  '/:tokenId',
  auth(),
  (req, res, next) => externalApiTokenValidator.revokeTokenValidator(req, res, next),
  externalApiTokenController.revokeToken
);

module.exports = router; 
