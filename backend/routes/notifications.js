const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, markAllAsRead, getUnreadCount } = require('../controllers/notificationController');
const verifyToken = require('../middleware/verifyToken');

router.use(verifyToken); // كل الـ routes محتاجة login

router.get('/', getNotifications);
router.put('/read-all', markAllAsRead);      // لازم يجي قبل /:notificationId
router.put('/:notificationId/read', markAsRead);
router.get('/unread-count', getUnreadCount);
module.exports = router;