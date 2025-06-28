const httpStatus = require('http-status');
const RegionService = require('../service/RegionService');
const logger = require('../config/logger');

class RegionController {
  constructor() {
    this.regionService = new RegionService();
  }

  createRegion = async (req, res) => {
    try {
      const region = await this.regionService.createRegion(req.body);
      res.status(region.statusCode).send(region.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  getRegions = async (req, res) => {
    try {
      const regions = await this.regionService.getRegions(req.query);
      res.status(regions.statusCode).send(regions.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  getRegionsWithCities = async (req, res) => {
    try {
      const regions = await this.regionService.getRegionsWithCities();
      res.status(regions.statusCode).send(regions.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  getRegionById = async (req, res) => {
    try {
      const region = await this.regionService.getRegionById(req.params.id);
      res.status(region.statusCode).send(region.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  updateRegion = async (req, res) => {
    try {
      const region = await this.regionService.updateRegion(
        req.params.id,
        req.body
      );
      res.status(region.statusCode).send(region.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };

  deleteRegion = async (req, res) => {
    try {
      const region = await this.regionService.deleteRegion(req.params.id);
      res.status(region.statusCode).send(region.response);
    } catch (e) {
      logger.error(e);
      res.status(httpStatus.BAD_REQUEST).send(e);
    }
  };
}

module.exports = RegionController; 
