const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');
const { generateSwaggerSchemas } = require('../utils/validatorToSwagger');

// Load all schemas from validators
const validatorSchemas = generateSwaggerSchemas();

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Telenor E-Ocean Portal API',
    version: '1.0.0',
    description: 'API documentation for Telenor E-Ocean Portal',
    license: {
      name: 'Licensed Under MIT',
      url: 'https://spdx.org/licenses/MIT.html',
    },
    contact: {
      name: 'Telenor',
      url: 'https://www.telenor.com',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{
    bearerAuth: [],
  }],
  // Add paths from validator schemas
  paths: validatorSchemas
};

// Get all YAML files from docs directory for additional documentation
const docsDir = path.join(__dirname, '../docs');
const yamlFiles = fs.existsSync(docsDir)
  ? fs.readdirSync(docsDir).filter(file => file.endsWith('.yaml'))
  : [];

// Merge YAML docs into swagger definition
if (yamlFiles.length > 0) {
  yamlFiles.forEach(file => {
    try {
      // Include YAML files in the API docs
      const yamlPath = path.join(docsDir, file);
      // No action needed here, the swagger-jsdoc will load them through the apis option
    } catch (error) {
      console.error(`Error processing YAML file ${file}:`, error);
    }
  });
}

const options = {
  swaggerDefinition,
  // Path to the API docs
  apis: [
    './src/route/*.js',
    './src/models/*.js',
    './src/docs/*.yaml'
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec; 
