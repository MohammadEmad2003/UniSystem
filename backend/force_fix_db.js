const sqlite3 = require('@journeyapps/sqlcipher').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Starting migration script...");
    db.run("PRAGMA key='123456'");
    db.run("PRAGMA busy_timeout=30000");

    db.run("ALTER TABLE Academic_Level_Fees RENAME TO Academic_Level_Fees_Old", (err) => {
        if (err) {
            console.log("Note: Old table might not exist or already renamed:", err.message);
        }

        db.run(`
            CREATE TABLE Academic_Level_Fees (
                Academic_Level INTEGER,
                Semester VARCHAR(20),
                Total_Fees DECIMAL(10, 2) DEFAULT 0,
                Max_Hours INTEGER DEFAULT 18,
                Min_Hours INTEGER DEFAULT 12,
                Hour_Price DECIMAL(10, 2) DEFAULT 0,
                PRIMARY KEY (Academic_Level, Semester)
            )
        `, (err) => {
            if (err) {
                console.error("❌ Error creating new table:", err.message);
                return;
            }
            console.log("✅ Success: New Academic_Level_Fees table created with composite PK.");

            // 3. Try to migrate data from old table
            // We'll map existing rows to 'Fall' semester if they don't have one
            db.run(`
                INSERT INTO Academic_Level_Fees (Academic_Level, Semester, Total_Fees, Max_Hours, Min_Hours, Hour_Price)
                SELECT Academic_Level, COALESCE(Semester, 'Fall'), Total_Fees, Max_Hours, Min_Hours, Hour_Price
                FROM Academic_Level_Fees_Old
            `, (err) => {
                if (err) {
                    console.log("Note: Data migration failed or no data to migrate:", err.message);
                } else {
                    console.log("✅ Success: Data migrated to new table.");
                }

                // 4. Drop the old table
                db.run("DROP TABLE Academic_Level_Fees_Old", (err) => {
                    if (err) console.log("Note: Failed to drop old table:", err.message);
                    else console.log("✅ Success: Old table dropped.");
                    
                    console.log("Migration finished.");
                    db.close();
                });
            });
        });
    });
});
