const { query } = require('../utilities/database');
const path = require('path');
const fs = require('fs');

const backendRoot = path.resolve(__dirname, '..');
const exportDir = path.join(backendRoot, 'data-export');

// Tables to import (in dependency order)
const tables = [
  'Department',
  'Academic_Level_Fees',
  'Courses',
  'User',
  'Student',
  'Doctor',
  'Admin',
  'Room',
  'Class',
  'Lecture',
  'Material',
  'Enrollment',
  'Grades',
  'Attendance',
  'Questions',
  'Answers',
  'Notification',
  'User_Notification',
  'Class_Notification',
  'Course_Prerequisites',
  'Offers',
  'Work_In',
  'StudyOutput'
];

const importTable = async (tableName) => {
  try {
    const filePath = path.join(exportDir, `${tableName}.json`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${tableName}.json not found, skipping`);
      return;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (data.length === 0) {
      console.log(`⚠️  ${tableName} has no data, skipping`);
      return;
    }

    console.log(`Importing ${tableName}: ${data.length} rows`);

    // Get column names from first row and convert to lowercase for PostgreSQL
    const columns = Object.keys(data[0]);
    const lowercaseColumns = columns.map(col => {
      // Map specific column names
      if (col === 'User_ID') return 'user_id';
      if (col === 'Lec_ID') return 'lec_id';
      if (col === 'Dept_ID') return 'dept_id';
      if (col === 'Class_ID') return 'class_id';
      if (col === 'Course_Code') return 'course_code';
      if (col === 'Material_ID') return 'material_id';
      if (col === 'Questions_ID') return 'questions_id';
      if (col === 'Answer_ID') return 'answer_id';
      if (col === 'Notification_ID') return 'notification_id';
      if (col === 'Enrollment_ID') return 'enrollment_id';
      if (col === 'Grade_ID') return 'grade_id';
      if (col === 'Attendance_ID') return 'attendance_id';
      if (col === 'Room_ID') return 'room_id';
      if (col === 'Doctor_ID') return 'doctor_id';
      if (col === 'Admin_ID') return 'admin_id';
      if (col === 'Student_ID') return 'student_id';
      if (col === 'Academic_Level') return 'academic_level';
      if (col === 'Semester') return 'semester';
      if (col === 'F_Name') return 'f_name';
      if (col === 'L_Name') return 'l_name';
      if (col === 'Email') return 'email';
      if (col === 'Password') return 'password';
      if (col === 'Role') return 'role';
      if (col === 'Document') return 'document';
      if (col === 'Image_Url') return 'image_url';
      if (col === 'Account_Status') return 'account_status';
      if (col === 'NFC_Tag_ID') return 'nfc_tag_id';
      if (col === 'SSN') return 'ssn';
      if (col === 'Total_Hours') return 'total_hours';
      if (col === 'Total_GPA') return 'total_gpa';
      if (col === 'Payment_Status') return 'payment_status';
      if (col === 'Paid_Amount') return 'paid_amount';
      if (col === 'Dept_Name') return 'dept_name';
      if (col === 'Total_Fees') return 'total_fees';
      if (col === 'Hour_Price') return 'hour_price';
      if (col === 'Max_Hours') return 'max_hours';
      if (col === 'Min_Hours') return 'min_hours';
      if (col === 'Credit_Hours') return 'credit_hours';
      if (col === 'Room_Name') return 'room_name';
      if (col === 'Capacity') return 'capacity';
      if (col === 'Location') return 'location';
      if (col === 'Level') return 'level';
      if (col === 'Title') return 'title';
      if (col === 'Date') return 'date';
      if (col === 'Day') return 'day';
      if (col === 'Time') return 'time';
      if (col === 'End_Time') return 'end_time';
      if (col === 'Start_Time') return 'start_time';
      if (col === 'Type') return 'type';
      if (col === 'Status') return 'status';
      if (col === 'Topic') return 'topic';
      if (col === 'Meeting_Link') return 'meeting_link';
      if (col === 'Attendance_Code') return 'attendance_code';
      if (col === 'Name') return 'name';
      if (col === 'File_Path') return 'file_path';
      if (col === 'Upload_Date') return 'upload_date';
      if (col === 'URL') return 'url';
      if (col === 'Summarize') return 'summarize';
      if (col === 'Uploaded_At') return 'uploaded_at';
      if (col === 'Enrollment_Date') return 'enrollment_date';
      if (col === 'Generate_At') return 'generate_at';
      if (col === 'Attendance') return 'attendance';
      if (col === 'Practical') return 'practical';
      if (col === 'Project') return 'project';
      if (col === 'Midterm') return 'midterm';
      if (col === 'Final') return 'final';
      if (col === 'GPA') return 'gpa';
      if (col === 'Max_Attendance') return 'max_attendance';
      if (col === 'Max_Practical') return 'max_practical';
      if (col === 'Max_Midterm') return 'max_midterm';
      if (col === 'Max_Final') return 'max_final';
      if (col === 'Max_Project') return 'max_project';
      if (col === 'Early_Check') return 'early_check';
      if (col === 'Late_Check') return 'late_check';
      if (col === 'Method') return 'method';
      if (col === 'Text') return 'text';
      if (col === 'Content') return 'content';
      if (col === 'Message') return 'message';
      if (col === 'Reference_ID') return 'reference_id';
      if (col === 'Answer_ID') return 'answer_id';
      if (col === 'Created_At') return 'created_at';
      if (col === 'Is_Read') return 'is_read';
      if (col === 'Prerequisite_Code') return 'prerequisite_code';
      if (col === 'Prereq_Course_Code') return 'prereq_course_code';
      if (col === 'Tool_Type') return 'tool_type';
      if (col === 'Options_Key') return 'options_key';
      if (col === 'Options_JSON') return 'options_json';
      if (col === 'Content_JSON') return 'content_json';
      if (col === 'Updated_At') return 'updated_at';
      if (col === 'Specialization') return 'specialization';
      if (col === 'Permission') return 'permission';
      if (col === 'Permissions_Level') return 'permissions_level';
      if (col === 'Total_Hours_Required') return 'total_hours_required';
      return col.toLowerCase();
    });
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    
    // Quote table name if it's a reserved keyword
    const quotedTableName = tableName === 'User' ? '"User"' : tableName.toLowerCase();
    
    let imported = 0;
    let skipped = 0;

    // Disable foreign key constraints temporarily
    await query('SET session_replication_role = replica');

    for (const row of data) {
      try {
        const values = columns.map(col => row[col]);
        
        // Handle NULL values and safe date parsing
        const processedValues = values.map((v, index) => {
          if (v === null || v === undefined || v === '') return null;
          
          const colName = lowercaseColumns[index];
          const isDateCol = colName.endsWith('_expires') || 
                            colName.endsWith('_at') || 
                            colName.endsWith('_date') || 
                            colName.endsWith('_time') || 
                            colName === 'date' || 
                            colName === 'time';
                            
          if (isDateCol) {
            const num = Number(v);
            if (!isNaN(num) && num > 100000000000) {
              return new Date(num);
            }
          }

          // Convert SQLite 1/0 to true/false for PostgreSQL BOOLEAN columns
          if (colName.startsWith('is_')) {
            return v === 1 || v === '1' || v === true || v === 'true';
          }

          return v;
        });

        await query(
          `INSERT INTO ${quotedTableName} (${lowercaseColumns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          processedValues
        );
        imported++;
      } catch (err) {
        if (err.code === '23505') { // Unique violation
          skipped++;
        } else {
          console.error(`Error importing row to ${tableName}:`, err.message);
        }
      }
    }

    // Re-enable foreign key constraints
    await query('SET session_replication_role = DEFAULT');

    console.log(`✅ ${tableName}: ${imported} imported, ${skipped} skipped`);
  } catch (err) {
    console.error(`Error importing ${tableName}:`, err.message);
  }
};

