CREATE TABLE IF NOT EXISTS siakad_student_records (
  nim text PRIMARY KEY,
  full_name text NOT NULL,
  program_study text NOT NULL,
  faculty text NOT NULL,
  academic_status text NOT NULL CHECK (academic_status IN ('Aktif', 'Cuti', 'Nonaktif'))
);

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  phone text NOT NULL DEFAULT '',
  role text NOT NULL CHECK (role IN ('Mahasiswa', 'Konselor', 'Admin')),
  account_status text NOT NULL DEFAULT 'Aktif' CHECK (account_status IN ('Aktif', 'Nonaktif')),
  last_login timestamptz,
  nim text UNIQUE REFERENCES siakad_student_records(nim),
  program_study text,
  faculty text,
  is_verified boolean NOT NULL DEFAULT false,
  specialization text,
  availability_status text CHECK (availability_status IN ('Siaga', 'Sibuk')),
  admin_level text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS availability_slots (
  id text PRIMARY KEY,
  counselor_id text NOT NULL REFERENCES users(id),
  session_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'Tersedia' CHECK (status IN ('Tersedia', 'Dipesan')),
  CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS appointments (
  id text PRIMARY KEY,
  student_id text NOT NULL REFERENCES users(id),
  counselor_id text NOT NULL REFERENCES users(id),
  slot_id text NOT NULL REFERENCES availability_slots(id),
  topic text NOT NULL,
  status text NOT NULL CHECK (
    status IN ('Menunggu', 'Dikonfirmasi', 'Ditolak', 'Dibatalkan', 'Jadwal Ulang', 'Selesai')
  ),
  rejection_reason text,
  proposed_slot_id text REFERENCES availability_slots(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS counseling_sessions (
  id text PRIMARY KEY,
  appointment_id text NOT NULL UNIQUE REFERENCES appointments(id),
  student_id text NOT NULL REFERENCES users(id),
  counselor_id text NOT NULL REFERENCES users(id),
  status text NOT NULL CHECK (status IN ('Berlangsung', 'Selesai')),
  started_at timestamptz,
  ended_at timestamptz,
  video_link text,
  confidential_counselor_notes text,
  notes_updated_at timestamptz,
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  student_review text
);

CREATE TABLE IF NOT EXISTS session_messages (
  id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES counseling_sessions(id) ON DELETE CASCADE,
  sender_id text NOT NULL REFERENCES users(id),
  message text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS screening_results (
  id text PRIMARY KEY,
  student_id text NOT NULL REFERENCES users(id),
  score integer NOT NULL,
  max_score integer NOT NULL CHECK (max_score > 0),
  risk_category text NOT NULL CHECK (risk_category IN ('Rendah', 'Sedang', 'Tinggi')),
  interpretation text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emergency_requests (
  id text PRIMARY KEY,
  student_id text NOT NULL REFERENCES users(id),
  urgency text NOT NULL CHECK (urgency IN ('Sedang', 'Tinggi', 'Kritis')),
  description text NOT NULL,
  status text NOT NULL DEFAULT 'Menunggu' CHECK (status IN ('Menunggu', 'Ditangani', 'Selesai')),
  handled_by text REFERENCES users(id),
  handling_notes text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  handled_at timestamptz
);

CREATE TABLE IF NOT EXISTS education_articles (
  id text PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL,
  summary text NOT NULL,
  content_sections text[] NOT NULL DEFAULT '{}',
  reading_duration text NOT NULL,
  publication_status text NOT NULL CHECK (publication_status IN ('Terbit', 'Draf')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mood_journals (
  id text PRIMARY KEY,
  student_id text NOT NULL REFERENCES users(id),
  mood text NOT NULL CHECK (mood IN ('Tenang', 'Baik', 'Lelah', 'Cemas', 'Berat')),
  journal_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  recipient_id text NOT NULL REFERENCES users(id),
  title text NOT NULL,
  message text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('Sistem & Email SIAKAD', 'Gateway SMS/Email')),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id text PRIMARY KEY,
  actor text NOT NULL,
  action text NOT NULL,
  target text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS healspace_app_state (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_user_credentials (
  user_id text PRIMARY KEY,
  password_hash text NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointments_student_id_idx ON appointments(student_id);
CREATE INDEX IF NOT EXISTS appointments_counselor_id_idx ON appointments(counselor_id);
CREATE INDEX IF NOT EXISTS session_messages_session_id_idx ON session_messages(session_id);
CREATE INDEX IF NOT EXISTS screening_results_student_id_idx ON screening_results(student_id);
CREATE INDEX IF NOT EXISTS emergency_requests_status_idx ON emergency_requests(status);
CREATE INDEX IF NOT EXISTS mood_journals_student_id_idx ON mood_journals(student_id);
CREATE INDEX IF NOT EXISTS notifications_recipient_id_idx ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id);
