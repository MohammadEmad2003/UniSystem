const db = require('./database');

function buildDuplicateSql(hasClassId) {
  const classClause = hasClassId
    ? `EXISTS (SELECT 1 FROM Class_Notification cn WHERE cn.Notification_ID = n.Notification_ID AND cn.Class_ID = ?)`
    : `NOT EXISTS (SELECT 1 FROM Class_Notification cn WHERE cn.Notification_ID = n.Notification_ID)`;

  return `
    SELECT n.Notification_ID
    FROM Notification n
    INNER JOIN User_Notification un ON un.Notification_ID = n.Notification_ID
    WHERE un.User_ID = ?
      AND n.Type = ?
      AND (n.Reference_ID IS ? OR (n.Reference_ID IS NULL AND ? IS NULL))
      AND (n.Answer_ID IS ? OR (n.Answer_ID IS NULL AND ? IS NULL))
      AND (${classClause})
    LIMIT 1
  `;
}

function insertLinks(notificationId, userId, classId, cb) {
  db.run(
    `INSERT INTO User_Notification (User_ID, Notification_ID, Is_Read) VALUES (?, ?, 0)`,
    [userId, notificationId],
    (err) => {
      if (err) return cb(err);
      if (classId == null || classId === '') return cb(null);
      db.run(
        `INSERT OR IGNORE INTO Class_Notification (Class_ID, Notification_ID) VALUES (?, ?)`,
        [classId, notificationId],
        cb
      );
    }
  );
}

/**
 * One notification row + User_Notification (+ optional Class_Notification).
 * Duplicate: same user + type + ref + answer + class scope → skip.
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
    const hasClass = classId != null && classId !== '';
    const dupSql = buildDuplicateSql(hasClass);
    const dupParams = hasClass
      ? [userId, type, referenceId, referenceId, answerId, answerId, classId]
      : [userId, type, referenceId, referenceId, answerId, answerId];

    db.get(dupSql, dupParams, (err, existing) => {
      if (err) return reject(err);
      if (existing) {
        return resolve({ success: true, skipped: true, notificationId: existing.Notification_ID });
      }

      db.run(
        `INSERT INTO Notification (Type, Title, Message, Reference_ID, Answer_ID)
         VALUES (?, ?, ?, ?, ?)`,
        [type, title, message, referenceId, answerId],
        function (insErr) {
          if (insErr) return reject(insErr);
          const nid = this.lastID;
          insertLinks(nid, userId, hasClass ? classId : null, (linkErr) => {
            if (linkErr) return reject(linkErr);
            resolve({ success: true, notificationId: nid });
          });
        }
      );
    });
  });
};

/**
 * One shared notification for many users + optional class link (e.g. lecture broadcast).
 */
const createBroadcastNotification = ({
  userIds,
  classId = null,
  type,
  title,
  message,
  referenceId = null,
  answerId = null,
}) => {
  return new Promise((resolve, reject) => {
    const ids = [...new Set((userIds || []).map(Number).filter(Boolean))];
    if (!ids.length) {
      return resolve({ success: true, notificationId: null, skipped: true });
    }

    db.run(
      `INSERT INTO Notification (Type, Title, Message, Reference_ID, Answer_ID)
       VALUES (?, ?, ?, ?, ?)`,
      [type, title, message, referenceId, answerId],
      function (err) {
        if (err) return reject(err);
        const nid = this.lastID;

        const stmt = db.prepare(
          `INSERT OR IGNORE INTO User_Notification (User_ID, Notification_ID, Is_Read) VALUES (?, ?, 0)`
        );
        ids.forEach((uid) => stmt.run(uid, nid));
        stmt.finalize((e) => {
          if (e) return reject(e);
          if (classId == null || classId === '') {
            return resolve({ success: true, notificationId: nid });
          }
          db.run(
            `INSERT OR IGNORE INTO Class_Notification (Class_ID, Notification_ID) VALUES (?, ?)`,
            [classId, nid],
            (e2) => {
              if (e2) return reject(e2);
              resolve({ success: true, notificationId: nid });
            }
          );
        });
      }
    );
  });
};

module.exports = createNotification;
module.exports.createBroadcastNotification = createBroadcastNotification;
