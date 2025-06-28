const express = require('express');
const { auth, externalAuth } = require('../middlewares/auth');
const CityController = require('../controllers/CityController');
const CityValidator = require('../validator/CityValidator');
// const { autoDocumentRoutes } = require('../utils/autoSwagger');

const router = express.Router();
const cityController = new CityController();
const cityValidator = new CityValidator();

// External API route (must be before generic routes with parameters)
router.get('/external/all', externalAuth(), cityController.getCities);

// Regular API routes
router.post('/', auth(), cityValidator.createCityValidator, cityController.createCity);
router.get('/', cityController.getCities);
router.get('/:id', cityValidator.validateUUID, cityController.getCityById);
router.patch('/:id', auth(), cityValidator.validateUUID, cityValidator.updateCityValidator, cityController.updateCity);
router.delete('/:id', auth(), cityValidator.validateUUID, cityController.deleteCity);

// Priority update route
router.patch('/:id/priority', auth(), cityValidator.validateUUID, cityValidator.validatePriority, cityController.updateCityPriority);

// module.exports = autoDocumentRoutes(router, 'city', 'Cities'); 

module.exports = router;
