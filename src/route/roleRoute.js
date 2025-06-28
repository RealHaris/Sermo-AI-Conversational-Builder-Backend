const express = require('express');
const { auth } = require('../middlewares/auth');
const RoleController = require('../controllers/RoleController');
const RoleValidator = require('../validator/RoleValidator');
const UserValidator = require('../validator/UserValidator');

const router = express.Router();
const roleController = new RoleController();
const roleValidator = new RoleValidator();
const userValidator = new UserValidator();

// Create a new role
router.post(
  '/',
  auth(), roleValidator.validateRoleCreate,
  roleController.createRole
);

// Get all roles with pagination
router.get(
  '/',
  auth(),
  roleController.getRoles
);

// Get all roles without pagination
router.get(
  '/all',
  auth(),
  roleController.getAllRoles
);

// Get role by ID
router.get(
  '/:id',
  auth(), roleValidator.validateId,
  roleController.getRoleById
);

// Update role
router.put(
  '/:id',
  auth(), roleValidator.validateId, roleValidator.validateRoleUpdate,
  roleController.updateRole
);

// Update specific permission field in a role
router.patch(
  '/:id/permissions',
  auth(), roleValidator.validateId, roleValidator.validatePermissionUpdate,
  roleController.updatePermissionField
);

// Delete role
router.delete(
  '/:id',
  auth(), roleValidator.validateId,
  roleController.deleteRole
);

// Assign role to user
router.post(
  '/assign/:userId',
  auth(), userValidator.validateUUID, roleValidator.validateRoleAssignment,
  roleController.assignRoleToUser
);

module.exports = router; 
