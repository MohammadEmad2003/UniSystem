const sqlite3 = require('@journeyapps/sqlcipher').verbose();
const path = require('path');

const backendRoot = path.resolve(__dirname, '..');
const dbPath = process.env.DATABASE_PATH
    ? path.resolve(backendRoot, process.env.DATABASE_PATH)
    : path.join(backendRoot, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('❌ error:', err.message);

});

db.serialize(() => {
    db.run("PRAGMA key='123456'");
    db.run("PRAGMA cipher_compatibility=4");
    db.run("PRAGMA journal_mode=WAL");
    db.run("PRAGMA busy_timeout=5000");
    db.run("PRAGMA foreign_keys=ON", (err) => {
        if (err) console.error("Error enabling Foreign Keys:", err.message);
        else {
            console.log("Foreign Keys are now ACTIVE.");
            // Startup Migration: Add Semester column if missing
            db.serialize(() => {
                db.run(`ALTER TABLE Academic_Level_Fees ADD COLUMN Semester VARCHAR(20)`, (err) => {
                    if (err) {
                        if (err.message.includes("duplicate column name")) {
                            // Column already exists, all good
                        } else if (err.message.includes("locked")) {
                            console.log("Note: Database busy, skipping migration check.");
                        } else {
                            console.log("Database status:", err.message);
                        }
                    } else {
                        console.log("✅ Migration: Semester column added.");
                    }
                });

                // Add Time column to Questions if missing
                // SQLite ALTER TABLE does not allow non-constant defaults, so add nullable then backfill.
                db.run(`ALTER TABLE Questions ADD COLUMN Time DATETIME`, (err) => {
                    if (err) {
                        if (err.message.includes("duplicate column name")) {
                            // Already migrated — backfill any NULLs left from before migration
                            db.run(`UPDATE Questions SET Time = datetime('now') WHERE Time IS NULL`, (e2) => {
                                if (e2) console.log("Questions.Time backfill error:", e2.message);
                            });
                        } else if (err.message.includes("locked")) {
                            console.log("Note: Database busy, skipping Questions.Time migration.");
                        } else {
                            console.log("Database status (Questions.Time):", err.message);
                        }
                    } else {
                        // Newly added — backfill existing rows
                        db.run(`UPDATE Questions SET Time = datetime('now') WHERE Time IS NULL`, (e2) => {
                            if (e2) console.log("Questions.Time backfill error:", e2.message);
                            else console.log("✅ Migration: Questions.Time column added and backfilled.");
                        });
                    }
                });
            });
        }
    });
});
module.exports = db;
