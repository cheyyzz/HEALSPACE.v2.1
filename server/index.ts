import express, { type NextFunction, type Request, type Response } from 'express';
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import type { PoolClient } from 'pg';
import { pool } from './db';

const app = express();
const port = Number(process.env.PORT ?? 3001);
const scrypt = promisify(scryptCallback);

interface AppState {
  currentUser: Record<string, unknown> | null;
  users: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

interface AuthenticatedRequest extends Request {
  authUser?: Record<string, unknown>;
}

app.use(express.json({ limit: '5mb' }));

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port number.');
}

function hashStatePasswords(state: AppState): AppState {
  const users = state.users.map((user) => ({ ...user, password: '' }));
  return { ...state, users, currentUser: null };
}

function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  return Array.isArray(state.users) && (state.currentUser === null || typeof state.currentUser === 'object');
}

function stateRecords(state: AppState, key: string): Array<Record<string, unknown>> {
  const value = state[key];
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') : [];
}

function mergeFields(
  original: Record<string, unknown>,
  proposed: Record<string, unknown>,
  fields: string[]
): Record<string, unknown> {
  const result = { ...original };
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(proposed, field)) result[field] = proposed[field];
  }
  return result;
}

function clockMinutes(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{2})\.(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour < 24 && minute < 60 ? hour * 60 + minute : null;
}

function mergeScopedArray(
  original: Array<Record<string, unknown>>,
  proposed: Array<Record<string, unknown>>,
  canEdit: (item: Record<string, unknown>) => boolean,
  canCreate: (item: Record<string, unknown>) => Record<string, unknown> | null,
  update: (oldItem: Record<string, unknown>, newItem: Record<string, unknown>) => Record<string, unknown>,
  canDelete: (item: Record<string, unknown>) => boolean = () => false
): Array<Record<string, unknown>> {
  const proposedById = new Map(
    proposed.filter((item) => typeof item.id === 'string').map((item) => [item.id as string, item])
  );
  const originalIds = new Set(original.map((item) => item.id).filter((id): id is string => typeof id === 'string'));
  const merged: Array<Record<string, unknown>> = [];

  for (const oldItem of original) {
    const id = oldItem.id;
    const nextItem = typeof id === 'string' ? proposedById.get(id) : undefined;
    if (!canEdit(oldItem)) {
      merged.push(oldItem);
    } else if (nextItem) {
      merged.push(update(oldItem, nextItem));
    } else if (!canDelete(oldItem)) {
      merged.push(oldItem);
    }
  }

  for (const nextItem of proposed) {
    if (typeof nextItem.id !== 'string' || originalIds.has(nextItem.id)) continue;
    const created = canCreate(nextItem);
    if (created) merged.push(created);
  }
  return merged;
}

