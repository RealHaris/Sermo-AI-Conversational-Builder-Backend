const express = require('express');
const CallController = require('../controllers/CallController');
const CallValidator = require('../validator/CallValidator');

const router = express.Router();
const callController = new CallController();
const callValidator = new CallValidator();

// Get all calls
router.get('/', callValidator.validateSearchQuery, callController.getCalls);

// Get call by id
router.get('/:id', callValidator.validateUUID, callController.getCallById);

// Create/start new call
router.post('/', callValidator.callCreateValidator, callController.createCall);

// Update call
router.put('/:id', callValidator.validateUUID, callValidator.callUpdateValidator, callController.updateCall);

// End call
router.post('/:id/end', callValidator.validateUUID, callController.endCall);

// Delete call
router.delete('/:id', callValidator.validateUUID, callController.deleteCall);

// Get call analytics
router.get('/:id/analytics', callValidator.validateUUID, callController.getCallAnalytics);

// Get call transcript
router.get('/:id/transcript', callValidator.validateUUID, callController.getCallTranscript);

// Get call recording
router.get('/:id/recording', callValidator.validateUUID, callController.getCallRecording);

// Update call status
router.patch('/:id/status', callValidator.validateUUID, callValidator.statusUpdateValidator, callController.updateCallStatus);

module.exports = router;
