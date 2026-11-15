import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  AccountStatus,
  Appointment,
  AppointmentStatus,
  AuditLogEntry,
  AvailabilitySlot,
  CounselingSession,
  EducationArticle,
  EmergencyRequest,
  EmergencyStatus,
  EmergencyUrgency,
  MoodJournalEntry,
  NotificationItem,
  RiskCategory,
  ScreeningResult,
  SessionMessage,
  SessionStatus,
  SIAKADStudentRecord,
  UserAccount,
  UserRole,
} from '../types/healspace';
interface RegisterPayload {
  nama: string;
  nim: string;
  email: string;
  password: string;
}

interface ActionResponse {
  ok: boolean;
  message: string;
}

interface HealSpaceContextValue {
  currentUser: UserAccount | null;
  authScreenMode: 'register' | 'login';
  setAuthScreenMode: (mode: 'register' | 'login') => void;
  users: UserAccount[];
  siakadRecords: SIAKADStudentRecord[];
  slots: AvailabilitySlot[];
  appointments: Appointment[];
  sessions: CounselingSession[];
  messages: SessionMessage[];
  screeningResults: ScreeningResult[];
  emergencyRequests: EmergencyRequest[];
  articles: EducationArticle[];
  moodJournals: MoodJournalEntry[];
  notifications: NotificationItem[];
  auditLogs: AuditLogEntry[];

  // Auth & Profile (UC1 - UC5)
  login: (email: string, password: string) => Promise<ActionResponse>;
  logout: () => void;
  registerMahasiswa: (payload: RegisterPayload) => Promise<ActionResponse>;
  lookupSIAKAD: (nim: string) => SIAKADStudentRecord | null;
  updateProfile: (nama: string, noTelepon: string, spesialisasiOrProdi?: string) => ActionResponse;
  changePassword: (oldPass: string, newPass: string) => Promise<ActionResponse>;

  // Schedule & Appointments (UC6 - UC10a)
  bookAppointment: (slotId: string, alasanTopik: string) => ActionResponse;
  cancelAppointment: (appointmentId: string) => ActionResponse;
  confirmAppointment: (appointmentId: string) => ActionResponse;
  rejectAppointment: (appointmentId: string, alasan: string) => ActionResponse;
  proposeReschedule: (appointmentId: string, targetSlotId: string) => ActionResponse;
  respondReschedule: (appointmentId: string, accept: boolean) => ActionResponse;
  addScheduleSlot: (hariTanggal: string, jamMulai: string, jamSelesai: string) => ActionResponse;
  deleteScheduleSlot: (slotId: string) => ActionResponse;

  // Counseling Session, Notes, Feedback (UC11 - UC13a)
  sendMessage: (sessionId: string, isiPesan: string) => ActionResponse;
  endSession: (sessionId: string) => ActionResponse;
  saveSessionNote: (sessionId: string, catatan: string) => ActionResponse;
  submitFeedback: (sessionId: string, rating: number, ulasan: string) => ActionResponse;

  // Self Mental Health: Screening, Emergency, Mood Journal (UC14 - UC18)
  submitScreening: (answers: number[]) => ScreeningResult | null;
  submitEmergencyRequest: (urgensi: EmergencyUrgency, deskripsi: string) => ActionResponse;
  handleEmergencyRequest: (requestId: string, catatanPenanganan: string) => ActionResponse;
  addMoodJournal: (suasanaHati: MoodJournalEntry['suasanaHati'], catatanJurnal: string) => ActionResponse;

  // Admin Operations (UC19 - UC21)
  toggleUserStatus: (userId: string) => ActionResponse;
  createUserByAdmin: (payload: {
    nama: string;
    email: string;
    peran: UserRole;
    spesialisasiOrNim: string;
  }) => ActionResponse;
  saveArticle: (article: Omit<EducationArticle, 'id' | 'diperbaruiPada'> & { id?: string }) => ActionResponse;
  deleteArticle: (articleId: string) => ActionResponse;
  markNotificationsRead: () => void;
}

const HealSpaceContext = createContext<HealSpaceContextValue | undefined>(undefined);

interface PersistedAppState {
  currentUser: UserAccount | null;
  users: UserAccount[];
  siakadRecords: SIAKADStudentRecord[];
  slots: AvailabilitySlot[];
  appointments: Appointment[];
  sessions: CounselingSession[];
  messages: SessionMessage[];
  screeningResults: ScreeningResult[];
  emergencyRequests: EmergencyRequest[];
  articles: EducationArticle[];
  moodJournals: MoodJournalEntry[];
  notifications: NotificationItem[];
  auditLogs: AuditLogEntry[];
}

