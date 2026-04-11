const express = require('express');
const router = express.Router();
const { postAnswer } = require('../controllers/discussionController');
const verifyToken = require('../middleware/verifyToken');

router.use(verifyToken);

router.post('/:questionId/answers', postAnswer);

module.exports = router;