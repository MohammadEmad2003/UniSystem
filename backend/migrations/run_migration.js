const fs = require('fs');
const path = require('path');
const { query } = require('../utilities/database');

async function runMigration() {
  try {
    console.log('🔄 Running NFC events table migration...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'create_nfc_events_table.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📄 SQL file loaded');
    
    // Split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`📝 Found ${statements.length} SQL statements`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await query(statement);
        console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
      } catch (error) {
        // Some statements might fail if they already exist (e.g., CREATE TABLE IF NOT EXISTS)
        // That's okay for idempotent migrations
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1}/${statements.length} skipped (already exists)`);
        } else {
          console.error(`❌ Statement ${i + 1}/${statements.length} failed:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 NFC events table is now ready');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();