function formatNowTime(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}.${mm}`;
}

function formatNowDateLabel(): string {
  return `12 Nov 2026, ${formatNowTime()}`;
}

export const HealSpaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [authScreenMode, setAuthScreenMode] = useState<'register' | 'login'>('register');
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [siakadRecords, setSiakadRecords] = useState<SIAKADStudentRecord[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sessions, setSessions] = useState<CounselingSession[]>([]);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [screeningResults, setScreeningResults] = useState<ScreeningResult[]>([]);
  const [emergencyRequests, setEmergencyRequests] = useState<EmergencyRequest[]>([]);
  const [articles, setArticles] = useState<EducationArticle[]>([]);
  const [moodJournals, setMoodJournals] = useState<MoodJournalEntry[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [retryLoad, setRetryLoad] = useState(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const skipNextSave = useRef(false);

  const replaceAppState = (state: PersistedAppState) => {
    setUsers(state.users);
    setSiakadRecords(state.siakadRecords);
    setSlots(state.slots);
    setAppointments(state.appointments);
    setSessions(state.sessions);
    setMessages(state.messages);
    setScreeningResults(state.screeningResults);
    setEmergencyRequests(state.emergencyRequests);
    setArticles(state.articles);
    setMoodJournals(state.moodJournals);
    setNotifications(state.notifications);
    setAuditLogs(state.auditLogs);
  };

  useEffect(() => {
    let cancelled = false;

    const loadState = async () => {
      try {
        const sessionResponse = await fetch('/api/auth/session');
        if (sessionResponse.status === 401) {
          if (!cancelled) {
            setCurrentUser(null);
            setDatabaseError(null);
            setDatabaseReady(true);
          }
          return;
        }
        if (!sessionResponse.ok) {
          throw new Error('Sesi login gagal diverifikasi oleh server.');
        }

        const session = (await sessionResponse.json()) as { user: UserAccount };
        const response = await fetch('/api/state');
        if (!response.ok) {
          throw new Error('Data PostgreSQL gagal dimuat. Pastikan API server sedang berjalan.');
        }

        const state = (await response.json()) as PersistedAppState;
        replaceAppState(state);
        setCurrentUser(session.user);

        if (!cancelled) {
          skipNextSave.current = true;
          setDatabaseError(null);
          setDatabaseReady(true);
        }
      } catch (error) {
        if (!cancelled) {
          setDatabaseError(
            error instanceof Error ? error.message : 'Tidak dapat memuat data PostgreSQL.'
          );
        }
      }
    };

    void loadState();
    return () => {
      cancelled = true;
    };
  }, [retryLoad]);

  useEffect(() => {
    if (!databaseReady) return;
    if (!currentUser) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    const state: PersistedAppState = {
      currentUser,
      users,
      siakadRecords,
      slots,
      appointments,
      sessions,
      messages,
      screeningResults,
      emergencyRequests,
      articles,
      moodJournals,
      notifications,
      auditLogs,
    };

    saveQueue.current = saveQueue.current
      .then(async () => {
        const response = await fetch('/api/state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state),
        });
        if (!response.ok) {
          throw new Error('Perubahan gagal disimpan ke PostgreSQL.');
        }
        setDatabaseError(null);
      })
      .catch((error: unknown) => {
        setDatabaseError(
          error instanceof Error ? error.message : 'Perubahan gagal disimpan ke PostgreSQL.'
        );
      });
  }, [
    databaseReady,
    currentUser,
    users,
    siakadRecords,
    slots,
    appointments,
    sessions,
    messages,
    screeningResults,
    emergencyRequests,
    articles,
    moodJournals,
    notifications,
    auditLogs,
  ]);

  const pushNotification = (idPenerima: string, judul: string, pesan: string) => {
    const item: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      idPenerima,
      judul,
      pesan,
      saluran: 'Gateway SMS/Email',
      dibaca: false,
      waktu: formatNowDateLabel(),
    };
    setNotifications((prev) => [item, ...prev]);
  };

  const pushAudit = (aktor: string, aksi: string, target: string) => {
    const entry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      aktor,
      aksi,
      target,
      waktu: formatNowDateLabel(),
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  const lookupSIAKAD = (nim: string): SIAKADStudentRecord | null => {
    const clean = nim.trim();
    return siakadRecords.find((r) => r.nim === clean) ?? null;
  };

  // UC1 Login
  const login = async (email: string, password: string): Promise<ActionResponse> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as { user?: UserAccount; message?: string };
      if (!response.ok || !result.user) {
        return { ok: false, message: result.message ?? 'Login gagal.' };
      }

      const updated = { ...result.user, terakhirLogin: formatNowDateLabel() };
      const stateResponse = await fetch('/api/state');
      if (!stateResponse.ok) {
        return { ok: false, message: 'Login berhasil, tetapi data aplikasi gagal dimuat.' };
      }
      replaceAppState((await stateResponse.json()) as PersistedAppState);
      skipNextSave.current = true;
      setCurrentUser(updated);
      return { ok: true, message: 'Berhasil masuk.' };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? `Server tidak dapat dihubungi: ${error.message}` : 'Server tidak dapat dihubungi.',
      };
    }
  };

  // UC2 Logout
  const logout = () => {
    void fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
    setAuthScreenMode('login');
  };

  // UC4 & UC5 Registrasi Akun Mahasiswa + Verifikasi SIAKAD
  const registerMahasiswa = async ({ nama, nim, email, password }: RegisterPayload): Promise<ActionResponse> => {
    const cleanNama = nama.trim();
    const cleanNim = nim.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanNama || !cleanNim || !cleanEmail || !password) {
      return { ok: false, message: 'Seluruh kolom wajib diisi untuk verifikasi akademik.' };
    }
    if (!/^\d{8,14}$/.test(cleanNim)) {
      return { ok: false, message: 'Format NIM tidak valid. Gunakan 8–14 digit angka sesuai KRS.' };
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return { ok: false, message: 'Format email kampus tidak valid.' };
    }
    if (password.length < 8) {
      return { ok: false, message: 'Kata sandi wajib minimal 8 karakter.' };
    }
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: cleanNama, nim: cleanNim, email: cleanEmail, password }),
      });
      const result = (await response.json()) as { user?: UserAccount; message?: string };
      if (!response.ok || !result.user) {
        return { ok: false, message: result.message ?? 'Registrasi gagal.' };
      }

      const newUser = result.user;
      const stateResponse = await fetch('/api/state');
      if (!stateResponse.ok) {
        return { ok: false, message: 'Registrasi berhasil, tetapi data aplikasi gagal dimuat.' };
      }
      replaceAppState((await stateResponse.json()) as PersistedAppState);
      skipNextSave.current = true;
      setCurrentUser(newUser);
      pushAudit('SIAKAD Gateway', 'Verifikasi NIM berhasil & aktivasi akun baru', `${cleanNama} · ${cleanNim}`);
      pushNotification(
        newUser.id,
        'Selamat Datang di HealSpace',
        `Data akademik NIM ${cleanNim} (${newUser.programStudi}) telah diverifikasi melalui SIAKAD. Akun Anda kini aktif.`
      );
      return {
        ok: true,
        message: `Verifikasi SIAKAD berhasil (${newUser.programStudi}). Akun Anda telah diaktifkan.`,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? `Server tidak dapat dihubungi: ${error.message}` : 'Server tidak dapat dihubungi.',
      };
    }
  };

  // UC3 Kelola Profil
  const updateProfile = (
    nama: string,
    noTelepon: string,
    spesialisasiOrProdi?: string
  ): ActionResponse => {
    if (!currentUser) return { ok: false, message: 'Sesi tidak ditemukan.' };
    if (!nama.trim()) return { ok: false, message: 'Nama lengkap tidak boleh kosong.' };

    const updated: UserAccount = {
      ...currentUser,
      nama: nama.trim(),
      noTelepon: noTelepon.trim(),
      ...(currentUser.peran === UserRole.KONSELOR && spesialisasiOrProdi
        ? { spesialisasi: spesialisasiOrProdi.trim() }
        : {}),
      ...(currentUser.peran === UserRole.MAHASISWA && spesialisasiOrProdi
        ? { programStudi: spesialisasiOrProdi.trim() }
        : {}),
    };

    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updated : u)));
    setCurrentUser(updated);
    return { ok: true, message: 'Data profil berhasil diperbarui.' };
  };

  // UC3a Ubah Kata Sandi
  const changePassword = async (oldPass: string, newPass: string): Promise<ActionResponse> => {
    if (!currentUser) return { ok: false, message: 'Sesi tidak ditemukan.' };
    if (newPass.length < 8) {
      return { ok: false, message: 'Kata sandi baru minimal 8 karakter.' };
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, oldPassword: oldPass, newPassword: newPass }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        return { ok: false, message: result.message ?? 'Kata sandi gagal diperbarui.' };
      }

      const updated: UserAccount = { ...currentUser, password: '' };
      setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updated : u)));
      setCurrentUser(updated);
      return {
        ok: true,
        message: 'Kata sandi berhasil diperbarui. Perangkat lain wajib melakukan login ulang.',
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? `Server tidak dapat dihubungi: ${error.message}` : 'Server tidak dapat dihubungi.',
      };
    }
  };

  // UC6 & UC7 Membuat Janji Konseling
  const bookAppointment = (slotId: string, alasanTopik: string): ActionResponse => {
    if (!currentUser || currentUser.peran !== UserRole.MAHASISWA) {
      return { ok: false, message: 'Hanya akun Mahasiswa yang dapat memesan jadwal konseling.' };
    }
    const slot = slots.find((s) => s.id === slotId);
    if (!slot || slot.status !== 'Tersedia') {
      return { ok: false, message: 'Slot jadwal sudah terisi. Silakan pilih waktu lain.' };
    }

    const topic = alasanTopik.trim() || 'Konsultasi kesehatan mental & akademik';
    const newJanji: Appointment = {
      id: `janji-${Date.now()}`,
      idMahasiswa: currentUser.id,
      namaMahasiswa: currentUser.nama,
      nimMahasiswa: currentUser.nim ?? '-',
      idKonselor: slot.idKonselor,
      namaKonselor: slot.namaKonselor,
      idJadwal: slot.id,
      hariTanggal: slot.hariTanggal,
      jam: `${slot.jamMulai} - ${slot.jamSelesai}`,
      alasanTopik: topic,
      status: AppointmentStatus.MENUNGGU,
      dibuatPada: formatNowDateLabel(),
    };

    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, status: 'Dipesan' } : s)));
    setAppointments((prev) => [newJanji, ...prev]);
    pushNotification(
      slot.idKonselor,
      'Permintaan Janji Konseling Baru',
      `${currentUser.nama} mengajukan janji temu pada ${slot.hariTanggal} (${slot.jamMulai} - ${slot.jamSelesai}).`
    );

    return {
      ok: true,
      message: 'Permintaan janji konseling berhasil dikirim dan menunggu konfirmasi konselor.',
    };
  };

  // UC8 Membatalkan Janji Konseling
  const cancelAppointment = (appointmentId: string): ActionResponse => {
    const appt = appointments.find((a) => a.id === appointmentId);
    if (!appt) return { ok: false, message: 'Data janji temu tidak ditemukan.' };
    if (appt.status === AppointmentStatus.SELESAI) {
      return { ok: false, message: 'Sesi yang telah selesai tidak dapat dibatalkan.' };
    }

    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status: AppointmentStatus.DIBATALKAN } : a))
    );
    setSlots((prev) =>
      prev.map((s) => (s.id === appt.idJadwal ? { ...s, status: 'Tersedia' } : s))
    );
    pushNotification(
      appt.idKonselor,
      'Pembatalan Janji oleh Mahasiswa',
      `${appt.namaMahasiswa} membatalkan janji temu jadwal ${appt.hariTanggal} (${appt.jam}).`
    );

    return { ok: true, message: 'Janji temu berhasil dibatalkan dan slot telah dilepaskan.' };
  };

  // UC10 Konfirmasi Janji Temu
  const confirmAppointment = (appointmentId: string): ActionResponse => {
    const appt = appointments.find((a) => a.id === appointmentId);
    if (!appt) return { ok: false, message: 'Data janji temu tidak ditemukan.' };

    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status: AppointmentStatus.DIKONFIRMASI } : a))
    );

    const existingSession = sessions.find((s) => s.idJanji === appointmentId);
    if (!existingSession) {
      const newSessionId = `sesi-${Date.now()}`;
      const newSession: CounselingSession = {
        id: newSessionId,
        idJanji: appt.id,
        idMahasiswa: appt.idMahasiswa,
        namaMahasiswa: appt.namaMahasiswa,
        idKonselor: appt.idKonselor,
        namaKonselor: appt.namaKonselor,
        hariTanggal: appt.hariTanggal,
        jamSesi: appt.jam,
        topik: appt.alasanTopik,
        status: SessionStatus.BERLANGSUNG,
        waktuMulai: appt.jam.split(' - ')[0] ?? '09.00',
        tautanVideo: `https://meet.kampus.ac.id/healspace-${newSessionId.slice(-6)}`,
      };
      setSessions((prev) => [newSession, ...prev]);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          idSesi: newSessionId,
          idPengirim: appt.idKonselor,
          namaPengirim: appt.namaKonselor,
          peranPengirim: UserRole.KONSELOR,
          isiPesan: 'Halo, apa kabar hari ini? Ruang sesi konseling Anda telah siap.',
          waktu: formatNowTime(),
        },
      ]);
    }

    pushNotification(
      appt.idMahasiswa,
      'Janji Konseling Dikonfirmasi',
      `Janji temu bersama ${appt.namaKonselor} pada ${appt.hariTanggal} (${appt.jam}) telah dikonfirmasi.`
    );

    return { ok: true, message: 'Janji temu dikonfirmasi dan ruang sesi aman telah disiapkan.' };
  };

  // UC10 Tolak Janji Temu
  const rejectAppointment = (appointmentId: string, alasan: string): ActionResponse => {
    const appt = appointments.find((a) => a.id === appointmentId);
    if (!appt) return { ok: false, message: 'Data janji temu tidak ditemukan.' };

    const cleanReason = alasan.trim() || 'Jadwal berbenturan dengan agenda layanan darurat kampus.';
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointmentId
          ? { ...a, status: AppointmentStatus.DITOLAK, alasanPenolakan: cleanReason }
          : a
      )
    );
    setSlots((prev) =>
      prev.map((s) => (s.id === appt.idJadwal ? { ...s, status: 'Tersedia' } : s))
    );
    pushNotification(
      appt.idMahasiswa,
      'Permintaan Janji Tidak Dapat Dipenuhi',
      `Jadwal ${appt.hariTanggal} (${appt.jam}) ditolak oleh konselor. Catatan: ${cleanReason}`
    );

    return { ok: true, message: 'Janji temu ditolak dan pemberitahuan telah dikirim ke mahasiswa.' };
  };

  // UC10a Menjadwalkan Ulang (Reschedule)
  const proposeReschedule = (appointmentId: string, targetSlotId: string): ActionResponse => {
    const appt = appointments.find((a) => a.id === appointmentId);
    const targetSlot = slots.find((s) => s.id === targetSlotId);
    if (!appt || !targetSlot) {
      return { ok: false, message: 'Slot alternatif tidak valid.' };
    }

    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointmentId
          ? {
              ...a,
              status: AppointmentStatus.JADWAL_ULANG,
              usulanJadwalId: targetSlot.id,
              usulanHariTanggal: targetSlot.hariTanggal,
              usulanJam: `${targetSlot.jamMulai} - ${targetSlot.jamSelesai}`,
            }
          : a
      )
    );
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id === appt.idJadwal) return { ...s, status: 'Tersedia' };
        if (s.id === targetSlot.id) return { ...s, status: 'Dipesan' };
        return s;
      })
    );

    pushNotification(
      appt.idMahasiswa,
      'Usulan Jadwal Ulang Konseling',
      `${appt.namaKonselor} mengusulkan jadwal pengganti pada ${targetSlot.hariTanggal} (${targetSlot.jamMulai} - ${targetSlot.jamSelesai}).`
    );

    return { ok: true, message: 'Usulan jadwal ulang telah dikirimkan kepada mahasiswa.' };
  };

  const respondReschedule = (appointmentId: string, accept: boolean): ActionResponse => {
    const appt = appointments.find((a) => a.id === appointmentId);
    if (!appt || appt.status !== AppointmentStatus.JADWAL_ULANG) {
      return { ok: false, message: 'Usulan jadwal ulang tidak ditemukan.' };
    }

    if (accept) {
      const updatedHari = appt.usulanHariTanggal ?? appt.hariTanggal;
      const updatedJam = appt.usulanJam ?? appt.jam;
      const updatedSlotId = appt.usulanJadwalId ?? appt.idJadwal;

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appointmentId
            ? {
                ...a,
                idJadwal: updatedSlotId,
                hariTanggal: updatedHari,
                jam: updatedJam,
                status: AppointmentStatus.DIKONFIRMASI,
              }
            : a
        )
      );

      const newSessionId = `sesi-${Date.now()}`;
      setSessions((prev) => [
        {
          id: newSessionId,
          idJanji: appt.id,
          idMahasiswa: appt.idMahasiswa,
          namaMahasiswa: appt.namaMahasiswa,
          idKonselor: appt.idKonselor,
          namaKonselor: appt.namaKonselor,
          hariTanggal: updatedHari,
          jamSesi: updatedJam,
          topik: appt.alasanTopik,
          status: SessionStatus.BERLANGSUNG,
          waktuMulai: updatedJam.split(' - ')[0] ?? '09.00',
          tautanVideo: `https://meet.kampus.ac.id/healspace-${newSessionId.slice(-6)}`,
        },
        ...prev,
      ]);

      pushNotification(
        appt.idKonselor,
        'Usulan Jadwal Ulang Diterima',
        `${appt.namaMahasiswa} menyetujui jadwal baru pada ${updatedHari} (${updatedJam}).`
      );
      return { ok: true, message: 'Jadwal ulang disetujui dan dikonfirmasi.' };
    } else {
      if (appt.usulanJadwalId) {
        setSlots((prev) =>
          prev.map((s) => (s.id === appt.usulanJadwalId ? { ...s, status: 'Tersedia' } : s))
        );
      }
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: AppointmentStatus.DIBATALKAN } : a))
      );
      pushNotification(
        appt.idKonselor,
        'Usulan Jadwal Ulang Ditolak',
        `${appt.namaMahasiswa} menolak usulan jadwal alternatif sehingga slot dilepaskan.`
      );
      return { ok: true, message: 'Usulan jadwal ulang ditolak dan slot telah dilepaskan.' };
    }
  };

  // UC9 Mengelola Jadwal Ketersediaan
  const addScheduleSlot = (
    hariTanggal: string,
    jamMulai: string,
    jamSelesai: string
  ): ActionResponse => {
    if (!currentUser || currentUser.peran !== UserRole.KONSELOR) {
      return { ok: false, message: 'Akses terbatas untuk Konselor.' };
    }
    if (!hariTanggal.trim() || !jamMulai.trim() || !jamSelesai.trim()) {
      return { ok: false, message: 'Tanggal, jam mulai, dan jam selesai wajib diisi.' };
    }

    const conflict = slots.some(
      (s) =>
        s.idKonselor === currentUser.id &&
        s.hariTanggal.toLowerCase() === hariTanggal.trim().toLowerCase() &&
        s.jamMulai === jamMulai.trim()
    );
    if (conflict) {
      return {
        ok: false,
        message: 'Konflik jadwal terdeteksi: Anda sudah memiliki slot pada tanggal dan jam tersebut.',
      };
    }

    const newSlot: AvailabilitySlot = {
      id: `slot-${Date.now()}`,
      idKonselor: currentUser.id,
      namaKonselor: currentUser.nama,
      spesialisasi: currentUser.spesialisasi ?? 'Psikolog Klinis Kampus',
      hariTanggal: hariTanggal.trim(),
      jamMulai: jamMulai.trim(),
      jamSelesai: jamSelesai.trim(),
      status: 'Tersedia',
    };
    setSlots((prev) => [newSlot, ...prev]);
    return { ok: true, message: 'Slot ketersediaan baru berhasil ditambahkan.' };
  };

  const deleteScheduleSlot = (slotId: string): ActionResponse => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return { ok: false, message: 'Slot tidak ditemukan.' };

    const hasActiveAppointment = appointments.some(
      (a) =>
        a.idJadwal === slotId &&
        (a.status === AppointmentStatus.MENUNGGU || a.status === AppointmentStatus.DIKONFIRMASI)
    );
    if (slot.status === 'Dipesan' || hasActiveAppointment) {
      return {
        ok: false,
        message: 'Perubahan ditolak: Terdapat janji konseling aktif pada slot ini.',
      };
    }

    setSlots((prev) => prev.filter((s) => s.id !== slotId));
    return { ok: true, message: 'Slot jadwal berhasil dihapus.' };
  };

  // UC11 & UC11a Komunikasi Sesi
  const sendMessage = (sessionId: string, isiPesan: string): ActionResponse => {
    if (!currentUser) return { ok: false, message: 'Belum login.' };
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return { ok: false, message: 'Ruang sesi tidak ditemukan.' };
    if (session.status !== SessionStatus.BERLANGSUNG) {
      return { ok: false, message: 'Sesi ini telah berakhir sehingga tidak dapat mengirim pesan baru.' };
    }
    const clean = isiPesan.trim();
    if (!clean) return { ok: false, message: 'Pesan tidak boleh kosong.' };

    const newMsg: SessionMessage = {
      id: `msg-${Date.now()}`,
      idSesi: sessionId,
      idPengirim: currentUser.id,
      namaPengirim: currentUser.nama,
      peranPengirim: currentUser.peran,
      isiPesan: clean,
      waktu: formatNowTime(),
    };
    setMessages((prev) => [...prev, newMsg]);
    return { ok: true, message: 'Pesan terkirim.' };
  };

  const endSession = (sessionId: string): ActionResponse => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return { ok: false, message: 'Sesi tidak ditemukan.' };
    if (session.status === SessionStatus.SELESAI) {
      return { ok: false, message: 'Sesi sudah berstatus selesai.' };
    }

    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, status: SessionStatus.SELESAI, waktuSelesai: formatNowTime() } : s
      )
    );
    setAppointments((prev) =>
      prev.map((a) => (a.id === session.idJanji ? { ...a, status: AppointmentStatus.SELESAI } : a))
    );
    pushNotification(
      session.idMahasiswa,
      'Sesi Konseling Selesai — Mohon Beri Ulasan',
      `Sesi bersama ${session.namaKonselor} telah ditutup. Silakan berikan ulasan pada menu Sesi Konseling.`
    );

    return { ok: true, message: 'Sesi konseling telah diakhiri. Mahasiswa kini dapat memberikan ulasan.' };
  };

  // UC12 Menulis Catatan Sesi Konseling (Rahasia Konselor)
  const saveSessionNote = (sessionId: string, catatan: string): ActionResponse => {
    if (!currentUser || currentUser.peran !== UserRole.KONSELOR) {
      return { ok: false, message: 'Hanya Konselor yang berhak menyimpan catatan klinis sesi.' };
    }
    if (!catatan.trim()) {
      return { ok: false, message: 'Catatan sesi tidak boleh kosong.' };
    }

    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              catatanRahasiaKonselor: catatan.trim(),
              catatanDiperbaruiPada: formatNowDateLabel(),
            }
          : s
      )
    );
    return { ok: true, message: 'Catatan rahasia konseling berhasil disimpan.' };
  };

  // UC13a Memberi Ulasan / Feedback Sesi
  const submitFeedback = (sessionId: string, rating: number, ulasan: string): ActionResponse => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return { ok: false, message: 'Sesi tidak ditemukan.' };
    if (session.status !== SessionStatus.SELESAI) {
      return {
        ok: false,
        message: 'Ulasan ditolak: Sesi konseling harus diakhiri terlebih dahulu sebelum memberi ulasan.',
      };
    }
    if (session.rating) {
      return { ok: false, message: 'Ulasan ditolak: Anda sudah memberikan ulasan pada sesi ini.' };
    }
    if (rating < 1 || rating > 5 || !ulasan.trim()) {
      return { ok: false, message: 'Pilih rating 1–5 dan tuliskan kesan singkat Anda.' };
    }

    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, rating, ulasanMahasiswa: ulasan.trim() } : s
      )
    );
    pushNotification(
      session.idKonselor,
      'Ulasan Sesi Baru Diterima',
      `${session.namaMahasiswa} memberikan rating ${rating}/5 untuk sesi ${session.hariTanggal}.`
    );

    return { ok: true, message: 'Terima kasih atas ulasan dan umpan balik Anda.' };
  };

  // UC14 Mengisi Kuesioner Skrining
  const submitScreening = (answers: number[]): ScreeningResult | null => {
    if (!currentUser) return null;
    const total = answers.reduce((acc, v) => acc + v, 0);
    const maxScore = answers.length * 3;

    let kategori = RiskCategory.RENDAH;
    let interpretasi =
      'Kondisi psikologis Anda berada pada rentang stabil (Risiko Rendah). Pertahankan pola tidur sehat, manajemen waktu, dan manfaatkan materi edukasi mandiri.';

    if (total >= 11) {
      kategori = RiskCategory.TINGGI;
      interpretasi =
        'Skor menunjukkan beban distres tinggi (Risiko Tinggi / Darurat). Sistem menyarankan Anda segera mengajukan Konseling Darurat agar Konselor Siaga dapat mendampingi Anda hari ini.';
    } else if (total >= 6) {
      kategori = RiskCategory.SEDANG;
      interpretasi =
        'Terindikasi beban stres atau kecemasan tingkat sedang. Disarankan membaca panduan regulasi emosi serta membuat janji konseling terjadwal bersama konselor kampus.';
    }

    const result: ScreeningResult = {
      id: `skr-${Date.now()}`,
      idMahasiswa: currentUser.id,
      namaMahasiswa: currentUser.nama,
      skor: total,
      skorMaksimal: maxScore,
      kategoriRisiko: kategori,
      interpretasi,
      tanggal: formatNowDateLabel(),
    };

    setScreeningResults((prev) => [result, ...prev]);

    if (kategori === RiskCategory.TINGGI) {
      users
        .filter((u) => u.peran === UserRole.KONSELOR && u.statusAkun === AccountStatus.AKTIF)
        .forEach((k) => {
          pushNotification(
            k.id,
            'Peringatan Skrining Risiko Tinggi',
            `Hasil skrining ${currentUser.nama} berada pada kategori Risiko Tinggi (${total}/${maxScore}).`
          );
        });
    }

    return result;
  };

  // UC15 & UC16 Konseling Darurat
  const submitEmergencyRequest = (
    urgensi: EmergencyUrgency,
    deskripsi: string
  ): ActionResponse => {
    if (!currentUser || currentUser.peran !== UserRole.MAHASISWA) {
      return { ok: false, message: 'Hanya Mahasiswa yang dapat mengajukan permintaan darurat.' };
    }
    const cleanDesc =
      deskripsi.trim() || 'Membutuhkan pendampingan konselor segera untuk kondisi krisis emosional.';

    const newReq: EmergencyRequest = {
      id: `dar-${Date.now()}`,
      idMahasiswa: currentUser.id,
      namaMahasiswa: currentUser.nama,
      nimMahasiswa: currentUser.nim ?? '-',
      tingkatUrgensi: urgensi,
      deskripsi: cleanDesc,
      status: EmergencyStatus.MENUNGGU,
      waktuDiajukan: formatNowDateLabel(),
    };

    setEmergencyRequests((prev) => [newReq, ...prev]);
    users
      .filter((u) => u.peran === UserRole.KONSELOR && u.statusAkun === AccountStatus.AKTIF)
      .forEach((k) => {
        pushNotification(
          k.id,
          'DARURAT: Permintaan Konseling Prioritas',
          `${currentUser.nama} mengajukan konseling darurat (Urgensi: ${urgensi}). Segera tindak lanjuti.`
        );
      });

    return {
      ok: true,
      message: 'Permintaan konseling darurat telah dikirim ke Konselor Siaga dengan prioritas utama.',
    };
  };

  const handleEmergencyRequest = (
    requestId: string,
    catatanPenanganan: string
  ): ActionResponse => {
    if (!currentUser || currentUser.peran !== UserRole.KONSELOR) {
      return { ok: false, message: 'Hanya Konselor yang dapat menangani permintaan darurat.' };
    }
    const req = emergencyRequests.find((r) => r.id === requestId);
    if (!req) return { ok: false, message: 'Data permintaan darurat tidak ditemukan.' };

    const note =
      catatanPenanganan.trim() ||
      'Ruang sesi prioritas dibuka dan mahasiswa dihubungi langsung untuk stabilisasi awal.';

    setEmergencyRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: EmergencyStatus.DITANGANI,
              idKonselorPenangan: currentUser.id,
              namaKonselorPenangan: currentUser.nama,
              catatanPenanganan: note,
              waktuDitangani: formatNowDateLabel(),
            }
          : r
      )
    );

    const emergencySessionId = `sesi-dar-${Date.now()}`;
    setSessions((prev) => [
      {
        id: emergencySessionId,
        idJanji: req.id,
        idMahasiswa: req.idMahasiswa,
        namaMahasiswa: req.namaMahasiswa,
        idKonselor: currentUser.id,
        namaKonselor: currentUser.nama,
        hariTanggal: 'Hari Ini (Prioritas Darurat)',
        jamSesi: `${formatNowTime()} - Selesai`,
        topik: `[Darurat - ${req.tingkatUrgensi}] ${req.deskripsi}`,
        status: SessionStatus.BERLANGSUNG,
        waktuMulai: formatNowTime(),
        tautanVideo: `https://meet.kampus.ac.id/darurat-${emergencySessionId.slice(-5)}`,
        catatanRahasiaKonselor: note,
        catatanDiperbaruiPada: formatNowDateLabel(),
      },
      ...prev,
    ]);

    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        idSesi: emergencySessionId,
        idPengirim: currentUser.id,
        namaPengirim: currentUser.nama,
        peranPengirim: UserRole.KONSELOR,
        isiPesan: `Halo ${req.namaMahasiswa}, saya ${currentUser.nama} menerima sinyal konseling daruratmu. Kamu tidak sendirian—mari tarik napas perlahan, saya siap mendengarkan sekarang.`,
        waktu: formatNowTime(),
      },
    ]);

    pushNotification(
      req.idMahasiswa,
      'Permintaan Darurat Ditangani Konselor',
      `${currentUser.nama} telah membuka ruang sesi prioritas untuk Anda sekarang.`
    );

    return {
      ok: true,
      message: `Kasus darurat ${req.namaMahasiswa} telah ditugaskan kepada Anda dan ruang sesi prioritas dibuka.`,
    };
  };

  // Mood Tracker & Jurnal Mandiri (Modul Jurnal & Edukasi)
  const addMoodJournal = (
    suasanaHati: MoodJournalEntry['suasanaHati'],
    catatanJurnal: string
  ): ActionResponse => {
    if (!currentUser) return { ok: false, message: 'Sesi tidak ditemukan.' };
    if (!catatanJurnal.trim()) {
      return { ok: false, message: 'Tuliskan sedikit refleksi harian Anda terlebih dahulu.' };
    }
    const entry: MoodJournalEntry = {
      id: `jrn-${Date.now()}`,
      idMahasiswa: currentUser.id,
      suasanaHati,
      catatanJurnal: catatanJurnal.trim(),
      tanggal: formatNowDateLabel(),
    };
    setMoodJournals((prev) => [entry, ...prev]);
    return { ok: true, message: 'Catatan mood dan jurnal harian berhasil disimpan secara pribadi.' };
  };

  // UC19 & UC19a Kelola Data Pengguna & Nonaktifkan Akun
  const toggleUserStatus = (userId: string): ActionResponse => {
    const target = users.find((u) => u.id === userId);
    if (!target) return { ok: false, message: 'Pengguna tidak ditemukan.' };
    if (target.peran === UserRole.ADMIN) {
      return { ok: false, message: 'Akun Administrator utama tidak dapat dinonaktifkan.' };
    }

    if (target.statusAkun === AccountStatus.AKTIF) {
      // Validasi kasus aktif sesuai Sequence Diagram 5 (UC19a)
      const hasOngoingSession = sessions.some(
        (s) =>
          s.status === SessionStatus.BERLANGSUNG &&
          (s.idKonselor === userId || s.idMahasiswa === userId)
      );
      const hasUnhandledEmergency = emergencyRequests.some(
        (e) =>
          e.status === EmergencyStatus.MENUNGGU && e.idMahasiswa === userId
      );

      if (hasOngoingSession || hasUnhandledEmergency) {
        return {
          ok: false,
          message: `Peringatan: ${target.nama} masih memiliki sesi berlangsung atau kasus darurat aktif. Selesaikan atau alihkan sesi terlebih dahulu sebelum menonaktifkan akun.`,
        };
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, statusAkun: AccountStatus.NONAKTIF } : u))
      );
      pushAudit(
        currentUser?.nama ?? 'Admin',
        'Menonaktifkan akun pengguna',
        `${target.nama} (${target.peran})`
      );
      pushNotification(
        target.id,
        'Pemberitahuan Status Akun',
        'Akun HealSpace Anda telah dinonaktifkan sementara oleh Administrator.'
      );
      return { ok: true, message: `Akun ${target.nama} berhasil dinonaktifkan dan dicatat pada Log Audit.` };
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, statusAkun: AccountStatus.AKTIF } : u))
      );
      pushAudit(
        currentUser?.nama ?? 'Admin',
        'Mengaktifkan kembali akun pengguna',
        `${target.nama} (${target.peran})`
      );
      return { ok: true, message: `Akun ${target.nama} telah diaktifkan kembali.` };
    }
  };

  const createUserByAdmin = ({
    nama,
    email,
    peran,
    spesialisasiOrNim,
  }: {
    nama: string;
    email: string;
    peran: UserRole;
    spesialisasiOrNim: string;
  }): ActionResponse => {
    const cleanNama = nama.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanNama || !cleanEmail) {
      return { ok: false, message: 'Nama dan email wajib diisi.' };
    }
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { ok: false, message: 'Email tersebut sudah terdaftar.' };
    }

    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      nama: cleanNama,
      email: cleanEmail,
      password: 'password123',
      noTelepon: '0812-0000-0000',
      peran,
      statusAkun: AccountStatus.AKTIF,
      terakhirLogin: 'Belum pernah',
      ...(peran === UserRole.KONSELOR
        ? {
            spesialisasi: spesialisasiOrNim.trim() || 'Psikologi Klinis & Konseling Mahasiswa',
            statusKetersediaan: 'Siaga',
          }
        : {}),
      ...(peran === UserRole.MAHASISWA
        ? {
            nim: spesialisasiOrNim.trim() || '10502241099',
            programStudi: 'Informatika',
            fakultas: 'Fakultas Ilmu Komputer',
            statusVerifikasi: true,
          }
        : {}),
    };

    setUsers((prev) => [newUser, ...prev]);
    pushAudit(
      currentUser?.nama ?? 'Admin',
      `Menambahkan akun ${peran} baru`,
      `${cleanNama} (${cleanEmail})`
    );
    return { ok: true, message: `Akun ${peran} untuk ${cleanNama} berhasil ditambahkan.` };
  };

  // UC20 Kelola Konten Edukasi
  const saveArticle = (
    payload: Omit<EducationArticle, 'id' | 'diperbaruiPada'> & { id?: string }
  ): ActionResponse => {
    if (!payload.judul.trim() || !payload.ringkasan.trim() || payload.isiKonten.length === 0) {
      return { ok: false, message: 'Judul, ringkasan, dan isi materi edukasi wajib dilengkapi.' };
    }

    if (payload.id) {
      setArticles((prev) =>
        prev.map((art) =>
          art.id === payload.id
            ? {
                ...art,
                judul: payload.judul.trim(),
                kategori: payload.kategori.trim(),
                ringkasan: payload.ringkasan.trim(),
                isiKonten: payload.isiKonten,
                durasiBaca: payload.durasiBaca,
                statusPublikasi: payload.statusPublikasi,
                diperbaruiPada: '12 Nov 2026',
              }
            : art
        )
      );
      pushAudit(currentUser?.nama ?? 'Admin', 'Memperbarui konten edukasi', payload.judul.trim());
      return { ok: true, message: 'Konten edukasi berhasil diperbarui.' };
    } else {
      const created: EducationArticle = {
        id: `edu-${Date.now()}`,
        judul: payload.judul.trim(),
        kategori: payload.kategori.trim() || 'Kesehatan Mental',
        ringkasan: payload.ringkasan.trim(),
        isiKonten: payload.isiKonten,
        durasiBaca: payload.durasiBaca || '4 menit baca',
        statusPublikasi: payload.statusPublikasi,
        diperbaruiPada: '12 Nov 2026',
      };
      setArticles((prev) => [created, ...prev]);
      pushAudit(currentUser?.nama ?? 'Admin', 'Menambahkan konten edukasi baru', created.judul);
      return { ok: true, message: 'Konten edukasi baru berhasil disimpan.' };
    }
  };

  const deleteArticle = (articleId: string): ActionResponse => {
    const target = articles.find((a) => a.id === articleId);
    if (!target) return { ok: false, message: 'Konten tidak ditemukan.' };
    setArticles((prev) => prev.filter((a) => a.id !== articleId));
    pushAudit(currentUser?.nama ?? 'Admin', 'Menghapus konten edukasi', target.judul);
    return { ok: true, message: 'Konten edukasi berhasil dihapus.' };
  };

  const markNotificationsRead = () => {
    if (!currentUser) return;
    setNotifications((prev) =>
      prev.map((n) => (n.idPenerima === currentUser.id ? { ...n, dibaca: true } : n))
    );
  };

  if (!databaseReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8F7] p-6">
        <div className="max-w-md rounded-xl border border-[#E5E8E6] bg-white p-6 text-center">
          <h1 className="text-lg font-bold text-[#1A2421]">Menghubungkan ke PostgreSQL</h1>
          <p className="mt-2 text-sm text-[#63706C]" role={databaseError ? 'alert' : undefined}>
            {databaseError ?? 'Memuat data aplikasi...'}
          </p>
          {databaseError && (
            <button
              type="button"
              onClick={() => {
                setDatabaseError(null);
                setRetryLoad((attempt) => attempt + 1);
              }}
              className="mt-4 rounded-lg bg-[#2D736B] px-4 py-2 text-sm font-semibold text-white"
            >
              Coba lagi
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <HealSpaceContext.Provider
      value={{
        currentUser,
        authScreenMode,
        setAuthScreenMode,
        users,
        siakadRecords,
        slots,
        appointments,
        sessions,
        messages,
        screeningResults,
        emergencyRequests,
        articles,
        moodJournals,
        notifications,
        auditLogs,
        login,
        logout,
        registerMahasiswa,
        lookupSIAKAD,
        updateProfile,
        changePassword,
        bookAppointment,
        cancelAppointment,
        confirmAppointment,
        rejectAppointment,
        proposeReschedule,
        respondReschedule,
        addScheduleSlot,
        deleteScheduleSlot,
        sendMessage,
        endSession,
        saveSessionNote,
        submitFeedback,
        submitScreening,
        submitEmergencyRequest,
        handleEmergencyRequest,
        addMoodJournal,
        toggleUserStatus,
        createUserByAdmin,
        saveArticle,
        deleteArticle,
        markNotificationsRead,
      }}
    >
      {databaseError && (
        <div className="bg-[#FDF2F0] px-4 py-2 text-center text-sm text-[#9E3829]" role="alert">
          {databaseError}
        </div>
      )}
      {children}
    </HealSpaceContext.Provider>
  );
};

export function useHealSpace() {
  const ctx = useContext(HealSpaceContext);
  if (!ctx) {
    throw new Error('useHealSpace must be used within HealSpaceProvider');
  }
  return ctx;
}
