const db = require("../utilities/database");

db.exec(`
  CREATE TABLE IF NOT EXISTS Material (
    Material_ID INTEGER PRIMARY KEY AUTOINCREMENT, 
    Lec_ID INTEGER NOT NULL,
    Name VARCHAR(100) NOT NULL,
    URL VARCHAR(255),
    Document VARCHAR(255),
    Summarize TEXT,
    Type TEXT, 
    Uploaded_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Lec_ID) REFERENCES Lecture(Lec_ID) ON DELETE CASCADE
  )
`);

// Ensure the existing Material table includes the Uploaded_At column.
db.all("PRAGMA table_info(Material)", (err, rows) => {
  if (!err && Array.isArray(rows)) {
    const hasUploadedAt = rows.some((column) => column.name === "Uploaded_At");
    if (!hasUploadedAt) {
      db.run(
        "ALTER TABLE Material ADD COLUMN Uploaded_At DATETIME",
        (alterErr) => {
          if (alterErr) {
            console.error(
              "Failed to migrate Material table:",
              alterErr.message,
            );
            return;
          }

          db.run(
            "UPDATE Material SET Uploaded_At = CURRENT_TIMESTAMP WHERE Uploaded_At IS NULL",
            (updateErr) => {
              if (updateErr) {
                console.error(
                  "Failed to backfill Uploaded_At values:",
                  updateErr.message,
                );
              }
            },
          );
        },
      );
    }
  }
});

module.exports = db;
