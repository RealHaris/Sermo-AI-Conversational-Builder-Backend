const express = require('express');
const { auth } = require('../middlewares/auth');
const UserController = require('../controllers/UserController');
const UserValidator = require('../validator/UserValidator');

const router = express.Router();
const userController = new UserController();
const userValidator = new UserValidator();

// Get all users
router.get('/', auth(), userController.getUsers);

// Get user by id
router.get('/:id', auth(), userValidator.validateUUID, userController.getUserById);

// Create new user
router.post('/', auth(), userValidator.userCreateValidator, userController.createUser);

// Update user
router.put('/:id', auth(), userValidator.validateUUID, userValidator.userUpdateValidator, userController.updateUser);

// Delete user
router.delete('/:id', auth(), userValidator.validateUUID, userController.deleteUser);

// Change user status
router.patch('/:id/status', auth(), userValidator.validateUUID, userValidator.changeStatusValidator, userController.changeStatus);

// Change user password
router.patch('/:id/password', auth(), userValidator.validateUUID, userValidator.changePasswordValidator, userController.changePassword);

module.exports = router; 
