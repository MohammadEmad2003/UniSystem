const genericQueries = require('../utilities/genericQueries');
const httpstatustext = require('../utilities/httpstatustext');
const asyncWrapper = require('../middleware/asyncWrapper');
const db = require('../utilities/database');
const notifQueries = genericQueries('Notification', { primaryKey: 'notification_id' });

// GET /notifications
const getNotifications = asyncWrapper(async (req, res) => {
  const userId = req.currentUser.user_id;

  const page = parseInt(req.query.page, 10) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const result = await db.query(
    `SELECT n.*, un.is_read,
      (SELECT cn.class_id FROM Class_Notification cn WHERE cn.notification_id = n.notification_id LIMIT 1) AS class_id
     FROM Notification n
     INNER JOIN User_Notification un ON un.notification_id = n.notification_id
     WHERE un.user_id = $1
     ORDER BY n.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const notifications = result.rows || [];

  res.json({ success: httpstatustext.success, data: notifications });
});

// PUT /notifications/:notificationId/read
const markAsRead = asyncWrapper(async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.currentUser.user_id;

  const link = await db.query(
    `SELECT 1 AS ok FROM User_Notification WHERE user_id = $1 AND notification_id = $2`,
    [userId, notificationId]
  );

  if (!link.rows || link.rows.length === 0) {
    const notif = await notifQueries.getById(notificationId);
    if (!notif) {
      return res.status(404).json({ success: httpstatustext.error, message: { msg: 'Notification not found' } });
    }
    return res.status(403).json({ success: httpstatustext.error, message: { msg: 'Not authorized' } });
  }

  await db.query(
    `UPDATE User_Notification SET is_read = 1 WHERE user_id = $1 AND notification_id = $2`,
    [userId, notificationId]
  );

  res.json({ success: httpstatustext.success, message: { msg: 'Marked as read' } });
});

// GET /notifications/unread-count
const getUnreadCount = asyncWrapper(async (req, res) => {
  const userId = req.currentUser.user_id;

  const result = await db.query(
    `SELECT COUNT(*) as count FROM User_Notification WHERE user_id = $1 AND is_read = 0`,
    [userId]
  );
  const count = result.rows[0].count;

  res.json({ success: httpstatustext.success, data: count });
});

// PUT /notifications/read-all
const markAllAsRead = asyncWrapper(async (req, res) => {
  const userId = req.currentUser.user_id;

  await db.query(
    `UPDATE User_Notification SET is_read = 1 WHERE user_id = $1 AND is_read = 0`,
    [userId]
  );

  res.json({ success: httpstatustext.success, message: { msg: 'All notifications marked as read' } });
});

module.exports = { getNotifications, markAsRead, markAllAsRead, getUnreadCount };
