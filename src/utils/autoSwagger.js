const express = require('express');
const path = require('path');
const fs = require('fs');
const { generateSwaggerSchemas } = require('./validatorToSwagger');

/**
 * A map of HTTP methods to their common response status codes and descriptions
 */
const defaultResponses = {
  get: {
    '200': { description: 'Successful operation' },
    '404': { description: 'Resource not found' },
    '500': { description: 'Server error' }
  },
  post: {
    '201': { description: 'Created successfully' },
    '400': { description: 'Bad request' },
    '401': { description: 'Unauthorized' },
    '500': { description: 'Server error' }
  },
  put: {
    '200': { description: 'Updated successfully' },
    '400': { description: 'Bad request' },
    '401': { description: 'Unauthorized' },
    '404': { description: 'Resource not found' },
    '500': { description: 'Server error' }
  },
  patch: {
    '200': { description: 'Updated successfully' },
    '400': { description: 'Bad request' },
    '401': { description: 'Unauthorized' },
    '404': { description: 'Resource not found' },
    '500': { description: 'Server error' }
  },
  delete: {
    '204': { description: 'Deleted successfully' },
    '401': { description: 'Unauthorized' },
    '404': { description: 'Resource not found' },
    '500': { description: 'Server error' }
  }
};

/**
 * Extract entity name from route path
 * @param {string} routePath - Route path
 * @returns {string} - Entity name
 */
function extractEntityFromPath(routePath) {
  // Extract the entity name from the path, e.g., '/users' -> 'users'
  const match = routePath.match(/^\/([^\/]+)/);
  return match ? match[1] : '';
}

/**
 * Generate auto-documentation for routes based on validator schemas
 * @param {Object} router - Express router
 * @param {string} entityName - Name of the entity (e.g., 'user', 'city')
 * @param {string} tag - Swagger tag name
 * @returns {Object} - Router with Swagger documentation
 */
function autoDocumentRoutes(router, entityName, tag) {
  const schemas = generateSwaggerSchemas();
  const routerStack = router.stack;

  // Loop through all routes in the router
  for (const layer of routerStack) {
    if (layer.route) {
      const route = layer.route;
      const routePath = route.path;
      const method = Object.keys(route.methods)[0]; // get, post, etc.

      // Generate full path for matching with schemas
      const fullPath = `/${entityName}${routePath}`;

      // Look for matching schema in our generated schemas
      const schemaKey = Object.keys(schemas).find(key => {
        // Convert schema paths like /users/{id} to regex patterns like /users/.*
        const pathPattern = key.replace(/\{[^}]+\}/g, '[^/]+');
        const regexPattern = new RegExp(`^${pathPattern}$`);
        return regexPattern.test(fullPath);
      });

      if (schemaKey && schemas[schemaKey] && schemas[schemaKey][method]) {
        // Found matching schema, apply it to the route
        const schema = schemas[schemaKey][method];

        // Check if route has auth middleware
        const hasAuth = doesRouteHaveAuth(route);

        // Apply auto-documentation to route
        const docString = generateSwaggerDoc(
          routePath,
          method,
          tag,
          capitalizeFirstLetter(entityName),
          schema,
          hasAuth
        );

        // Store documentation on the route object for Swagger to pick up
        route.swaggerDoc = docString;
      }
    }
  }

  return router;
}

/**
 * Check if a route has authentication middleware
 * @param {Object} route - Express route
 * @returns {boolean} - Whether the route has auth
 */
function doesRouteHaveAuth(route) {
  // Check if any middleware function is named "authenticate" or contains "auth"
  return route.stack.some(layer => {
    return layer.name === 'authenticate' ||
      (layer.handle && (
        layer.handle.name === 'authenticate' ||
        layer.handle.name.includes('auth')
      ));
  });
}

/**
 * Generate Swagger documentation for a route
 * @param {string} path - Route path
 * @param {string} method - HTTP method
 * @param {string} tag - Swagger tag
 * @param {string} entityName - Entity name
 * @param {Object} schema - Schema for request body
 * @param {boolean} secured - Whether the route requires authentication
 * @returns {string} - Swagger documentation
 */
function generateSwaggerDoc(path, method, tag, entityName, schema, secured) {
  // Convert path params like :id to Swagger format {id}
  const swaggerPath = path.replace(/:([^\/]+)/g, '{$1}');

  // Build responses based on method
  const responses = { ...defaultResponses[method] };

  // Start building the doc object
  const doc = {
    [swaggerPath]: {
      [method]: {
        summary: generateSummary(method, entityName),
        tags: [tag],
        responses
      }
    }
  };

  // Add security if the route is secured
  if (secured) {
    doc[swaggerPath][method].security = [{ bearerAuth: [] }];
  }

  // Add request body if available
  if (schema && schema.requestBody) {
    doc[swaggerPath][method].requestBody = schema.requestBody;
  }

  // Add parameters for path params
  const pathParams = swaggerPath.match(/\{([^}]+)\}/g);
  if (pathParams) {
    doc[swaggerPath][method].parameters = pathParams.map(param => {
      const paramName = param.replace(/\{|\}/g, '');
      return {
        name: paramName,
        in: 'path',
        required: true,
        schema: {
          type: paramName === 'id' ? 'string' : 'string'
        },
        description: `${capitalizeFirstLetter(paramName)} of the ${entityName.toLowerCase()}`
      };
    });
  }

  return doc;
}

/**
 * Generate summary for a route based on HTTP method and entity
 * @param {string} method - HTTP method
 * @param {string} entityName - Entity name
 * @returns {string} - Summary
 */
function generateSummary(method, entityName) {
  switch (method) {
    case 'get':
      return `Retrieve ${entityName.toLowerCase()} information`;
    case 'post':
      return `Create a new ${entityName.toLowerCase()}`;
    case 'put':
    case 'patch':
      return `Update ${entityName.toLowerCase()} information`;
    case 'delete':
      return `Delete a ${entityName.toLowerCase()}`;
    default:
      return `Operation on ${entityName.toLowerCase()}`;
  }
}

/**
 * Helper function to capitalize first letter of a string
 * @param {string} str - Input string
 * @returns {string} - String with first letter capitalized
 */
function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  autoDocumentRoutes
}; 
