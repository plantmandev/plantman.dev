import { Pool } from 'pg';

declare global {
  var _pgPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!global._pgPool) {
    const connectionString = process.env.DATABASE_URL;

    const shared = {
      // Neon recommends 1-3 connections per serverless function instance.
      // Higher values exhaust the connection limit when multiple visitors hit the site.
      max:                     parseInt(process.env.DATABASE_MAX_CONNECTIONS || '3'),
      idleTimeoutMillis:       30000,
      // 10 s gives Neon's cold-start enough runway to wake up.
      connectionTimeoutMillis: 10000,
    };

    if (connectionString) {
      const isNeon = connectionString.includes('neon.tech');
      // channel_binding=require is incompatible with rejectUnauthorized:false —
      // strip it so pg can complete the SCRAM handshake over plain SSL.
      const safeUrl = connectionString
        .replace(/[&?]channel_binding=[^&]*/g, '')
        .replace(/\?&/, '?');
      console.log('🔌 DB connecting to:', isNeon ? 'Neon' : 'Custom URL');
      global._pgPool = new Pool({
        connectionString: safeUrl,
        ssl: isNeon ? { rejectUnauthorized: false } : false,
        ...shared,
      });
    } else {
      console.log('🔌 DB connecting to:', process.env.DATABASE_HOST || 'localhost');
      global._pgPool = new Pool({
        host:     process.env.DATABASE_HOST     || 'localhost',
        port:     parseInt(process.env.DATABASE_PORT || '5432'),
        database: process.env.DATABASE_NAME     || 'lepidoptera_data',
        user:     process.env.DATABASE_USER     || 'lepidoptera_demo',
        password: process.env.DATABASE_PASSWORD,
        ...shared,
      });
    }

    global._pgPool.on('error', (err) => {
      console.error('Unexpected DB pool error:', err);
    });
  }

  return global._pgPool;
}

// Errors that are safe to retry — transient connection/network issues.
// Excludes query errors (bad SQL, constraint violations) which should not be retried.
function isRetryable(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err).toLowerCase();
  const code = (err as any)?.code as string | undefined;
  return (
    code === 'ECONNRESET'   ||
    code === 'ECONNREFUSED' ||
    code === 'EPIPE'        ||
    code === 'ETIMEDOUT'    ||
    msg.includes('timeout') ||
    msg.includes('connection') ||
    msg.includes('terminating') ||
    msg.includes('econnreset')
  );
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const pool = getPool();
  const MAX_ATTEMPTS = 3;

  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      const backoffMs = 300 * Math.pow(2, attempt - 1); // 300 ms, 600 ms
      await new Promise(r => setTimeout(r, backoffMs));
      console.warn(`DB retry attempt ${attempt} after error:`, (lastErr as any)?.message);
    }
    try {
      const result = await pool.query(text, params);
      return result.rows;
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err)) throw err;
    }
  }
  throw lastErr;
}

export async function querySingle<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}