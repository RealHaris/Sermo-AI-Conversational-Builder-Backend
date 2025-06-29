const express = require('express');
const { auth } = require('../middlewares/auth');
const CallController = require('../controllers/CallController');
const CallValidator = require('../validator/CallValidator');

const router = express.Router();
const callController = new CallController();
const callValidator = new CallValidator();

// Get all calls
router.get('/', auth(), callValidator.validateSearchQuery, callController.getCalls);

// Get call by id
router.get('/:id', auth(), callValidator.validateUUID, callController.getCallById);

// Create/start new call
router.post('/', auth(), callValidator.callCreateValidator, callController.createCall);

// Update call
router.put('/:id', auth(), callValidator.validateUUID, callValidator.callUpdateValidator, callController.updateCall);

// End call
router.post('/:id/end', auth(), callValidator.validateUUID, callController.endCall);

// Delete call
router.delete('/:id', auth(), callValidator.validateUUID, callController.deleteCall);

// Get call analytics
router.get('/:id/analytics', auth(), callValidator.validateUUID, callController.getCallAnalytics);

// Get call transcript
router.get('/:id/transcript', auth(), callValidator.validateUUID, callController.getCallTranscript);

// Get call recording
router.get('/:id/recording', auth(), callValidator.validateUUID, callController.getCallRecording);

// Update call status
router.patch('/:id/status', auth(), callValidator.validateUUID, callValidator.statusUpdateValidator, callController.updateCallStatus);

module.exports = router;
