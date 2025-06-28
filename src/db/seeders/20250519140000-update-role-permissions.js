const logger = require('../../config/logger');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Get all existing roles
      const roles = await queryInterface.sequelize.query(
        "SELECT id, permissions FROM `role` WHERE is_deleted = false",
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      logger.info(`Found ${roles.length} roles to update`);

      // New permissions to add (if they don't exist)
      const newPermissions = {
        "dashboard": false,
        "sim_inventory": true,
        "bundles": false,
        "sim_sale": false,
        "users": false,
        "number_type": false,
        "order_status": false,
        "cities": false,
        "roles": true,
        "status_configuration": true,
        "scheduler_configuration": true,
        "personalization": true,
      };

      // Update the roles one by one
      for (const role of roles) {
        try {
          // Parse current permissions
          let currentPermissions;
          try {
            currentPermissions = JSON.parse(role.permissions);
          } catch (error) {
            logger.error(`Failed to parse permissions for role ID ${role.id}, using empty object`);
            currentPermissions = {};
          }

          // Only add permissions that don't exist in currentPermissions
          const mergedPermissions = {
            ...currentPermissions
          };

          // Add only new permissions that don't exist
          Object.keys(newPermissions).forEach(key => {
            if (!(key in currentPermissions)) {
              mergedPermissions[key] = newPermissions[key];
            }
          });

          // Update the role in the database only if there were changes
          if (JSON.stringify(currentPermissions) !== JSON.stringify(mergedPermissions)) {
            await queryInterface.sequelize.query(
              "UPDATE `role` SET permissions = :permissions, updated_at = :updatedAt WHERE id = :id",
              {
                replacements: {
                  permissions: JSON.stringify(mergedPermissions),
                  updatedAt: new Date(),
                  id: role.id
                },
                type: Sequelize.QueryTypes.UPDATE
              }
            );
            logger.info(`Updated permissions for role ID ${role.id}`);
          } else {
            logger.info(`No new permissions to add for role ID ${role.id}`);
          }
        } catch (error) {
          logger.error(`Error updating role ID ${role.id}:`, error);
        }
      }

      logger.info('Role permissions update completed successfully');
      return Promise.resolve();
    } catch (error) {
      logger.error('Error in role permissions update seeder:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // This down migration is complex because we would need to revert to previous permissions
    // To avoid data loss, we'll keep this as a no-op with just a warning
    logger.warn('Down migration for role permissions update is not implemented to prevent data loss');
    return Promise.resolve();
  }
};
