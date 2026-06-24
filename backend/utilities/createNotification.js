const { query } = require('./database');

function buildDuplicateSql(hasClassId) {
  const classClause = hasClassId
    ? `EXISTS (SELECT 1 FROM Class_Notification cn WHERE cn.notification_id = n.notification_id AND cn.class_id = $7)`
    : `NOT EXISTS (SELECT 1 FROM Class_Notification cn WHERE cn.notification_id = n.notification_id)`;

  return `
    SELECT n.notification_id
    FROM Notification n
    INNER JOIN User_Notification un ON un.notification_id = n.notification_id
    WHERE un.user_id = $1
      AND n.type = $2
      AND (n.reference_id = $3 OR (n.reference_id IS NULL AND $4 IS NULL))
      AND (n.answer_id = $5 OR (n.answer_id IS NULL AND $6 IS NULL))
      AND (${classClause})
    LIMIT 1
  `;
}

async function insertLinks(notificationId, userId, classId) {
  await query(
    `INSERT INTO User_Notification (user_id, notification_id, is_read) VALUES ($1, $2, FALSE) ON CONFLICT DO NOTHING`,
    [userId, notificationId]
  );
  if (classId != null && classId !== '') {
    await query(
      `INSERT INTO Class_Notification (class_id, notification_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [classId, notificationId]
    );
  }
}

/**
 * One notification row + User_Notification (+ optional Class_Notification).
 * Duplicate: same user + type + ref + answer + class scope → skip.
 */
const createNotification = async ({
  userId,
  type,
  title,
  message,
  classId = null,
  referenceId = null,
  answerId = null,
}) => {
  try {
    const hasClass = classId != null && classId !== '';
    const dupSql = buildDuplicateSql(hasClass);
    const dupParams = hasClass
      ? [userId, type, referenceId, referenceId, answerId, answerId, classId]
      : [userId, type, referenceId, referenceId, answerId, answerId];

    const existingResult = await query(dupSql, dupParams);
    const existing = existingResult.rows[0];
    if (existing) {
      return { success: true, skipped: true, notificationId: existing.notification_id };
    }

    const insResult = await query(
      `INSERT INTO Notification (type, title, message, reference_id, answer_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING notification_id`,
      [type, title, message, referenceId, answerId]
    );
    const nid = insResult.rows[0].notification_id;

    await insertLinks(nid, userId, hasClass ? classId : null);
    return { success: true, notificationId: nid };
  } catch (err) {
    console.error("Error creating notification:", err);
    throw err;
  }
};

/**
 * One shared notification for many users + optional class link (e.g. lecture broadcast).
 */
const createBroadcastNotification = async ({
  userIds,
  classId = null,
  type,
  title,
  message,
  referenceId = null,
  answerId = null,
}) => {
  try {
    const ids = [...new Set((userIds || []).map(Number).filter(Boolean))];
    if (!ids.length) {
      return { success: true, notificationId: null, skipped: true };
    }

    const insResult = await query(
      `INSERT INTO Notification (type, title, message, reference_id, answer_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING notification_id`,
      [type, title, message, referenceId, answerId]
    );
    const nid = insResult.rows[0].notification_id;

    for (const uid of ids) {
      await query(
        `INSERT INTO User_Notification (user_id, notification_id, is_read) VALUES ($1, $2, FALSE) ON CONFLICT DO NOTHING`,
        [uid, nid]
      );
    }

    if (classId != null && classId !== '') {
      await query(
        `INSERT INTO Class_Notification (class_id, notification_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [classId, nid]
      );
    }

    return { success: true, notificationId: nid };
  } catch (err) {
    console.error("Error creating broadcast notification:", err);
    throw err;
  }
};

module.exports = createNotification;
module.exports.createBroadcastNotification = createBroadcastNotification;
