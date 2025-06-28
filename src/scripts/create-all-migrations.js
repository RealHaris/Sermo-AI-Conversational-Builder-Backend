const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Generate a timestamp for unique migration name
const generateTimestamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

// Load table info if available
let tableInfo = { existing: [], missing: [] };
const tableInfoPath = path.resolve(__dirname, 'table-info.json');
try {
  if (fs.existsSync(tableInfoPath)) {
    tableInfo = JSON.parse(fs.readFileSync(tableInfoPath, 'utf8'));
    console.log('Table information loaded successfully');
  } else {
    console.log('Table info file not found, using default empty values');
  }
} catch (error) {
  console.error('Error loading table information:', error.message);
  // Continue with empty table info
}

// Clean migrations directory first
const migrationsDir = path.resolve(__dirname, '..', 'db', 'migrations');
try {
  if (fs.existsSync(migrationsDir)) {
    fs.readdirSync(migrationsDir).forEach(file => {
      if (file.endsWith('.js')) {
        try {
          fs.unlinkSync(path.join(migrationsDir, file));
          console.log(`Deleted migration file: ${file}`);
        } catch (err) {
          console.error(`Failed to delete migration file ${file}:`, err.message);
        }
      }
    });
    console.log('Migration directory cleaned');
  } else {
    console.log('Migrations directory does not exist, creating it...');
    fs.mkdirSync(migrationsDir, { recursive: true });
  }
} catch (error) {
  console.error('Error cleaning migrations directory:', error.message);
}

// Generate migrations based on table existence
console.log('Generating migration from all models...');

const timestamp = generateTimestamp();
let migrationName = '';

const runMigrationCommand = (name) => {
  try {
    console.log(`Executing migration command with name: ${name}`);
    execSync(`npm run db:makemigrations -- --name ${name}`, {
      stdio: 'inherit',
      timeout: 120000 // 120 second timeout
    });
    return true;
  } catch (error) {
    console.error(`Error running migration command: ${error.message}`);
    if (error.stdout) console.error('Command stdout:', error.stdout.toString());
    if (error.stderr) console.error('Command stderr:', error.stderr.toString());
    return false;
  }
};

try {
  if (tableInfo.missing && tableInfo.missing.length > 0 && tableInfo.existing && tableInfo.existing.length > 0) {
    // Both new tables and existing tables to alter
    migrationName = `${timestamp}-create-and-alter-tables`;
    console.log(`Generating migrations for new tables and altering existing tables: ${migrationName}`);
    if (!runMigrationCommand(migrationName)) {
      throw new Error('Migration command failed');
    }
  } else if (tableInfo.missing && tableInfo.missing.length > 0) {
    // Only new tables to create
    migrationName = `${timestamp}-create-tables`;
    console.log(`Generating migrations for new tables only: ${migrationName}`);
    if (!runMigrationCommand(migrationName)) {
      throw new Error('Migration command failed');
    }
  } else if (tableInfo.existing && tableInfo.existing.length > 0) {
    // Only existing tables to alter
    migrationName = `${timestamp}-alter-tables`;
    console.log(`Generating migrations for altering existing tables: ${migrationName}`);
    if (!runMigrationCommand(migrationName)) {
      throw new Error('Migration command failed');
    }
  } else {
    // No tables to create or alter (or no table info available)
    migrationName = `${timestamp}-initial-migration`;
    console.log(`No table information available or no tables to create or alter. Generating standard migration: ${migrationName}`);
    if (!runMigrationCommand(migrationName)) {
      throw new Error('Migration command failed');
    }
  }

  // Update migration files to include charset and collation
  const updateMigrationFiles = () => {
    if (fs.existsSync(migrationsDir)) {
      let filesUpdated = 0;
      fs.readdirSync(migrationsDir).forEach(file => {
        if (file.endsWith('.js')) {
          const filePath = path.join(migrationsDir, file);
          let content = fs.readFileSync(filePath, 'utf8');
          let originalContent = content;

          // Add charset and collation to createTable commands
          if (content.includes('fn: "createTable"')) {
            // Use a more precise regex pattern to add charset and collation safely
            content = content.replace(
              /("transaction": transaction)([^}]*})/g,
              '$1, "charset": "utf8mb4", "collate": "utf8mb4_general_ci"$2'
            );

            // Check if we need to add the junction table
            if (!content.includes('"user_data_access_levels"')) {
              // Add the junction table creation code at the end of the up function
              const junctionTableCode = `
    // Create junction table for User and DataAccessLevel
    await queryInterface.createTable('user_data_access_levels', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'user',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      data_access_level_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'data_access_level',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      is_deleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    }, {
      transaction: transaction,
      charset: "utf8mb4",
      collate: "utf8mb4_general_ci"
    });

    // Add unique constraint to prevent duplicate associations
    await queryInterface.addConstraint('user_data_access_levels', {
      fields: ['user_id', 'data_access_level_id'],
      type: 'unique',
      name: 'unique_user_data_access_level',
      transaction: transaction
    });`;

              // Insert the junction table code before the closing up function bracket
              content = content.replace(
                /(up: async \(queryInterface, Sequelize\) => \{[\s\S]*?)(\n\s*\}),/,
                `$1${junctionTableCode}$2,`
              );

              // Also add code to drop the junction table in the down function
              const dropJunctionTableCode = `
    // Drop junction table
    await queryInterface.dropTable('user_data_access_levels', { transaction: transaction });`;

              content = content.replace(
                /(down: async \(queryInterface, Sequelize\) => \{[\s\S]*?)(\n\s*\})/,
                `$1${dropJunctionTableCode}$2`
              );
            }

            if (content !== originalContent) {
              fs.writeFileSync(filePath, content, 'utf8');
              filesUpdated++;
              console.log(`Updated migration file with charset and collation: ${file}`);
            }
          }
        }
      });
      console.log(`${filesUpdated} migration files updated with charset and collation settings`);
    }
  };

  try {
    // Apply charset and collation to migration files
    updateMigrationFiles();
    console.log('Migration generated successfully!');
  } catch (error) {
    console.error('Error updating migration files with charset and collation:', error.message);
  }
} catch (error) {
  console.error('Migration generation failed:', error.message);
  process.exit(1);
}