function stateForUser(state: AppState, user: Record<string, unknown>): AppState {
  const role = user.peran;
  const userId = user.id;
  if (role === 'Admin') return { ...state, currentUser: null };

  const sessions = stateRecords(state, 'sessions').filter((session) =>
      role === 'Konselor'
        ? session.idKonselor === userId
        : session.idMahasiswa === userId
  );
  const sessionIds = new Set(sessions.map((session) => session.id));
  const users = stateRecords(state, 'users')
    .filter((item) => item.id === userId || (role === 'Mahasiswa' && item.peran === 'Konselor' && item.statusAkun === 'Aktif'))
    .map((item) => {
      if (item.id === userId) {
        const { password: _password, ...ownUser } = item;
        return ownUser;
      }
      const { id, nama, peran, statusAkun, spesialisasi, statusKetersediaan } = item;
      return { id, nama, peran, statusAkun, spesialisasi, statusKetersediaan };
    });
  const visibleSessions = sessions.map((session) => {
    if (role !== 'Mahasiswa') return session;
    const { catatanRahasiaKonselor: _notes, catatanDiperbaruiPada: _updated, ...studentSession } = session;
    return studentSession;
  });

  return {
    ...state,
    currentUser: null,
    users,
    siakadRecords: [],
    slots: stateRecords(state, 'slots'),
    appointments: stateRecords(state, 'appointments').filter((appointment) =>
      role === 'Konselor'
        ? appointment.idKonselor === userId
        : appointment.idMahasiswa === userId
    ),
    sessions: visibleSessions,
    messages: stateRecords(state, 'messages').filter((message) => sessionIds.has(message.idSesi)),
    screeningResults: role === 'Mahasiswa'
      ? stateRecords(state, 'screeningResults').filter((item) => item.idMahasiswa === userId)
      : [],
    emergencyRequests: stateRecords(state, 'emergencyRequests').filter((item) =>
      role === 'Konselor' || item.idMahasiswa === userId
    ),
    articles: stateRecords(state, 'articles').filter((item) => item.statusPublikasi === 'Terbit'),
    moodJournals: role === 'Mahasiswa'
      ? stateRecords(state, 'moodJournals').filter((item) => item.idMahasiswa === userId)
      : [],
    notifications: stateRecords(state, 'notifications').filter((item) => item.idPenerima === userId),
    auditLogs: [],
  };
}

