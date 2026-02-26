import { Pool } from 'pg';

// Use global to persist pool across hot reloads in dev
// and prevent connection exhaustion in serverless environments
declare global {
  var _pgPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!global._pgPool) {
    const connectionString = process.env.DATABASE_URL;

    if (connectionString) {
      console.log('🔌 DB connecting to:', connectionString.includes('neon.tech') ? 'Neon' : 'Custom URL');
      global._pgPool = new Pool({
        connectionString,
        ssl: connectionString.includes('neon.tech')
          ? { rejectUnauthorized: false }
          : false,
        max:                     parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10'),
        idleTimeoutMillis:       30000,
        connectionTimeoutMillis: 5000,
      });
    } else {
      console.log('🔌 DB connecting to:', process.env.DATABASE_HOST || 'localhost');
      global._pgPool = new Pool({
        host:     process.env.DATABASE_HOST     || 'localhost',
        port:     parseInt(process.env.DATABASE_PORT || '5432'),
        database: process.env.DATABASE_NAME     || 'lepidoptera_data',
        user:     process.env.DATABASE_USER     || 'lepidoptera_demo',
        password: process.env.DATABASE_PASSWORD,
        max:      parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10'),
        idleTimeoutMillis:       30000,
        connectionTimeoutMillis: 5000,
      });
    }

    // Log connection errors rather than crashing silently
    global._pgPool.on('error', (err) => {
      console.error('Unexpected DB pool error:', err);
    });
  }

  return global._pgPool;
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows;
}

export async function querySingle<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}