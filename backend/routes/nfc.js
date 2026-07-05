const express = require('express');
const router = express.Router();
const nfcController = require('../controllers/nfcController');

// NFC Authentication and Verification Routes
router.post('/auth-challenge', nfcController.authChallenge);
router.post('/verify-response', nfcController.verifyResponse);
router.post('/log-event', nfcController.logEvent);
router.get('/student/:id', nfcController.getStudent);
router.post('/register-device', nfcController.registerDevice);
router.post('/direct-attendance', nfcController.directAttendance);
router.get('/my-tag', nfcController.getMyTag);

module.exports = router;
