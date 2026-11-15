import { readFile } from "node:fs/promises";
import { randomBytes, scryptSync } from "node:crypto";
import { pool } from "./db";
import {
  INITIAL_APPOINTMENTS,
  INITIAL_ARTICLES,
  INITIAL_AUDIT_LOGS,
  INITIAL_EMERGENCY_REQUESTS,
  INITIAL_MESSAGES,
  INITIAL_MOOD_JOURNALS,
  INITIAL_NOTIFICATIONS,
  INITIAL_SCREENING_RESULTS,
  INITIAL_SESSIONS,
  INITIAL_SIAKAD_RECORDS,
  INITIAL_SLOTS,
  INITIAL_USERS,
} from "../src/data/initialData";

const schema = await readFile(
  new URL("../database/schema.sql", import.meta.url),
  "utf8",
);

try {
  await pool.query(schema);
  const initialState = {
    currentUser: null,
    users: INITIAL_USERS.map((user) => ({ ...user, password: "" })),
    siakadRecords: INITIAL_SIAKAD_RECORDS,
    slots: INITIAL_SLOTS,
    appointments: INITIAL_APPOINTMENTS,
    sessions: INITIAL_SESSIONS,
    messages: INITIAL_MESSAGES,
    screeningResults: INITIAL_SCREENING_RESULTS,
    emergencyRequests: INITIAL_EMERGENCY_REQUESTS,
    articles: INITIAL_ARTICLES,
    moodJournals: INITIAL_MOOD_JOURNALS,
    notifications: INITIAL_NOTIFICATIONS,
    auditLogs: INITIAL_AUDIT_LOGS,
  };
  const seeded = await pool.query(
    `INSERT INTO healspace_app_state (id, data)
     VALUES (1, $1::jsonb)
     ON CONFLICT (id) DO NOTHING
     RETURNING id`,
    [JSON.stringify(initialState)],
  );

  if (seeded.rowCount) {
    for (const user of INITIAL_USERS) {
      const salt = randomBytes(16);
      const passwordHash = scryptSync(user.password, salt, 64);
      await pool.query(
        "INSERT INTO app_user_credentials (user_id, password_hash) VALUES ($1, $2)",
        [
          user.id,
          `scrypt$${salt.toString("hex")}$${passwordHash.toString("hex")}`,
        ],
      );
    }
  }
  await pool.query(
    `UPDATE healspace_app_state
     SET data = jsonb_set(data, '{siakadRecords}', $1::jsonb), updated_at = now()
     WHERE id = 1`,
    [JSON.stringify(INITIAL_SIAKAD_RECORDS)],
  );
  console.log("Database schema applied successfully.");
} catch (error) {
  console.error("Could not apply the database schema:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
