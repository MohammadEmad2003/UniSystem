const db = require('../utilities/database');

db.exec(`
  CREATE TABLE IF NOT EXISTS Class_Notification (
    Class_ID INTEGER NOT NULL,
    Notification_ID INTEGER NOT NULL,
    PRIMARY KEY (Class_ID, Notification_ID),
    FOREIGN KEY (Class_ID) REFERENCES Class(Class_ID) ON DELETE CASCADE,
    FOREIGN KEY (Notification_ID) REFERENCES Notification(Notification_ID) ON DELETE CASCADE
  )
`);

module.exports = db;
