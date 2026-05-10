const db = require('../utilities/database');

db.exec(`
  CREATE TABLE IF NOT EXISTS User_Notification (
    User_ID INTEGER NOT NULL,
    Notification_ID INTEGER NOT NULL,
    Is_Read BOOLEAN DEFAULT 0,
    PRIMARY KEY (User_ID, Notification_ID),
    FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE,
    FOREIGN KEY (Notification_ID) REFERENCES Notification(Notification_ID) ON DELETE CASCADE
  )
`);

module.exports = db;
