const fs = require('fs');
const path = require('path');
const { query } = require('../utilities/database');

async function runAllMigrations() {
  try {
    console.log('🔄 Running all NFC migrations...');
    
    // List of migration files
    const migrationFiles = [
      'create_nfc_events_table.sql',
      'create_nfc_challenges_table.sql',
      'create_nfc_devices_table.sql'
    ];
    
    for (const file of migrationFiles) {
      const filePath = path.join(__dirname, file);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Migration file not found: ${file}`);
        continue;
      }
      
      console.log(`📄 Running migration: ${file}`);
      
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Split the SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      // Execute each statement
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        try {
          await query(statement);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⚠️  Statement skipped (already exists)`);
          } else {
            console.error(`❌ Statement failed:`, error.message);
            throw error;
          }
        }
      }
      
      console.log(`✅ Migration completed: ${file}`);
    }
    
    console.log('✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runAllMigrations();
