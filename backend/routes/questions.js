const express = require('express');
const router = express.Router();
const { postAnswer } = require('../controllers/discussionController');
const verifyToken = require('../middleware/verifytoken');
const allowedTo = require("../middleware/allowedTo");
const userRoles = require("../utilities/userRoles");

router.use(verifyToken);

router.post('/:questionId/answers', allowedTo(userRoles.STUDENT , userRoles.DOCTOR), postAnswer);

module.exports = router;