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
            });
        }
    });
});
module.exports = db;
