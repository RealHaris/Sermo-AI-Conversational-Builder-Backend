const { Sequelize } = require('sequelize');
const config = require('../config/database');
const fs = require('fs');
const path = require('path');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Create Sequelize instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    logging: false,
  }
);

// Path to models directory
const modelsDir = path.resolve(__dirname, '..', 'models');

// Convert modelName to a table name 
const getTableName = (modelName) => {
  // Convert to lowercase and handle PascalCase to snake_case
  let tableName = modelName
    // Insert underscore before each uppercase letter and convert to lowercase
    .replace(/([A-Z])/g, '_$1')
    // Remove underscore from the beginning if it exists
    .replace(/^_/, '')
    .toLowerCase();

  return tableName;
};

const clearTableInfoJson = () => {
  const tableInfoPath = path.resolve(__dirname, 'table-info.json');
  if (fs.existsSync(tableInfoPath)) {
    fs.unlinkSync(tableInfoPath);
  }
}

async function checkTables() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database successfully.');

    // Get list of model files
    const modelFiles = fs.readdirSync(modelsDir)
      .filter(file => file !== 'index.js' && file.endsWith('.js'));

    clearTableInfoJson();
    // Track existing and missing tables
    const existingTables = [];
    const missingTables = [];

    // Check each model's table
    for (const file of modelFiles) {
      const modelName = path.basename(file, '.js');
      const tableName = getTableName(modelName); // Using the conversion function

      // Check if table exists
      console.log("Checking table:", dbConfig.database, tableName);

      const [results] = await sequelize.query(
        `SELECT COUNT(*) > 0 AS table_exists 
         FROM information_schema.tables 
         WHERE table_schema = '${dbConfig.database}' 
         AND table_name = '${tableName}'`
      );

      if (results[0].table_exists) {
        console.log(`✅ Table ${tableName} exists - will be altered by migration if needed`);
        existingTables.push(tableName);
      } else {
        console.log(`❌ Table ${tableName} does not exist - will be created by migration`);
        missingTables.push(tableName);
      }
    }

    // Save table info for use by migration script
    fs.writeFileSync(
      path.resolve(__dirname, 'table-info.json'),
      JSON.stringify({ existing: existingTables, missing: missingTables }, null, 2)
    );

    if (existingTables.length > 0) {
      console.log('\nExisting tables:', existingTables.join(', '));
    }
    if (missingTables.length > 0) {
      console.log('Missing tables:', missingTables.join(', '));
    }

    console.log('\nRun "npm run db:migrate" to create missing tables and alter existing ones');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the check
checkTables();
