const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {            // Define default permissions
            const defaultPermissions = {
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
            };

            // Step 1: Check if Super Admin role exists
            const existingRoles = await queryInterface.sequelize.query(
                "SELECT * FROM `role` WHERE name = 'Super Admin' AND is_deleted = false",
                { type: Sequelize.QueryTypes.SELECT }
            );

            let roleId;

            if (existingRoles.length === 0) {
                // Create Super Admin role if it doesn't exist
                console.log('Creating Super Admin role...');
                const roleInsert = await queryInterface.bulkInsert('role', [{
                    name: 'Super Admin',
                    permissions: JSON.stringify(defaultPermissions),
                    is_deleted: false,
                    created_at: new Date(),
                    updated_at: new Date()
                }], { returning: true });

                // Different databases handle returning differently
                if (Array.isArray(roleInsert)) {
                    roleId = roleInsert[0].id;
                } else {
                    const newRole = await queryInterface.sequelize.query(
                        "SELECT id FROM `role` WHERE name = 'Super Admin' AND is_deleted = false ORDER BY id DESC LIMIT 1",
                        { type: Sequelize.QueryTypes.SELECT }
                    );
                    roleId = newRole[0].id;
                }
            } else {
                console.log('Super Admin role already exists.');
                roleId = existingRoles[0].id;
            }

            // Step 2: Check if Admin user exists
            const existingUsers = await queryInterface.sequelize.query(
                "SELECT * FROM `user` WHERE email = 'admin@eocean.com' AND is_deleted = false",
                { type: Sequelize.QueryTypes.SELECT }
            );

            if (existingUsers.length === 0) {
                // Create Admin user if it doesn't exist
                console.log('Creating Admin user...');
                await queryInterface.bulkInsert('user', [{
                    full_name: 'Admin',
                    email: 'admin@eocean.com',
                    uuid: uuidv4(),
                    status: 1,
                    email_verified: 1,
                    password: bcrypt.hashSync('admin123', 8),
                    role_id: roleId,
                    data_access_type: 'all',
                    is_deleted: false,
                    created_at: new Date(),
                    updated_at: new Date()
                }]);
            } else {
                // Check if user has role assigned, if not, update the user with the role
                const user = existingUsers[0];
                if (!user.role_id) {
                    console.log('Updating Admin user with Super Admin role...');
                    await queryInterface.bulkUpdate('user',
                        {
                            role_id: roleId,
                            updated_at: new Date()
                        },
                        {
                            email: 'admin@eocean.com',
                            is_deleted: false
                        }
                    );
                } else if (user.role_id !== roleId) {
                    console.log('Admin user already has a different role assigned.');
                } else {
                    console.log('Admin user already has Super Admin role assigned.');
                }
            }

            console.log('Seeding completed successfully.');
            return Promise.resolve();
        } catch (error) {
            console.error('Error in seeding:', error);
            return Promise.reject(error);
        }
    },

    down: async (queryInterface, Sequelize) => {
        // Don't delete anything in down migration to prevent data loss
        // If needed, you can add specific deletion logic here
        return Promise.resolve();
    }
};
