import React, { useState } from 'react';
import { useHealSpace } from '../context/HealSpaceContext';
import { SCREENING_QUESTIONS } from '../data/initialData';
import {
  AppointmentStatus,
  EducationArticle,
  EmergencyUrgency,
  MoodJournalEntry,
  RiskCategory,
  ScreeningResult,
  SessionStatus,
  UserRole,
} from '../types/healspace';
type IconProps = { className?: string };

const Video: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="13" height="14" rx="2" />
    <path d="m16 10 5-3v10l-5-3z" />
  </svg>
);

const Star: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3z" />
  </svg>
);

const X: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="m18 6-12 12M6 6l12 12" />
  </svg>
);

const Check: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12 4 4L19 6" />
  </svg>
);

const Menu: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

type MahasiswaTab = 'beranda' | 'jadwal' | 'sesi' | 'skrining' | 'profil';

const RADIO_OPTIONS = [
  { label: 'Tidak pernah', score: 0 },
  { label: 'Kadang', score: 1 },
  { label: 'Sering', score: 2 },
  { label: 'Selalu', score: 3 },
];

export const MahasiswaDashboard: React.FC = () => {
  const {
    currentUser,
    logout,
    slots,
    appointments,
    sessions,
    messages,
    screeningResults,
    emergencyRequests,
    articles,
    moodJournals,
    notifications,
    bookAppointment,
    cancelAppointment,
    respondReschedule,
    sendMessage,
    endSession,
    submitFeedback,
    submitScreening,
    submitEmergencyRequest,
    addMoodJournal,
    updateProfile,
    changePassword,
    markNotificationsRead,
  } = useHealSpace();

  const [activeTab, setActiveTab] = useState<MahasiswaTab>('jadwal');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

  // Jadwal & Booking state
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [bookingTopic, setBookingTopic] = useState('');

  // Sesi Konseling state
  const mySessions = sessions.filter((s) => s.idMahasiswa === currentUser?.id);
  const [activeSessionId, setActiveSessionId] = useState<string>(
    mySessions.find((s) => s.status === SessionStatus.BERLANGSUNG)?.id ??
      mySessions[0]?.id ??
      ''
  );
  const [chatInput, setChatInput] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [ratingVal, setRatingVal] = useState(5);
  const [ulasanText, setUlasanText] = useState('');
  const [videoCallActive, setVideoCallActive] = useState(false);

  // Skrining & Edukasi state
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(SCREENING_QUESTIONS.length).fill(null)
  );
  const [latestCompletedScreening, setLatestCompletedScreening] =
    useState<ScreeningResult | null>(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyUrgency, setEmergencyUrgency] = useState<EmergencyUrgency>(
    EmergencyUrgency.TINGGI
  );
  const [emergencyDesc, setEmergencyDesc] = useState('');
  const [openedArticle, setOpenedArticle] = useState<EducationArticle | null>(null);

  // Beranda Mood & Jurnal state
  const [selectedMood, setSelectedMood] =
    useState<MoodJournalEntry['suasanaHati']>('Tenang');
  const [journalText, setJournalText] = useState('');

  // Profil state
  const [profNama, setProfNama] = useState(currentUser?.nama ?? '');
  const [profTelp, setProfTelp] = useState(currentUser?.noTelepon ?? '');
  const [profProdi, setProfProdi] = useState(currentUser?.programStudi ?? '');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');

  if (!currentUser) return null;

  const availableSlots = slots.filter((s) => s.status === 'Tersedia');
  const myAppointments = appointments.filter(
    (a) =>
      a.idMahasiswa === currentUser.id &&
      a.status !== AppointmentStatus.DIBATALKAN
  );
  const currentSession =
    mySessions.find((s) => s.id === activeSessionId) ?? mySessions[0] ?? null;
  const currentSessionMessages = currentSession
    ? messages.filter((m) => m.idSesi === currentSession.id)
    : [];
  const publishedArticles = articles.filter((a) => a.statusPublikasi === 'Terbit');
  const myNotifications = notifications.filter((n) => n.idPenerima === currentUser.id);
  const myJournals = moodJournals.filter((j) => j.idMahasiswa === currentUser.id);
  const myScreenings = screeningResults.filter((r) => r.idMahasiswa === currentUser.id);
  const myEmergencies = emergencyRequests.filter((e) => e.idMahasiswa === currentUser.id);

  const notify = (ok: boolean, text: string) => {
    setBanner({ ok, text });
  };

  const navItems: { id: MahasiswaTab; label: string }[] = [
    { id: 'beranda', label: 'Beranda' },
    { id: 'jadwal', label: 'Jadwal & janji temu' },
    { id: 'sesi', label: 'Sesi konseling' },
    { id: 'skrining', label: 'Skrining & edukasi' },
    { id: 'profil', label: 'Profil' },
  ];

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId) return;
    const res = bookAppointment(selectedSlotId, bookingTopic);
    notify(res.ok, res.message);
    if (res.ok) {
      setSelectedSlotId(null);
      setBookingTopic('');
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;
    const res = sendMessage(currentSession.id, chatInput);
    if (res.ok) {
      setChatInput('');
    } else {
      notify(false, res.message);
    }
  };

  const handleNextQuestion = () => {
    if (answers[qIndex] === null) {
      notify(false, 'Pilih salah satu jawaban terlebih dahulu sebelum melanjutkan.');
      return;
    }
    setBanner(null);
    if (qIndex < SCREENING_QUESTIONS.length - 1) {
      setQIndex(qIndex + 1);
    } else {
      const numericAnswers = answers.map((a) => a ?? 0);
      const res = submitScreening(numericAnswers);
      if (res) {
        setLatestCompletedScreening(res);
      }
    }
  };

  const handleResetScreening = () => {
    setAnswers(Array(SCREENING_QUESTIONS.length).fill(null));
    setQIndex(0);
    setLatestCompletedScreening(null);
  };

  const handleEmergencySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = submitEmergencyRequest(emergencyUrgency, emergencyDesc);
    notify(res.ok, res.message);
    if (res.ok) {
      setShowEmergencyModal(false);
      setEmergencyDesc('');
    }
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;
    const res = submitFeedback(currentSession.id, ratingVal, ulasanText);
    notify(res.ok, res.message);
    if (res.ok) {
      setShowFeedbackModal(false);
      setUlasanText('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F7F8F7]">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-5 py-3.5 bg-white border-b border-[#E5E8E6]">
        <div>
          <span className="text-lg font-bold text-[#2D736B]">HealSpace</span>
          <span className="ml-2 text-xs text-[#63706C]">Mahasiswa</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg border border-[#E5E8E6] text-[#2E3A36]"
          aria-label="Menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Left Sidebar — Exact Match to Pages 25 & 26 */}
      <aside
        className={`${
          mobileMenuOpen ? 'flex' : 'hidden'
        } md:flex flex-col justify-between w-full md:w-[248px] shrink-0 bg-white border-b md:border-b-0 md:border-r border-[#E5E8E6] px-5 py-7`}
      >
        <div>
          <div className="px-3 mb-7">
            <div className="text-xl font-bold text-[#2D736B] tracking-tight">
              HealSpace
            </div>
            <div className="text-xs text-[#7A8682] mt-0.5">Mahasiswa</div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setBanner(null);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#2D736B] text-white font-semibold'
                      : 'text-[#33413D] hover:bg-[#F2F5F4] font-medium'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 mt-6 border-t border-[#EEF1F0]">
          <div className="px-3 mb-3">
            <div className="text-xs font-semibold text-[#1A2421] truncate">
              {currentUser.nama}
            </div>
            <div className="text-[11px] text-[#7A8682] font-mono tabular-nums">
              NIM {currentUser.nim}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full text-left px-3.5 py-2 rounded-lg text-sm text-[#63706C] hover:text-[#1A2421] hover:bg-[#F2F5F4] transition-colors"
          >
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 px-6 py-8 sm:px-10 lg:px-12 max-w-[1220px]">
        {banner && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg border text-sm flex items-center justify-between gap-3 ${
              banner.ok
                ? 'bg-[#EAF4F2] border-[#CBE3DF] text-[#215750]'
                : 'bg-[#FDF2F0] border-[#F3D0CA] text-[#9E3829]'
            }`}
          >
            <span>{banner.text}</span>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="p-1 hover:opacity-75"
              aria-label="Tutup pesan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: BERANDA (Ringkasan Mahasiswa, Mood Tracker & Jurnal, Notifikasi) */}
        {activeTab === 'beranda' && (
          <div>
            <h1 className="text-2xl font-bold text-[#1A2421] tracking-tight">
              Halo, {currentUser.nama.split(' ')[0]}
            </h1>
            <p className="mt-1 text-sm text-[#63706C]">
              {currentUser.programStudi} · {currentUser.fakultas} · Terverifikasi SIAKAD
            </p>

            {/* Quick Summary Metrics */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-[#E5E8E6] rounded-xl p-5">
                <div className="text-xs text-[#63706C]">Janji temu aktif</div>
                <div className="mt-1.5 text-2xl font-bold text-[#1A2421] font-mono tabular-nums">
                  {
                    myAppointments.filter(
                      (a) =>
                        a.status === AppointmentStatus.MENUNGGU ||
                        a.status === AppointmentStatus.DIKONFIRMASI
                    ).length
                  }
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('jadwal')}
                  className="mt-3 text-xs font-semibold text-[#2D736B] hover:underline"
                >
                  Lihat jadwal konselor
                </button>
              </div>

              <div className="bg-white border border-[#E5E8E6] rounded-xl p-5">
                <div className="text-xs text-[#63706C]">Sesi konseling</div>
                <div className="mt-1.5 text-2xl font-bold text-[#1A2421] font-mono tabular-nums">
                  {mySessions.length}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('sesi')}
                  className="mt-3 text-xs font-semibold text-[#2D736B] hover:underline"
                >
                  Buka ruang sesi
                </button>
              </div>

              <div className="bg-white border border-[#E5E8E6] rounded-xl p-5">
                <div className="text-xs text-[#63706C]">Skrining terakhir</div>
                <div className="mt-1.5 text-lg font-bold text-[#1A2421]">
                  {myScreenings[0]
                    ? `Risiko ${myScreenings[0].kategoriRisiko}`
                    : 'Belum diisi'}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('skrining')}
                  className="mt-3 text-xs font-semibold text-[#2D736B] hover:underline"
                >
                  Isi kuesioner skrining
                </button>
              </div>
            </div>

            {/* Mood Tracker & Jurnal Harian + Notifikasi */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 bg-white border border-[#E5E8E6] rounded-xl p-6">
                <h2 className="text-base font-bold text-[#1A2421]">
                  Jurnal & pencatat suasana hati harian
                </h2>
                <p className="mt-1 text-xs text-[#63706C]">
                  Catatan ini bersifat pribadi untuk membantu Anda mengenali pola perasaan harian.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(
                    ['Tenang', 'Baik', 'Lelah', 'Cemas', 'Berat'] as MoodJournalEntry['suasanaHati'][]
                  ).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMood(m)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                        selectedMood === m
                          ? 'bg-[#2D736B] text-white border-[#2D736B]'
                          : 'bg-white text-[#33413D] border-[#D7DDD9] hover:bg-[#F7F8F7]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const res = addMoodJournal(selectedMood, journalText);
                    notify(res.ok, res.message);
                    if (res.ok) setJournalText('');
                  }}
                  className="mt-4"
                >
                  <textarea
                    rows={3}
                    value={journalText}
                    onChange={(e) => setJournalText(e.target.value)}
                    placeholder="Tuliskan apa yang sedang Anda rasakan atau syukuri hari ini..."
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D7DDD9] rounded-lg text-[#1A2421] placeholder:text-[#98A39F] focus:outline-none focus:border-[#2D736B]"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#2D736B] hover:bg-[#235B54] rounded-lg transition-colors whitespace-nowrap"
                    >
                      Simpan jurnal
                    </button>
                  </div>
                </form>

                {myJournals.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-[#EEF1F0] space-y-3">
                    <div className="text-xs font-semibold text-[#63706C]">
                      Riwayat jurnal pribadi Anda
                    </div>
                    {myJournals.map((j) => (
                      <div
                        key={j.id}
                        className="py-2.5 border-b border-[#F2F4F3] last:border-b-0"
                      >
                        <div className="flex items-center gap-2 text-xs text-[#63706C]">
                          <span className="font-semibold text-[#2D736B]">
                            Mood: {j.suasanaHati}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{j.tanggal}</span>
                        </div>
                        <p className="mt-1 text-sm text-[#2E3A36]">{j.catatanJurnal}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 bg-white border border-[#E5E8E6] rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#1A2421]">
                    Notifikasi sistem
                  </h2>
                  {myNotifications.some((n) => !n.dibaca) && (
                    <button
                      type="button"
                      onClick={markNotificationsRead}
                      className="text-xs font-medium text-[#2D736B] hover:underline"
                    >
                      Tandai dibaca
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-[#63706C]">
                  Pembaruan otomatis jadwal, sesi, dan darurat.
                </p>

                <div className="mt-4 divide-y divide-[#EEF1F0]">
                  {myNotifications.length === 0 ? (
                    <p className="py-6 text-xs text-[#7A8682]">
                      Belum ada notifikasi baru.
                    </p>
                  ) : (
                    myNotifications.slice(0, 5).map((n) => (
                      <div key={n.id} className="py-3 first:pt-1 last:pb-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#1A2421]">
                            {n.judul}
                          </span>
                          {!n.dibaca && (
                            <span className="text-[11px] font-semibold text-[#2D736B]">
                              Baru
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-[#54615D] leading-relaxed">
                          {n.pesan}
                        </p>
                        <div className="mt-1 text-[11px] text-[#889490] tabular-nums">
                          {n.waktu} · {n.saluran}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: JADWAL & JANJI TEMU — Exact Match to Page 25 Bottom */}
        {activeTab === 'jadwal' && (
          <div>
            <h1 className="text-2xl font-bold text-[#1A2421] tracking-tight">
              Jadwal konselor
            </h1>
            <p className="mt-1 text-sm text-[#63706C]">
              Pilih waktu yang tersedia untuk membuat janji konseling.
            </p>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Card: Available Counselor Slots */}
              <div className="lg:col-span-8 bg-white border border-[#E5E8E6] rounded-xl p-6">
                {availableSlots.length === 0 ? (
                  <p className="py-8 text-sm text-[#63706C] text-center">
                    Saat ini seluruh slot konselor telah terisi. Silakan periksa kembali nanti.
                  </p>
                ) : (
                  <div className="divide-y divide-[#EEF1F0]">
                    {availableSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center flex-1">
                          <div className="sm:col-span-4 text-sm font-bold text-[#1A2421] tabular-nums">
                            {slot.hariTanggal}
                          </div>
                          <div className="sm:col-span-3 text-sm text-[#4A5753] font-mono tabular-nums">
                            {slot.jamMulai} - {slot.jamSelesai}
                          </div>
                          <div className="sm:col-span-5">
                            <div className="text-sm text-[#2E3A36] font-medium">
                              {slot.namaKonselor}
                            </div>
                            <div className="text-xs text-[#7A8682]">
                              {slot.spesialisasi}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="px-2.5 py-1 text-xs font-medium bg-[#E2F2EE] text-[#215750] rounded-md whitespace-nowrap">
                            Tersedia
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSlotId(slot.id);
                              setBanner(null);
                            }}
                            className="px-4 py-1.5 text-xs font-medium text-[#1A2421] bg-white border border-[#CFD6D3] hover:border-[#2D736B] hover:text-[#2D736B] rounded-lg transition-colors whitespace-nowrap"
                          >
                            Pilih
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline Topic Confirmation Form when a slot is clicked */}
                {selectedSlotId && (
                  <form
                    onSubmit={handleConfirmBooking}
                    className="mt-5 pt-5 border-t border-[#E5E8E6]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-[#1A2421]">
                        Ajukan janji konseling pada slot terpilih
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedSlotId(null)}
                        className="text-xs text-[#63706C] hover:text-[#1A2421]"
                      >
                        Batal pilih
                      </button>
                    </div>
                    <label
                      htmlFor="booking-topic"
                      className="block text-xs text-[#63706C] mb-1.5"
                    >
                      Topik atau alasan singkat konseling (opsional namun membantu konselor):
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        id="booking-topic"
                        type="text"
                        value={bookingTopic}
                        onChange={(e) => setBookingTopic(e.target.value)}
                        placeholder="Contoh: Kesulitan mengatur kecemasan menjelang sidang akhir..."
                        className="flex-1 px-3.5 py-2 text-sm bg-white border border-[#D7DDD9] rounded-lg text-[#1A2421] focus:outline-none focus:border-[#2D736B]"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#2D736B] hover:bg-[#235B54] rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        Ajukan janji
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Right Card: Janji temu saya — Exact Match to Page 25 Bottom */}
              <div className="lg:col-span-4 bg-white border border-[#E5E8E6] rounded-xl p-6">
                <h2 className="text-base font-bold text-[#1A2421]">
                  Janji temu saya
                </h2>

                {myAppointments.length === 0 ? (
                  <p className="mt-4 text-xs text-[#7A8682]">
                    Anda belum memiliki janji temu aktif. Pilih salah satu jadwal di samping untuk memesan sesi.
                  </p>
                ) : (
                  <div className="mt-4 divide-y divide-[#EEF1F0]">
                    {myAppointments.map((appt) => (
                      <div key={appt.id} className="py-3.5 first:pt-1 last:pb-1">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold text-[#1A2421] tabular-nums">
                              {appt.hariTanggal}
                            </div>
                            <div className="text-xs text-[#63706C] font-mono tabular-nums mt-0.5">
                              {appt.jam}
                            </div>
                            <div className="text-[11px] text-[#7A8682] mt-0.5">
                              {appt.namaKonselor}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {appt.status === AppointmentStatus.MENUNGGU && (
                              <span className="px-2.5 py-1 text-[11px] font-medium bg-[#FBF0D9] text-[#8F5B14] rounded-md whitespace-nowrap">
                                Menunggu
                              </span>
                            )}
                            {appt.status === AppointmentStatus.DIKONFIRMASI && (
                              <span className="px-2.5 py-1 text-[11px] font-medium bg-[#E2F2EE] text-[#215750] rounded-md whitespace-nowrap">
                                Dikonfirmasi
                              </span>
                            )}
                            {appt.status === AppointmentStatus.JADWAL_ULANG && (
                              <span className="px-2.5 py-1 text-[11px] font-medium bg-[#FBF0D9] text-[#8F5B14] rounded-md whitespace-nowrap">
                                Usulan baru
                              </span>
                            )}
                            {appt.status === AppointmentStatus.DITOLAK && (
                              <span className="px-2.5 py-1 text-[11px] font-medium bg-[#FDF2F0] text-[#9E3829] rounded-md whitespace-nowrap">
                                Ditolak
                              </span>
                            )}
                            {appt.status === AppointmentStatus.SELESAI && (
                              <span className="px-2.5 py-1 text-[11px] font-medium bg-[#EEF1F0] text-[#54615D] rounded-md whitespace-nowrap">
                                Selesai
                              </span>
                            )}

                            {(appt.status === AppointmentStatus.MENUNGGU ||
                              appt.status === AppointmentStatus.DIKONFIRMASI) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const res = cancelAppointment(appt.id);
                                  notify(res.ok, res.message);
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-[#2E3A36] bg-white border border-[#CFD6D3] hover:border-[#B54736] hover:text-[#B54736] rounded-lg transition-colors whitespace-nowrap"
                              >
                                Batalkan
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Reschedule Proposal Response (UC10a) */}
                        {appt.status === AppointmentStatus.JADWAL_ULANG && (
                          <div className="mt-2.5 pt-2.5 border-t border-[#EEF1F0]">
                            <p className="text-xs text-[#54615D]">
                              Usulan konselor: <strong className="tabular-nums">{appt.usulanHariTanggal} ({appt.usulanJam})</strong>
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const res = respondReschedule(appt.id, true);
                                  notify(res.ok, res.message);
                                }}
                                className="px-3 py-1 text-xs font-semibold text-white bg-[#2D736B] rounded-md whitespace-nowrap"
                              >
                                Terima jadwal
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const res = respondReschedule(appt.id, false);
                                  notify(res.ok, res.message);
                                }}
                                className="px-3 py-1 text-xs font-medium text-[#2E3A36] border border-[#CFD6D3] rounded-md whitespace-nowrap"
                              >
                                Tolak
                              </button>
                            </div>
                          </div>
                        )}

                        {appt.status === AppointmentStatus.DITOLAK && appt.alasanPenolakan && (
                          <p className="mt-1.5 text-[11px] text-[#9E3829]">
                            Catatan: {appt.alasanPenolakan}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SESI KONSELING — Exact Match to Page 26 Top */}
        {activeTab === 'sesi' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-[#1A2421] tracking-tight">
                  Sesi konseling
                </h1>
                <p className="mt-1 text-sm text-[#63706C] tabular-nums">
                  {currentSession
                    ? `${currentSession.namaKonselor} · ${currentSession.jamSesi}`
                    : 'Pilih sesi konseling yang telah dikonfirmasi'}
                </p>
              </div>

              {mySessions.length > 1 && (
                <select
                  value={currentSession?.id ?? ''}
                  onChange={(e) => setActiveSessionId(e.target.value)}
                  className="px-3.5 py-2 text-xs font-medium bg-white border border-[#D7DDD9] rounded-lg text-[#1A2421] focus:outline-none focus:border-[#2D736B]"
                >
                  {mySessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.hariTanggal} ({s.jamSesi}) — {s.status}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {!currentSession ? (
              <div className="mt-6 bg-white border border-[#E5E8E6] rounded-xl p-8 text-center">
                <p className="text-sm text-[#63706C]">
                  Belum ada sesi konseling yang terkonfirmasi. Silakan ajukan jadwal pada menu Jadwal & janji temu.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('jadwal')}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#2D736B] rounded-lg"
                >
                  Lihat jadwal konselor
                </button>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left/Center Chat Room Card — Exact Match to Page 26 Top */}
                <div className="lg:col-span-8 bg-white border border-[#E5E8E6] rounded-xl p-6 min-h-[480px] flex flex-col justify-between">
                  <div>
                    {/* Optional Virtual Video Conference Bar (Page 6 External Meeting Integration) */}
                    {videoCallActive && (
                      <div className="mb-4 p-4 rounded-xl bg-[#1A2421] text-white flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold">
                            Ruang Tatap Muka Virtual Terenkripsi Aktif
                          </div>
                          <div className="text-[11px] text-white/70 mt-0.5 font-mono">
                            {currentSession.namaKonselor} · Audio & Video Terhubung
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setVideoCallActive(false)}
                          className="px-3 py-1.5 text-xs font-medium bg-[#B54736] text-white rounded-lg"
                        >
                          Tutup video
                        </button>
                      </div>
                    )}

                    {/* Message Bubbles */}
                    <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
                      {currentSessionMessages.map((msg) => {
                        const isMe = msg.peranPengirim === UserRole.MAHASISWA;
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${
                              isMe ? 'items-end' : 'items-start'
                            }`}
                          >
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-sm max-w-[82%] leading-relaxed ${
                                isMe
                                  ? 'bg-[#2D736B] text-white'
                                  : 'bg-[#E9F0EE] text-[#1A2421]'
                              }`}
                            >
                              {msg.isiPesan}
                            </div>
                            <span className="mt-1 px-1 text-[11px] text-[#889490] font-mono tabular-nums">
                              {msg.waktu}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Input Bar — Exact Match to Page 26 Top */}
                  <form
                    onSubmit={handleSendChat}
                    className="mt-6 pt-4 border-t border-[#EEF1F0] flex items-center gap-2.5"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={currentSession.status !== SessionStatus.BERLANGSUNG}
                      placeholder={
                        currentSession.status === SessionStatus.BERLANGSUNG
                          ? 'Tulis pesan...'
                          : 'Sesi ini telah selesai.'
                      }
                      className="flex-1 px-4 py-2.5 text-sm bg-white border border-[#D7DDD9] rounded-lg text-[#1A2421] placeholder:text-[#98A39F] focus:outline-none focus:border-[#2D736B] disabled:bg-[#F7F8F7]"
                    />
                    <button
                      type="submit"
                      disabled={currentSession.status !== SessionStatus.BERLANGSUNG}
                      className="px-5 py-2.5 text-sm font-semibold text-white bg-[#2D736B] hover:bg-[#235B54] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Kirim
                    </button>
                  </form>
                </div>

                {/* Right Session Info Panel — Exact Match to Page 26 Top */}
                <div className="lg:col-span-4 bg-white border border-[#E5E8E6] rounded-xl p-6 space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-[#1A2421]">Info sesi</h2>
                    <p className="mt-1 text-xs text-[#63706C]">
                      Status: {currentSession.status}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2.5">
                      {currentSession.status === SessionStatus.BERLANGSUNG && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const res = endSession(currentSession.id);
                              notify(res.ok, res.message);
                            }}
                            className="px-4 py-2 text-xs font-semibold text-white bg-[#B54736] hover:bg-[#993A2B] rounded-lg transition-colors whitespace-nowrap"
                          >
                            Akhiri sesi
                          </button>

                          <button
                            type="button"
                            onClick={() => setVideoCallActive(!videoCallActive)}
                            className="px-3.5 py-2 text-xs font-medium text-[#2E3A36] bg-white border border-[#CFD6D3] hover:border-[#2D736B] rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <Video className="w-3.5 h-3.5 text-[#2D736B]" />
                            <span>{videoCallActive ? 'Sedang tatap muka' : 'Tatap muka virtual'}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-5 border-t border-[#EEF1F0]">
                    <h3 className="text-sm font-bold text-[#1A2421]">Setelah sesi</h3>
                    <p className="mt-1 text-xs text-[#63706C]">
                      Beri ulasan dan lihat riwayat.
                    </p>

                    <div className="mt-3.5 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (currentSession.status !== SessionStatus.SELESAI) {
                            notify(
                              false,
                              'Silakan akhiri sesi terlebih dahulu untuk memberikan ulasan.'
                            );
                            return;
                          }
                          setShowFeedbackModal(true);
                        }}
                        className="px-4 py-2 text-xs font-medium text-[#2E3A36] bg-white border border-[#CFD6D3] hover:border-[#2D736B] hover:text-[#2D736B] rounded-lg transition-colors whitespace-nowrap"
                      >
                        {currentSession.rating ? `Diulas (${currentSession.rating}/5)` : 'Beri ulasan'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowHistoryModal(!showHistoryModal)}
                        className="px-3.5 py-2 text-xs font-medium text-[#63706C] hover:text-[#1A2421] transition-colors whitespace-nowrap"
                      >
                        {showHistoryModal ? 'Tutup riwayat' : 'Lihat riwayat'}
                      </button>
                    </div>

                    {showFeedbackModal && (
                      <form
                        onSubmit={handleFeedbackSubmit}
                        className="mt-4 pt-4 border-t border-[#EEF1F0] space-y-3"
                      >
                        <div className="text-xs font-semibold text-[#1A2421]">
                          Penilaian sesi konseling
                        </div>
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRatingVal(star)}
                              className={`p-1.5 rounded-md border ${
                                ratingVal >= star
                                  ? 'border-[#2D736B] bg-[#EAF4F2] text-[#2D736B]'
                                  : 'border-[#E5E8E6] text-[#98A39F]'
                              }`}
                            >
                              <Star className="w-4 h-4 fill-current" />
                            </button>
                          ))}
                        </div>
                        <textarea
                          rows={2}
                          value={ulasanText}
                          onChange={(e) => setUlasanText(e.target.value)}
                          placeholder="Bagikan pengalaman dan manfaat sesi ini..."
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D7DDD9] rounded-lg focus:outline-none focus:border-[#2D736B]"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="submit"
                            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2D736B] rounded-lg"
                          >
                            Simpan ulasan
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowFeedbackModal(false)}
                            className="px-3 py-1.5 text-xs text-[#63706C]"
                          >
                            Batal
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Riwayat Konseling (UC13 — Tanpa Catatan Rahasia Konselor) */}
                    {showHistoryModal && (
                      <div className="mt-4 pt-4 border-t border-[#EEF1F0] space-y-3">
                        <div className="text-xs font-semibold text-[#1A2421]">
                          Riwayat sesi Anda
                        </div>
                        {mySessions.map((s) => (
                          <div
                            key={s.id}
                            className="py-2 border-b border-[#F2F4F3] last:border-b-0"
                          >
                            <div className="text-xs font-semibold text-[#1A2421] tabular-nums">
                              {s.hariTanggal} · {s.jamSesi}
                            </div>
                            <div className="text-[11px] text-[#63706C]">
                              {s.namaKonselor} · Status: {s.status}
                            </div>
                            {s.ulasanMahasiswa && (
                              <p className="mt-1 text-[11px] text-[#2D736B]">
                                Ulasan Anda ({s.rating}/5): &ldquo;{s.ulasanMahasiswa}&rdquo;
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SKRINING & EDUKASI — Exact Match to Page 26 Bottom */}
        {activeTab === 'skrining' && (
          <div>
            <h1 className="text-2xl font-bold text-[#1A2421] tracking-tight">
              Skrining & dukungan
            </h1>
            <p className="mt-1 text-sm text-[#63706C]">
              Jawab dengan jujur. Hasil bersifat rahasia.
            </p>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Card: Kuesioner skrining — Exact Match to Page 26 Bottom */}
              <div className="lg:col-span-8 bg-white border border-[#E5E8E6] rounded-xl p-6 sm:p-7 min-h-[380px] flex flex-col justify-between">
                {!latestCompletedScreening ? (
                  <div>
                    <h2 className="text-base font-bold text-[#1A2421]">
                      Kuesioner skrining
                    </h2>
                    <p className="mt-1 text-xs text-[#63706C] tabular-nums">
                      Pertanyaan {qIndex + 1} dari {SCREENING_QUESTIONS.length}
                    </p>

                    <p className="mt-5 text-sm sm:text-base font-semibold text-[#1A2421] leading-relaxed">
                      {SCREENING_QUESTIONS[qIndex].teks}
                    </p>

                    {/* Horizontal Radio Options — Exact Match to Page 26 Bottom */}
                    <div className="mt-5 flex flex-wrap items-center gap-5 sm:gap-7">
                      {RADIO_OPTIONS.map((opt) => {
                        const checked = answers[qIndex] === opt.score;
                        return (
                          <label
                            key={opt.label}
                            className="inline-flex items-center gap-2 cursor-pointer text-sm text-[#2E3A36] select-none"
                          >
                            <input
                              type="radio"
                              name={`skrining-q-${qIndex}`}
                              checked={checked}
                              onChange={() => {
                                const next = [...answers];
                                next[qIndex] = opt.score;
                                setAnswers(next);
                                setBanner(null);
                              }}
                              className="w-4 h-4 accent-[#2D736B]"
                            />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="mt-7 flex items-center gap-3">
                      {qIndex > 0 && (
                        <button
                          type="button"
                          onClick={() => setQIndex(qIndex - 1)}
                          className="px-4 py-2 text-xs font-medium text-[#2E3A36] bg-white border border-[#CFD6D3] rounded-lg hover:bg-[#F7F8F7] whitespace-nowrap"
                        >
                          Sebelumnya
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleNextQuestion}
                        className="px-5 py-2 text-xs font-semibold text-white bg-[#2D736B] hover:bg-[#235B54] rounded-lg transition-colors whitespace-nowrap"
                      >
                        {qIndex < SCREENING_QUESTIONS.length - 1
                          ? 'Lanjut'
                          : 'Kirim hasil skrining'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-[#1A2421]">
                        Hasil penilaian risiko skrining
                      </h2>
                      <span className="text-xs font-mono tabular-nums text-[#63706C]">
                        Skor {latestCompletedScreening.skor}/{latestCompletedScreening.skorMaksimal}
                      </span>
                    </div>

                    <div
                      className={`mt-4 p-4 rounded-xl border ${
                        latestCompletedScreening.kategoriRisiko === RiskCategory.TINGGI
                          ? 'bg-[#FDF2F0] border-[#F3D0CA] text-[#8E3123]'
                          : latestCompletedScreening.kategoriRisiko === RiskCategory.SEDANG
                          ? 'bg-[#FBF0D9] border-[#EFE0BC] text-[#7A4D10]'
                          : 'bg-[#EAF4F2] border-[#CBE3DF] text-[#215750]'
                      }`}
                    >
                      <div className="text-sm font-bold">
                        Kategori Risiko: {latestCompletedScreening.kategoriRisiko}
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed">
                        {latestCompletedScreening.interpretasi}
                      </p>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      {latestCompletedScreening.kategoriRisiko === RiskCategory.TINGGI && (
                        <button
                          type="button"
                          onClick={() => setShowEmergencyModal(true)}
                          className="px-4 py-2 text-xs font-semibold text-white bg-[#B54736] hover:bg-[#993A2B] rounded-lg whitespace-nowrap"
                        >
                          Ajukan konseling darurat sekarang
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveTab('jadwal')}
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#2D736B] hover:bg-[#235B54] rounded-lg whitespace-nowrap"
                      >
                        Buat janji konseling
                      </button>
                      <button
                        type="button"
                        onClick={handleResetScreening}
                        className="px-4 py-2 text-xs font-medium text-[#2E3A36] border border-[#CFD6D3] rounded-lg hover:bg-[#F7F8F7] whitespace-nowrap"
                      >
                        Isi ulang kuesioner
                      </button>
                    </div>
                  </div>
                )}

                {/* Past Screening Summary Footer */}
                {myScreenings.length > 0 && !latestCompletedScreening && (
                  <div className="mt-8 pt-4 border-t border-[#EEF1F0] flex items-center justify-between text-xs text-[#63706C]">
                    <span>
                      Riwayat terakhir ({myScreenings[0].tanggal}): Risiko{' '}
                      <strong className="text-[#1A2421]">{myScreenings[0].kategoriRisiko}</strong>{' '}
                      (Skor {myScreenings[0].skor}/{myScreenings[0].skorMaksimal})
                    </span>
                  </div>
                )}
              </div>

              {/* Right Column: Emergency Card + Education Card — Exact Match to Page 26 Bottom */}
              <div className="lg:col-span-4 space-y-5">
                {/* Emergency Support Card */}
                <div className="bg-white border border-[#E5E8E6] rounded-xl p-6">
                  <h2 className="text-base font-bold text-[#1A2421]">
                    Butuh bantuan segera?
                  </h2>
                  <p className="mt-1.5 text-xs text-[#63706C] leading-relaxed">
                    Ajukan konseling darurat. Konselor akan menanganinya.
                  </p>

                  <button
                    type="button"
                    onClick={() => setShowEmergencyModal(!showEmergencyModal)}
                    className="mt-4 px-4 py-2.5 text-xs font-semibold text-white bg-[#B54736] hover:bg-[#993A2B] rounded-lg transition-colors whitespace-nowrap"
                  >
                    Ajukan konseling darurat
                  </button>

                  {showEmergencyModal && (
                    <form
                      onSubmit={handleEmergencySubmit}
                      className="mt-4 pt-4 border-t border-[#EEF1F0] space-y-3"
                    >
                      <div>
                        <label className="block text-xs font-medium text-[#2E3A36] mb-1">
                          Tingkat urgensi saat ini
                        </label>
                        <select
                          value={emergencyUrgency}
                          onChange={(e) =>
                            setEmergencyUrgency(e.target.value as EmergencyUrgency)
                          }
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D7DDD9] rounded-lg"
                        >
                          <option value={EmergencyUrgency.TINGGI}>Tinggi — Butuh respons hari ini</option>
                          <option value={EmergencyUrgency.KRITIS}>Kritis — Kondisi darurat/panik</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#2E3A36] mb-1">
                          Ringkasan kondisi & lokasi singkat
                        </label>
                        <textarea
                          rows={2}
                          value={emergencyDesc}
                          onChange={(e) => setEmergencyDesc(e.target.value)}
                          placeholder="Ceritakan singkat apa yang Anda alami..."
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D7DDD9] rounded-lg focus:outline-none focus:border-[#B54736]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          className="px-3.5 py-2 text-xs font-semibold text-white bg-[#B54736] rounded-lg whitespace-nowrap"
                        >
                          Kirim sinyal darurat
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowEmergencyModal(false)}
                          className="px-3 py-2 text-xs text-[#63706C]"
                        >
                          Batal
                        </button>
                      </div>
                    </form>
                  )}

                  {myEmergencies.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-[#EEF1F0] space-y-2">
                      {myEmergencies.slice(0, 2).map((em) => (
                        <div key={em.id} className="text-xs text-[#54615D]">
                          <span className="font-semibold text-[#B54736]">
                            Status Darurat: {em.status}
                          </span>
                          {em.namaKonselorPenangan && (
                            <span> · Ditangani oleh {em.namaKonselorPenangan}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Edukasi Card — Exact Match to Page 26 Bottom */}
                <div className="bg-white border border-[#E5E8E6] rounded-xl p-6">
                  <h2 className="text-base font-bold text-[#1A2421]">Edukasi</h2>

                  <div className="mt-3 divide-y divide-[#EEF1F0]">
                    {publishedArticles.map((art) => (
                      <div key={art.id} className="py-3.5 first:pt-1 last:pb-0">
                        <div className="text-xs text-[#7A8682]">
                          {art.kategori} · {art.durasiBaca}
                        </div>
                        <div className="mt-1 text-sm font-medium text-[#1A2421]">
                          {art.judul}
                        </div>
                        <button
                          type="button"
                          onClick={() => setOpenedArticle(art)}
                          className="mt-3 px-3.5 py-1.5 text-xs font-medium text-[#2E3A36] bg-white border border-[#CFD6D3] hover:border-[#2D736B] hover:text-[#2D736B] rounded-lg transition-colors whitespace-nowrap"
                        >
                          Buka konten
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Article Reader Modal */}
            {openedArticle && (
              <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                <div className="bg-white border border-[#E5E8E6] rounded-xl max-w-xl w-full p-6 sm:p-8 max-h-[85vh] overflow-y-auto">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs text-[#63706C]">
                        {openedArticle.kategori} · {openedArticle.durasiBaca} · Diperbarui {openedArticle.diperbaruiPada}
                      </div>
                      <h3 className="mt-1.5 text-xl font-bold text-[#1A2421]">
                        {openedArticle.judul}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenedArticle(null)}
                      className="p-1.5 rounded-lg border border-[#E5E8E6] text-[#63706C] hover:text-[#1A2421]"
                      aria-label="Tutup panduan"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-5 space-y-4 text-sm text-[#2E3A36] leading-relaxed">
                    {openedArticle.isiKonten.map((para, idx) => (
                      <p key={idx}>{para}</p>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#EEF1F0] flex justify-end">
                    <button
                      type="button"
                      onClick={() => setOpenedArticle(null)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#2D736B] rounded-lg"
                    >
                      Selesai membaca
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PROFIL & UBAH KATA SANDI (UC3 & UC3a) */}
        {activeTab === 'profil' && (
          <div>
            <h1 className="text-2xl font-bold text-[#1A2421] tracking-tight">
              Profil mahasiswa
            </h1>
            <p className="mt-1 text-sm text-[#63706C]">
              Kelola informasi profil akademik dan keamanan kata sandi akun Anda.
            </p>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const res = updateProfile(profNama, profTelp, profProdi);
                  notify(res.ok, res.message);
                }}
                className="lg:col-span-7 bg-white border border-[#E5E8E6] rounded-xl p-6 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#EEF1F0]">
                  <h2 className="text-base font-bold text-[#1A2421]">Data diri & akademik</h2>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#2D736B]">
                    <Check className="w-3.5 h-3.5" />
                    Terverifikasi SIAKAD
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#63706C] mb-1">
                      NIM (Terkunci SIAKAD)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={currentUser.nim ?? '-'}
                      className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-[#F7F8F7] border border-[#E5E8E6] rounded-lg text-[#63706C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#63706C] mb-1">
                      Email Kampus
                    </label>
                    <input
                      type="email"
                      disabled
                      value={currentUser.email}
                      className="w-full px-3.5 py-2 text-sm bg-[#F7F8F7] border border-[#E5E8E6] rounded-lg text-[#63706C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#2E3A36] mb-1">
                    Nama lengkap
                  </label>
                  <input
                    type="text"
                    value={profNama}
                    onChange={(e) => setProfNama(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#D7DDD9] rounded-lg text-[#1A2421] focus:outline-none focus:border-[#2D736B]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#2E3A36] mb-1">
                      Program studi
                    </label>
                    <input
                      type="text"
                      value={profProdi}
                      onChange={(e) => setProfProdi(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-[#D7DDD9] rounded-lg text-[#1A2421] focus:outline-none focus:border-[#2D736B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#2E3A36] mb-1">
                      Nomor telepon darurat/aktif
                    </label>
                    <input
                      type="text"
                      value={profTelp}
                      onChange={(e) => setProfTelp(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-white border border-[#D7DDD9] rounded-lg text-[#1A2421] focus:outline-none focus:border-[#2D736B]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#2D736B] hover:bg-[#235B54] rounded-lg transition-colors whitespace-nowrap"
                  >
                    Simpan perubahan profil
                  </button>
                </div>
              </form>

              {/* UC3a Ubah Kata Sandi */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await changePassword(oldPass, newPass);
                  notify(res.ok, res.message);
                  if (res.ok) {
                    setOldPass('');
                    setNewPass('');
                  }
                }}
                className="lg:col-span-5 bg-white border border-[#E5E8E6] rounded-xl p-6 space-y-4"
              >
                <h2 className="text-base font-bold text-[#1A2421] pb-3 border-b border-[#EEF1F0]">
                  Ubah kata sandi
                </h2>
                <div>
                  <label className="block text-xs font-medium text-[#2E3A36] mb-1">
                    Kata sandi lama
                  </label>
                  <input
                    type="password"
                    value={oldPass}
                    onChange={(e) => setOldPass(e.target.value)}
                    placeholder="Masukkan kata sandi saat ini"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#D7DDD9] rounded-lg focus:outline-none focus:border-[#2D736B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#2E3A36] mb-1">
                    Kata sandi baru
                  </label>
                  <input
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#D7DDD9] rounded-lg focus:outline-none focus:border-[#2D736B]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#2D736B] hover:bg-[#235B54] rounded-lg transition-colors whitespace-nowrap"
                >
                  Perbarui kata sandi
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
