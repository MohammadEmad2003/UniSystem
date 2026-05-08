const db = require('../utilities/database');

db.exec(`
  CREATE TABLE IF NOT EXISTS StudyOutput (
    Output_ID    INTEGER PRIMARY KEY AUTOINCREMENT,
    Class_ID     INTEGER NOT NULL,
    Material_ID  INTEGER NOT NULL,
    User_ID      INTEGER NOT NULL,
    Tool_Type    TEXT    NOT NULL,
    Options_Key  TEXT    NOT NULL,
    Options_JSON TEXT    NOT NULL,
    Content_JSON TEXT    NOT NULL,
    Created_At   DATETIME DEFAULT CURRENT_TIMESTAMP,
    Updated_At   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Class_ID)    REFERENCES Class(Class_ID)     ON DELETE CASCADE,
    FOREIGN KEY (Material_ID) REFERENCES Material(Material_ID) ON DELETE CASCADE,
    FOREIGN KEY (User_ID)     REFERENCES User(User_ID)        ON DELETE CASCADE,
    UNIQUE (Class_ID, Material_ID, User_ID, Tool_Type, Options_Key)
  )
`);

module.exports = db;