function mergeStateForUser(
  original: AppState,
  proposed: AppState,
  user: Record<string, unknown>
): AppState {
  if (user.peran === 'Admin') return { ...proposed, currentUser: null };

  const role = user.peran;
  const userId = user.id;
  const originalSlots = stateRecords(original, 'slots');
  const originalAppointments = stateRecords(original, 'appointments');
  const reservedAppointmentSlots = new Set<string>();
  for (const appointment of originalAppointments) {
    if (!['Menunggu', 'Dikonfirmasi', 'Jadwal Ulang', 'Selesai'].includes(String(appointment.status))) continue;
    if (typeof appointment.idJadwal === 'string') reservedAppointmentSlots.add(appointment.idJadwal);
    if (typeof appointment.usulanJadwalId === 'string') reservedAppointmentSlots.add(appointment.usulanJadwalId);
  }
  const appointments = mergeScopedArray(
    originalAppointments,
    stateRecords(proposed, 'appointments'),
    (item) => role === 'Konselor' ? item.idKonselor === userId : item.idMahasiswa === userId,
    (item) => {
      if (role !== 'Mahasiswa' || item.idMahasiswa !== userId || typeof item.idJadwal !== 'string') return null;
      const slot = originalSlots.find((candidate) => candidate.id === item.idJadwal);
      if (!slot || slot.status !== 'Tersedia' || reservedAppointmentSlots.has(item.idJadwal)) return null;
      reservedAppointmentSlots.add(item.idJadwal);
      return {
        ...item,
        idMahasiswa: userId,
        namaMahasiswa: user.nama,
        nimMahasiswa: user.nim ?? '-',
        idKonselor: slot.idKonselor,
        namaKonselor: slot.namaKonselor,
        status: 'Menunggu',
      };
    },
      (oldItem, nextItem) => {
        if (role === 'Konselor') {
          if (nextItem.status === 'Jadwal Ulang') {
            const targetId = nextItem.usulanJadwalId;
            const target = originalSlots.find((slot) => slot.id === targetId);
            if (
              !['Menunggu', 'Jadwal Ulang'].includes(String(oldItem.status)) ||
              typeof targetId !== 'string' || !target || target.idKonselor !== userId ||
              target.status !== 'Tersedia' || reservedAppointmentSlots.has(targetId)
            ) return oldItem;
            reservedAppointmentSlots.add(targetId);
            return {
              ...oldItem,
              status: 'Jadwal Ulang',
              usulanJadwalId: target.id,
              usulanHariTanggal: target.hariTanggal,
              usulanJam: `${target.jamMulai} - ${target.jamSelesai}`,
            };
          }
          if (['Dikonfirmasi', 'Ditolak'].includes(String(nextItem.status)) &&
            ['Menunggu', 'Jadwal Ulang'].includes(String(oldItem.status))) {
            return mergeFields(oldItem, nextItem, ['status', 'alasanPenolakan']);
          }
          if (oldItem.status === 'Dikonfirmasi' && nextItem.status === 'Selesai') {
            const endedSession = stateRecords(proposed, 'sessions').some((session) =>
              session.idJanji === oldItem.id && session.idKonselor === userId && session.status === 'Selesai'
            );
            if (endedSession) return { ...oldItem, status: 'Selesai' };
          }
          return oldItem;
        }

        if (nextItem.status === 'Dibatalkan' &&
          ['Menunggu', 'Dikonfirmasi', 'Jadwal Ulang'].includes(String(oldItem.status))) {
          return { ...oldItem, status: 'Dibatalkan' };
        }
        if (oldItem.status === 'Jadwal Ulang' && nextItem.status === 'Dikonfirmasi' &&
          nextItem.idJadwal === oldItem.usulanJadwalId) {
          const target = originalSlots.find((slot) => slot.id === oldItem.usulanJadwalId);
          if (!target) return oldItem;
          return {
            ...oldItem,
            status: 'Dikonfirmasi',
            idJadwal: target.id,
            hariTanggal: target.hariTanggal,
            jam: `${target.jamMulai} - ${target.jamSelesai}`,
          };
        }
        return oldItem;
      },
  );

  const slots = mergeScopedArray(
    originalSlots,
    stateRecords(proposed, 'slots'),
    (item) => role === 'Konselor' && item.idKonselor === userId,
    (item) => {
      if (role !== 'Konselor' || item.idKonselor !== userId || typeof item.hariTanggal !== 'string') return null;
      const start = clockMinutes(item.jamMulai);
      const end = clockMinutes(item.jamSelesai);
      const overlaps = originalSlots.some((slot) => {
        if (slot.idKonselor !== userId || slot.hariTanggal !== item.hariTanggal) return false;
        const existingStart = clockMinutes(slot.jamMulai);
        const existingEnd = clockMinutes(slot.jamSelesai);
        return start !== null && end !== null && existingStart !== null && existingEnd !== null &&
          start < existingEnd && existingStart < end;
      });
      if (start === null || end === null || end <= start || overlaps) return null;
      return { ...item, idKonselor: userId, namaKonselor: user.nama, status: 'Tersedia' };
    },
    (oldItem, nextItem) => mergeFields(oldItem, nextItem, ['hariTanggal', 'jamMulai', 'jamSelesai']),
    (item) => !originalAppointments.some((appointment) =>
      (appointment.idJadwal === item.id || appointment.usulanJadwalId === item.id) &&
        ['Menunggu', 'Dikonfirmasi', 'Jadwal Ulang', 'Selesai'].includes(String(appointment.status))
    )
  );
  const reservedSlotIds = new Set<string>();
  for (const appointment of appointments) {
    if (['Menunggu', 'Dikonfirmasi', 'Selesai'].includes(String(appointment.status)) && typeof appointment.idJadwal === 'string') {
      reservedSlotIds.add(appointment.idJadwal);
    }
    if (appointment.status === 'Jadwal Ulang' && typeof appointment.usulanJadwalId === 'string') {
      reservedSlotIds.add(appointment.usulanJadwalId);
    }
  }

  const sessions = mergeScopedArray(
    stateRecords(original, 'sessions'),
    stateRecords(proposed, 'sessions'),
    (item) => role === 'Konselor' ? item.idKonselor === userId : item.idMahasiswa === userId,
    (item) => {
      if (role !== 'Konselor' || item.idKonselor !== userId) return null;
      const appointment = appointments.find((entry) => entry.id === item.idJanji);
      const emergency = stateRecords(original, 'emergencyRequests').find((entry) => entry.id === item.idJanji);
      const proposedEmergency = stateRecords(proposed, 'emergencyRequests').find((entry) => entry.id === item.idJanji);
      const validAppointment = appointment?.idKonselor === userId && appointment?.status === 'Dikonfirmasi';
      const validEmergency = emergency?.status === 'Menunggu' && proposedEmergency?.idKonselorPenangan === userId;
      if (stateRecords(original, 'sessions').some((session) => session.idJanji === item.idJanji)) return null;
      if (validAppointment && appointment) {
        return {
          ...item,
          idKonselor: userId,
          namaKonselor: user.nama,
          idMahasiswa: appointment.idMahasiswa,
          namaMahasiswa: appointment.namaMahasiswa,
          idJanji: appointment.id,
          hariTanggal: appointment.hariTanggal,
          jamSesi: appointment.jam,
          topik: appointment.alasanTopik,
          status: 'Berlangsung',
        };
      }
      if (validEmergency && emergency) {
        return {
          ...item,
          idKonselor: userId,
          namaKonselor: user.nama,
          idMahasiswa: emergency.idMahasiswa,
          namaMahasiswa: emergency.namaMahasiswa,
          idJanji: emergency.id,
          topik: `[Darurat - ${emergency.tingkatUrgensi}] ${emergency.deskripsi}`,
          status: 'Berlangsung',
        };
      }
      return null;
    },
    (oldItem, nextItem) => role === 'Konselor'
      ? mergeFields(oldItem, nextItem, ['status', 'waktuSelesai', 'catatanRahasiaKonselor', 'catatanDiperbaruiPada'])
      : oldItem.status === 'Selesai'
        ? mergeFields(oldItem, nextItem, ['rating', 'ulasanMahasiswa'])
        : oldItem
  );
  const sessionIds = new Set(sessions.map((session) => session.id));

  const merged: AppState = {
    ...original,
    currentUser: null,
    users: mergeScopedArray(
      stateRecords(original, 'users'),
      stateRecords(proposed, 'users'),
      (item) => item.id === userId,
      () => null,
      (oldItem, nextItem) => mergeFields(oldItem, nextItem, ['nama', 'noTelepon', 'programStudi', 'spesialisasi'])
    ),
    slots: slots.map((slot) => ({
      ...slot,
      status: reservedSlotIds.has(String(slot.id)) ? 'Dipesan' : 'Tersedia',
    })),
    appointments,
    sessions,
    messages: mergeScopedArray(
      stateRecords(original, 'messages'),
      stateRecords(proposed, 'messages'),
      (item) => sessionIds.has(item.idSesi),
      (item) => {
        const session = sessions.find((entry) => entry.id === item.idSesi);
        return item.idPengirim === userId && session?.status === 'Berlangsung'
          ? { ...item, idPengirim: userId, namaPengirim: user.nama, peranPengirim: role }
          : null;
      },
      (oldItem) => oldItem
    ),
    screeningResults: mergeScopedArray(
      stateRecords(original, 'screeningResults'),
      stateRecords(proposed, 'screeningResults'),
      () => false,
      (item) => role === 'Mahasiswa' && item.idMahasiswa === userId
        ? { ...item, idMahasiswa: userId, namaMahasiswa: user.nama }
        : null,
      (oldItem) => oldItem
    ),
    emergencyRequests: mergeScopedArray(
      stateRecords(original, 'emergencyRequests'),
      stateRecords(proposed, 'emergencyRequests'),
      (item) => role === 'Konselor'
        ? item.status === 'Menunggu' || item.idKonselorPenangan === userId
        : item.idMahasiswa === userId,
      (item) => role === 'Mahasiswa' && item.idMahasiswa === userId
        ? { ...item, idMahasiswa: userId, namaMahasiswa: user.nama, status: 'Menunggu' }
        : null,
      (oldItem, nextItem) => role === 'Konselor' && oldItem.status === 'Menunggu'
        ? {
            ...oldItem,
            status: 'Ditangani',
            idKonselorPenangan: userId,
            namaKonselorPenangan: user.nama,
            catatanPenanganan: nextItem.catatanPenanganan,
            waktuDitangani: nextItem.waktuDitangani,
          }
        : oldItem
    ),
    moodJournals: mergeScopedArray(
      stateRecords(original, 'moodJournals'),
      stateRecords(proposed, 'moodJournals'),
      () => false,
      (item) => role === 'Mahasiswa' && item.idMahasiswa === userId
        ? { ...item, idMahasiswa: userId }
        : null,
      (oldItem) => oldItem
    ),
    notifications: mergeScopedArray(
      stateRecords(original, 'notifications'),
      stateRecords(proposed, 'notifications'),
      (item) => item.idPenerima === userId,
      () => null,
      (oldItem, nextItem) => mergeFields(oldItem, nextItem, ['dibaca'])
    ),
  };
  return merged;
}

