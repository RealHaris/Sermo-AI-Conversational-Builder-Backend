const httpStatus = require('http-status');
const CityService = require('../service/CityService');
const logger = require('../config/logger');

class CityController {
  constructor() {
    this.cityService = new CityService();
  }

  createCity = async (req, res) => {
    try {
      const city = await this.cityService.createCity(req.body);
      res.status(city.statusCode).send(city.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  getCities = async (req, res) => {
    try {
      const cities = await this.cityService.getCities(req.query);
      res.status(cities.statusCode).send(cities.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  getCityById = async (req, res) => {
    try {
      const city = await this.cityService.getCityById(req.params.id);
      res.status(city.statusCode).send(city.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  updateCity = async (req, res) => {
    try {
      const city = await this.cityService.updateCity(
        req.params.id,
        req.body
      );
      res.status(city.statusCode).send(city.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  deleteCity = async (req, res) => {
    try {
      const city = await this.cityService.deleteCity(req.params.id);
      res.status(city.statusCode).send(city.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  updateCityPriority = async (req, res) => {
    try {
      const result = await this.cityService.updateCityPriority(
        req.params.id,
        req.body
      );
      res.status(result.statusCode).send(result.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };
}

module.exports = CityController;
