const { Pool, types } = require('pg');

// Parse PostgreSQL NUMERIC/DECIMAL (OID 1700) as float in JavaScript
types.setTypeParser(1700, (val) => {
  return val === null ? null : parseFloat(val);
});

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.cogfpudmypztqbxgmszn:UniSystem@123@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err.message);
});

// Helper function to execute queries
const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