async function createPasswordHash(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, saltHex, hashHex] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, 'hex');
  const actual = (await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function readSessionToken(request: Request): string | null {
  const cookie = request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('healspace_session='));
  return cookie?.slice('healspace_session='.length) || null;
}

function sessionCookie(token: string, maxAge: number): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `healspace_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

async function createAuthSession(userId: string, response: Response): Promise<void> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await pool.query('DELETE FROM auth_sessions WHERE expires_at <= now()');
  await pool.query(
    `INSERT INTO auth_sessions (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), userId, createHash('sha256').update(token).digest('hex'), expiresAt]
  );
  response.setHeader('Set-Cookie', sessionCookie(token, 14 * 24 * 60 * 60));
}

async function requireAuth(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction
): Promise<void> {
  const token = readSessionToken(request);
  if (!token) {
    response.status(401).json({ message: 'Silakan masuk untuk melanjutkan.' });
    return;
  }

  try {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const session = await pool.query<{ user_id: string }>(
      'SELECT user_id FROM auth_sessions WHERE token_hash = $1 AND expires_at > now()',
      [tokenHash]
    );
    const userId = session.rows[0]?.user_id;
    if (!userId) {
      response.status(401).json({ message: 'Sesi tidak berlaku. Silakan masuk kembali.' });
      return;
    }

    const state = await pool.query<{ data: AppState }>(
      'SELECT data FROM healspace_app_state WHERE id = 1'
    );
    const user = state.rows[0]?.data.users.find((item) => item.id === userId);
    if (!user || user.statusAkun !== 'Aktif') {
      await pool.query('DELETE FROM auth_sessions WHERE token_hash = $1', [tokenHash]);
      response.status(401).json({ message: 'Akun tidak aktif atau sesi tidak berlaku.' });
      return;
    }

    request.authUser = user;
    next();
  } catch (error) {
    console.error('Authentication check failed:', error);
    response.status(503).json({ message: 'Autentikasi tidak dapat diverifikasi.' });
  }
}