const resetSequences = async () => {
  console.log('\nResetting PostgreSQL identity sequences...');
  const identityTables = [
    { table: 'Department', id: 'dept_id' },
    { table: 'User', id: 'user_id' },
    { table: 'Class', id: 'class_id' },
    { table: 'Lecture', id: 'lec_id' },
    { table: 'Material', id: 'material_id' },
    { table: 'Grades', id: 'grade_id' },
    { table: 'Attendance', id: 'attendance_id' },
    { table: 'Questions', id: 'questions_id' },
    { table: 'Answers', id: 'answer_id' },
    { table: 'Notification', id: 'notification_id' },
    { table: 'StudyOutput', id: 'output_id' }
  ];

  for (const { table, id } of identityTables) {
    try {
      const quotedTable = table === 'User' ? '"User"' : table.toLowerCase();
      await query(`
        SELECT setval(
          pg_get_serial_sequence('${quotedTable}', '${id}'), 
          COALESCE(MAX(${id}), 1)
        ) FROM ${quotedTable}
      `);
      console.log(`✅ Reset sequence for ${table} (${id})`);
    } catch (err) {
      console.warn(`⚠️ Could not reset sequence for ${table}:`, err.message);
    }
  }
};

const importAll = async () => {
  try {
    console.log('Starting data import to PostgreSQL...\n');

    for (const table of tables) {
      await importTable(table);
    }

    await resetSequences();

    console.log('\n✅ All data imported successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during import:', err);
    process.exit(1);
  }
};

importAll();
