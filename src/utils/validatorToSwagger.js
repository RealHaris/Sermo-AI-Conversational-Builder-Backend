const fs = require('fs');
const path = require('path');

/**
 * Maps Joi types to OpenAPI types
 */
const joiToSwaggerType = {
  string: { type: 'string' },
  number: { type: 'number' },
  boolean: { type: 'boolean' },
  date: { type: 'string', format: 'date-time' },
  object: { type: 'object' },
  array: { type: 'array' },
  alternatives: { oneOf: [] }, // This will be handled separately
  email: { type: 'string', format: 'email' },
  uuid: { type: 'string', format: 'uuid' },
};

/**
 * Extract validation schemas from validator file content
 * @param {string} validatorContent - Content of the validator file
 * @returns {Object} - Extracted schemas
 */
function extractValidationSchemas(validatorContent) {
  const schemas = {};

  // Regular expression to find schema definitions
  const schemaRegex = /const\s+schema\s*=\s*Joi\.object\(\{([\s\S]*?)\}\)/g;
  const methodNameRegex = /async\s+(\w+)\(.*?\)\s*{[\s\S]*?const\s+schema\s*=/g;

  let methodMatch;
  while ((methodMatch = methodNameRegex.exec(validatorContent)) !== null) {
    const methodName = methodMatch[1];

    // Find the schema for this method
    const schemaStart = validatorContent.indexOf('const schema', methodMatch.index);
    if (schemaStart !== -1) {
      const schemaEnd = validatorContent.indexOf('};', schemaStart);
      if (schemaEnd !== -1) {
        const schemaContent = validatorContent.substring(schemaStart, schemaEnd + 2);
        schemas[methodName] = parseJoiSchema(schemaContent);
      }
    }
  }

  return schemas;
}

/**
 * Parse Joi schema string to extract properties
 * @param {string} schemaContent - The Joi schema content
 * @returns {Object} - Parsed schema properties
 */
function parseJoiSchema(schemaContent) {
  const properties = {};
  const required = [];

  // Extract property definitions
  const propRegex = /(\w+):\s*Joi\.([\s\S]*?)(?:,\s*\w+:|$)/g;
  let propMatch;

  while ((propMatch = propRegex.exec(schemaContent)) !== null) {
    const propName = propMatch[1];
    const propDef = propMatch[2];

    const property = {
      type: inferTypeFromJoiDef(propDef)
    };

    // Check if required
    if (propDef.includes('.required()')) {
      required.push(propName);
    }

    // Check if it has a pattern (regex)
    const patternMatch = propDef.match(/\.pattern\(\s*\/(.*?)\/([a-z]*)\s*\)/);
    if (patternMatch) {
      property.pattern = patternMatch[1];
    }

    // Check for min/max constraints
    const minMatch = propDef.match(/\.min\(\s*(\d+)\s*\)/);
    if (minMatch) {
      if (property.type === 'string') {
        property.minLength = parseInt(minMatch[1]);
      } else {
        property.minimum = parseInt(minMatch[1]);
      }
    }

    const maxMatch = propDef.match(/\.max\(\s*(\d+)\s*\)/);
    if (maxMatch) {
      if (property.type === 'string') {
        property.maxLength = parseInt(maxMatch[1]);
      } else {
        property.maximum = parseInt(maxMatch[1]);
      }
    }

    // Check for description from message
    const messageMatch = propDef.match(/\.message\(\s*['"](.+?)['"]\s*\)/);
    if (messageMatch) {
      property.description = messageMatch[1];
    }

    properties[propName] = property;
  }

  return { properties, required };
}

/**
 * Infer OpenAPI type from Joi definition
 * @param {string} joiDef - Joi type definition
 * @returns {string} - OpenAPI type
 */
function inferTypeFromJoiDef(joiDef) {
  if (joiDef.startsWith('string')) return 'string';
  if (joiDef.startsWith('number')) return 'number';
  if (joiDef.startsWith('boolean')) return 'boolean';
  if (joiDef.startsWith('date')) return 'string'; // with format: date-time
  if (joiDef.startsWith('object')) return 'object';
  if (joiDef.startsWith('array')) return 'array';

  // Special formats
  if (joiDef.includes('.email()')) return 'string'; // with format: email
  if (joiDef.includes('.uri()')) return 'string'; // with format: uri
  if (joiDef.includes('.uuid()') || joiDef.match(/\.pattern\(\s*\/\^[0-9a-f]{8}-/)) return 'string'; // with format: uuid

  return 'string'; // Default fallback
}

/**
 * Process all validator files and generate Swagger schemas
 * @returns {Object} - Map of route path to Swagger schema
 */
function generateSwaggerSchemas() {
  const validatorDir = path.join(__dirname, '../validator');
  const validatorFiles = fs.readdirSync(validatorDir)
    .filter(file => file.endsWith('Validator.js'));

  const schemaMap = {};

  validatorFiles.forEach(file => {
    const validatorContent = fs.readFileSync(path.join(validatorDir, file), 'utf8');
    const baseName = file.replace('Validator.js', '').toLowerCase();
    const schemas = extractValidationSchemas(validatorContent);

    // Convert schemas to Swagger format
    for (const [methodName, schema] of Object.entries(schemas)) {
      const routePath = inferRoutePathFromMethodName(methodName, baseName);
      const method = inferMethodFromMethodName(methodName);

      if (!schemaMap[routePath]) {
        schemaMap[routePath] = {};
      }

      schemaMap[routePath][method] = {
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: schema.properties,
                required: schema.required
              }
            }
          }
        }
      };
    }
  });

  return schemaMap;
}

/**
 * Infer route path from validator method name
 * @param {string} methodName - Name of validator method
 * @param {string} baseName - Base name of the entity
 * @returns {string} - Inferred route path
 */
function inferRoutePathFromMethodName(methodName, baseName) {
  if (methodName.startsWith('create')) {
    return `/${baseName}`;
  }
  if (methodName.startsWith('update')) {
    return `/${baseName}/{id}`;
  }
  if (methodName.startsWith('get')) {
    return `/${baseName}/{id}`;
  }
  if (methodName.startsWith('delete')) {
    return `/${baseName}/{id}`;
  }
  return `/${baseName}`;
}

/**
 * Infer HTTP method from validator method name
 * @param {string} methodName - Name of validator method
 * @returns {string} - Inferred HTTP method
 */
function inferMethodFromMethodName(methodName) {
  if (methodName.startsWith('create')) {
    return 'post';
  }
  if (methodName.startsWith('update')) {
    return 'patch';
  }
  if (methodName.startsWith('get')) {
    return 'get';
  }
  if (methodName.startsWith('delete')) {
    return 'delete';
  }
  return 'post'; // Default
}

module.exports = {
  generateSwaggerSchemas,
  extractValidationSchemas
}; 
