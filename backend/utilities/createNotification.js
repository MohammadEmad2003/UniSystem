const db = require('./database');

/**
 * Create a notification for any user
 */
const createNotification = ({
  userId,
  type,
  title,
  message,
  classId = null,
  referenceId = null
}) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO Notification 
       (User_ID, Type, Title, Message, Class_ID, Reference_ID, Is_Read)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,

      [userId, type, title, message, classId, referenceId],

      function (err) {
        if (err) return reject(err);

        resolve({
          success: true,
          notificationId: this.lastID
        });
      }
    );
  });
};

module.exports = createNotification;