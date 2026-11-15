import 'dotenv/config';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required. Add it to the .env file.');
}

try {
  const parsedUrl = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol)) {
    throw new Error();
  }
} catch {
  throw new Error('DATABASE_URL must be a valid PostgreSQL URL.');
}

export const pool = new Pool({ connectionString });
