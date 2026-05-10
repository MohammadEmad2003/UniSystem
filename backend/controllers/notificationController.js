const genericQueries = require('../utilities/genericQueries');
const httpstatustext = require('../utilities/httpstatustext');
const asyncWrapper = require('../middleware/asyncWrapper');
const db = require('../utilities/database');
const notifQueries = genericQueries('Notification', { primaryKey: 'Notification_ID' });

// GET /notifications
const getNotifications = asyncWrapper(async (req, res) => {
  const userId = req.currentUser.user_id;

  const notifications = await new Promise((resolve, reject) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    db.all(
      `SELECT n.*, un.Is_Read,
        (SELECT cn.Class_ID FROM Class_Notification cn WHERE cn.Notification_ID = n.Notification_ID LIMIT 1) AS Class_ID
       FROM Notification n
       INNER JOIN User_Notification un ON un.Notification_ID = n.Notification_ID
       WHERE un.User_ID = ?
       ORDER BY n.Created_At DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

  res.json({ success: httpstatustext.success, data: notifications });
});

// PUT /notifications/:notificationId/read
const markAsRead = asyncWrapper(async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.currentUser.user_id;

  const link = await new Promise((resolve, reject) => {
    db.get(
      `SELECT 1 AS ok FROM User_Notification WHERE User_ID = ? AND Notification_ID = ?`,
      [userId, notificationId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });

  if (!link) {
    const notif = await notifQueries.getById(notificationId);
    if (!notif) {
      return res.status(404).json({ success: httpstatustext.error, message: { msg: 'Notification not found' } });
    }
    return res.status(403).json({ success: httpstatustext.error, message: { msg: 'Not authorized' } });
  }

  await new Promise((resolve, reject) => {
    db.run(
      `UPDATE User_Notification SET Is_Read = 1 WHERE User_ID = ? AND Notification_ID = ?`,
      [userId, notificationId],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });

  res.json({ success: httpstatustext.success, message: { msg: 'Marked as read' } });
});

// GET /notifications/unread-count
const getUnreadCount = asyncWrapper(async (req, res) => {
  const userId = req.currentUser.user_id;

  const count = await new Promise((resolve, reject) => {
    db.get(
      `SELECT COUNT(*) as count FROM User_Notification WHERE User_ID = ? AND Is_Read = 0`,
      [userId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row.count);
      }
    );
  });

  res.json({ success: httpstatustext.success, data: count });
});

// PUT /notifications/read-all
const markAllAsRead = asyncWrapper(async (req, res) => {
  const userId = req.currentUser.user_id;

  await new Promise((resolve, reject) => {
    db.run(
      `UPDATE User_Notification SET Is_Read = 1 WHERE User_ID = ? AND Is_Read = 0`,
      [userId],
      function (err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });

  res.json({ success: httpstatustext.success, message: { msg: 'All notifications marked as read' } });
});

module.exports = { getNotifications, markAsRead, markAllAsRead, getUnreadCount };