async function saveState(client: PoolClient, state: AppState): Promise<void> {
  for (const user of state.users) {
    const userId = user.id;
    const password = user.password;
    if (typeof userId !== 'string' || typeof password !== 'string' || !password) continue;

    const passwordHash = await createPasswordHash(password);
    await client.query(
      `INSERT INTO app_user_credentials (user_id, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [userId, passwordHash]
    );
  }

  await client.query(
    `INSERT INTO healspace_app_state (id, data, updated_at)
     VALUES (1, $1::jsonb, now())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [JSON.stringify(hashStatePasswords(state))]
  );
}

app.get('/api/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1');
    response.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('PostgreSQL health check failed:', error);
    response.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.get('/api/state', requireAuth, async (request: AuthenticatedRequest, response) => {
  try {
    const result = await pool.query<{ data: AppState }>(
      'SELECT data FROM healspace_app_state WHERE id = 1'
    );
    const state = result.rows[0]?.data;
    if (!state || !request.authUser) {
      response.status(503).json({ message: 'Data aplikasi belum tersedia.' });
      return;
    }
    response.json(stateForUser(state, request.authUser));
  } catch (error) {
    console.error('Could not load application data:', error);
    response.status(500).json({ message: 'Data aplikasi gagal dimuat dari PostgreSQL.' });
  }
});

app.put('/api/state', requireAuth, async (request: AuthenticatedRequest, response) => {
  if (!isAppState(request.body)) {
    response.status(400).json({ message: 'Format data aplikasi tidak valid.' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<{ data: AppState }>(
      'SELECT data FROM healspace_app_state WHERE id = 1 FOR UPDATE'
    );
    const original = result.rows[0]?.data;
    if (!original || !request.authUser) {
      await client.query('ROLLBACK');
      response.status(503).json({ message: 'Data aplikasi belum tersedia.' });
      return;
    }
    const nextState = mergeStateForUser(original, request.body, request.authUser);
    await saveState(client, nextState);
    await client.query('COMMIT');
    response.json({ status: 'saved' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Could not save application data:', error);
    response.status(500).json({ message: 'Data aplikasi gagal disimpan ke PostgreSQL.' });
  } finally {
    client.release();
  }
});

app.post('/api/auth/login', async (request, response) => {
  const { email, password } = request.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    response.status(400).json({ message: 'Email dan kata sandi wajib diisi.' });
    return;
  }

  try {
    const stateResult = await pool.query<{ data: AppState }>(
      'SELECT data FROM healspace_app_state WHERE id = 1'
    );
    const user = stateResult.rows[0]?.data.users.find(
      (item) => typeof item.email === 'string' && item.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!user || typeof user.id !== 'string' || user.statusAkun !== 'Aktif') {
      response.status(401).json({ message: 'Email atau kata sandi tidak sesuai.' });
      return;
    }

    const credential = await pool.query<{ password_hash: string }>(
      'SELECT password_hash FROM app_user_credentials WHERE user_id = $1',
      [user.id]
    );
    const storedHash = credential.rows[0]?.password_hash;
    if (!storedHash || !(await verifyPassword(password, storedHash))) {
      response.status(401).json({ message: 'Email atau kata sandi tidak sesuai.' });
      return;
    }

    await createAuthSession(user.id, response);
    response.json({ user: { ...user, password: '' } });
  } catch (error) {
    console.error('Login request failed:', error);
    response.status(500).json({ message: 'Login gagal karena server mengalami masalah.' });
  }
});

app.post('/api/auth/register', async (request, response) => {
  const { nama, nim, email, password } = request.body ?? {};
  if (
    typeof nama !== 'string' ||
    typeof nim !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    response.status(400).json({ message: 'Nama, NIM, email, dan kata sandi wajib diisi.' });
    return;
  }

  const cleanNama = nama.trim();
  const cleanNim = nim.trim();
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanNama || !/^\d{8,14}$/.test(cleanNim) || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    response.status(400).json({ message: 'Data nama, NIM, atau email tidak valid.' });
    return;
  }
  if (password.length < 8) {
    response.status(400).json({ message: 'Kata sandi wajib minimal 8 karakter.' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const stateResult = await client.query<{ data: AppState }>(
      'SELECT data FROM healspace_app_state WHERE id = 1 FOR UPDATE'
    );
    const state = stateResult.rows[0]?.data;
    if (!state || !Array.isArray(state.siakadRecords)) {
      await client.query('ROLLBACK');
      response.status(503).json({ message: 'Data SIAKAD belum tersedia.' });
      return;
    }

    const records = state.siakadRecords as Array<Record<string, unknown>>;
    const student = records.find((record) => record.nim === cleanNim);
    if (!student || student.statusAkademik !== 'Aktif') {
      await client.query('ROLLBACK');
      response.status(400).json({ message: 'NIM tidak ditemukan atau status akademik tidak aktif.' });
      return;
    }

    const users = state.users;
    if (users.some((user) => String(user.email).toLowerCase() === cleanEmail)) {
      await client.query('ROLLBACK');
      response.status(409).json({ message: 'Email sudah terdaftar pada sistem HealSpace.' });
      return;
    }
    if (users.some((user) => user.nim === cleanNim)) {
      await client.query('ROLLBACK');
      response.status(409).json({ message: 'NIM tersebut sudah terhubung dengan akun mahasiswa.' });
      return;
    }

    const user = {
      id: randomUUID(),
      nama: cleanNama,
      email: cleanEmail,
      password: '',
      noTelepon: '',
      peran: 'Mahasiswa',
      statusAkun: 'Aktif',
      terakhirLogin: 'Belum pernah',
      nim: cleanNim,
      programStudi: String(student.programStudi ?? ''),
      fakultas: String(student.fakultas ?? ''),
      statusVerifikasi: true,
    };
    const passwordHash = await createPasswordHash(password);
    await client.query(
      'INSERT INTO app_user_credentials (user_id, password_hash) VALUES ($1, $2)',
      [user.id, passwordHash]
    );
    const nextState = { ...state, users: [...users, user] };
    await client.query(
      'UPDATE healspace_app_state SET data = $1::jsonb, updated_at = now() WHERE id = 1',
      [JSON.stringify(nextState)]
    );
    await client.query('COMMIT');
    await createAuthSession(user.id, response);
    response.status(201).json({ user });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration request failed:', error);
    response.status(500).json({ message: 'Registrasi gagal karena server mengalami masalah.' });
  } finally {
    client.release();
  }
});

app.get('/api/auth/session', requireAuth, (request: AuthenticatedRequest, response) => {
  const { password: _password, ...user } = request.authUser ?? {};
  response.json({ user });
});

app.post('/api/auth/logout', async (request, response) => {
  const token = readSessionToken(request);
  if (token) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await pool.query('DELETE FROM auth_sessions WHERE token_hash = $1', [tokenHash]);
  }
  response.setHeader('Set-Cookie', sessionCookie('', 0));
  response.json({ status: 'logged_out' });
});

app.post('/api/auth/change-password', requireAuth, async (request: AuthenticatedRequest, response) => {
  const { oldPassword, newPassword } = request.body ?? {};
  const userId = request.authUser?.id;
  if (
    typeof userId !== 'string' ||
    typeof oldPassword !== 'string' ||
    typeof newPassword !== 'string' ||
    newPassword.length < 8
  ) {
    response.status(400).json({ message: 'Data kata sandi tidak valid; minimal 8 karakter.' });
    return;
  }

  try {
    const credential = await pool.query<{ password_hash: string }>(
      'SELECT password_hash FROM app_user_credentials WHERE user_id = $1',
      [userId]
    );
    const storedHash = credential.rows[0]?.password_hash;
    if (!storedHash || !(await verifyPassword(oldPassword, storedHash))) {
      response.status(401).json({ message: 'Kata sandi lama tidak sesuai.' });
      return;
    }

    const newHash = await createPasswordHash(newPassword);
    await pool.query(
      'UPDATE app_user_credentials SET password_hash = $1 WHERE user_id = $2',
      [newHash, userId]
    );
    const activeToken = readSessionToken(request);
    if (activeToken) {
      const activeTokenHash = createHash('sha256').update(activeToken).digest('hex');
      await pool.query(
        'DELETE FROM auth_sessions WHERE user_id = $1 AND token_hash <> $2',
        [userId, activeTokenHash]
      );
    }
    response.json({ status: 'updated' });
  } catch (error) {
    console.error('Password change failed:', error);
    response.status(500).json({ message: 'Kata sandi gagal diperbarui.' });
  }
});

app.listen(port, '127.0.0.1', () => {
  console.log(`HealSpace API listening on http://127.0.0.1:${port}`);
});
