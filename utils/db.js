import pg from 'pg';
import 'dotenv/config';
const { Pool } = pg;
const isProd = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DB_URL,
  max: 10,
  ssl: isProd ? { rejectUnauthorized: false } : false,
  idleTimeoutMillis: 30000,
});

export default pool;
