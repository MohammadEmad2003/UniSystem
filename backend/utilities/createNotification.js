const db = require('./database');

/**
 * Create a notification for any user.
 * Duplicate protection: if a notification with the same user_id + type + class_id +
 * reference_id (question) + answer_id already exists, it is silently skipped.
 */
const createNotification = ({
  userId,
  type,
  title,
  message,
  classId = null,
  referenceId = null,
  answerId = null,
}) => {
  return new Promise((resolve, reject) => {
    // Build duplicate-check query dynamically so NULLs compare correctly
    const dupSql = `
      SELECT Notification_ID FROM Notification
      WHERE User_ID = ?
        AND Type = ?
        AND (Class_ID IS ? OR (Class_ID IS NULL AND ? IS NULL))
        AND (Reference_ID IS ? OR (Reference_ID IS NULL AND ? IS NULL))
        AND (Answer_ID IS ? OR (Answer_ID IS NULL AND ? IS NULL))
      LIMIT 1
    `;
    db.get(
      dupSql,
      [userId, type, classId, classId, referenceId, referenceId, answerId, answerId],
      (err, existing) => {
        if (err) return reject(err);
        if (existing) {
          // Duplicate — skip silently
          return resolve({ success: true, skipped: true, notificationId: existing.Notification_ID });
        }

        db.run(
          `INSERT INTO Notification
           (User_ID, Type, Title, Message, Class_ID, Reference_ID, Answer_ID, Is_Read)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
          [userId, type, title, message, classId, referenceId, answerId],
          function (err) {
            if (err) return reject(err);
            resolve({ success: true, notificationId: this.lastID });
          }
        );
      }
    );
  });
};

module.exports = createNotification;