import React, { useState } from 'react';
import { useHealSpace } from '../context/HealSpaceContext';
import {
  AppointmentStatus,
  EmergencyStatus,
  SessionStatus,
  UserRole,
} from '../types/healspace';
import { X, Menu, Lock, Star, Video } from 'lucide-react';

type KonselorTab = 'beranda' | 'ketersediaan' | 'janji' | 'darurat' | 'riwayat';

export const KonselorDashboard: React.FC = () => {
  const {
    currentUser,
    logout,
    slots,
    appointments,
    sessions,
    messages,
    emergencyRequests,
    notifications,
    confirmAppointment,
    rejectAppointment,
    proposeReschedule,
    addScheduleSlot,
    deleteScheduleSlot,
    sendMessage,
    endSession,
    saveSessionNote,
    handleEmergencyRequest,
    markNotificationsRead,
  } = useHealSpace();

  const [activeTab, setActiveTab] = useState<KonselorTab>('janji');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

  // Reschedule & Reject inline state
  const [rescheduleTargetId, setRescheduleTargetId] = useState<string | null>(null);
  const [selectedNewSlotId, setSelectedNewSlotId] = useState<string>('');
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Availability form state
  const [slotHari, setSlotHari] = useState('Sen, 11 Nov 2026');
  const [slotMulai, setSlotMulai] = useState('09.00');
  const [slotSelesai, setSlotSelesai] = useState('10.00');

  // Active Session Chat & Notes state
  const counselorSessions = sessions.filter((s) => s.idKonselor === currentUser?.id);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    counselorSessions.find((s) => s.status === SessionStatus.BERLANGSUNG)?.id ??
      counselorSessions[0]?.id ??
      ''
  );
  const [chatMessage, setChatMessage] = useState('');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [emergencyNotes, setEmergencyNotes] = useState<Record<string, string>>({});
  const [videoOpen, setVideoOpen] = useState(false);

  if (!currentUser) return null;

  const mySlots = slots.filter((s) => s.idKonselor === currentUser.id);
  const myAvailableSlots = mySlots.filter((s) => s.status === 'Tersedia');
  const incomingAppointments = appointments.filter(
    (a) =>
      a.idKonselor === currentUser.id &&
      (a.status === AppointmentStatus.MENUNGGU ||
        a.status === AppointmentStatus.JADWAL_ULANG)
  );
  const confirmedAppointments = appointments.filter(
    (a) =>
      a.idKonselor === currentUser.id && a.status === AppointmentStatus.DIKONFIRMASI
  );
  const pendingEmergencies = emergencyRequests.filter(
    (e) => e.status === EmergencyStatus.MENUNGGU
  );
  const activeSession =
    counselorSessions.find((s) => s.id === selectedSessionId) ??
    counselorSessions[0] ??
    null;
  const activeSessionMessages = activeSession
    ? messages.filter((m) => m.idSesi === activeSession.id)
    : [];
  const myNotifications = notifications.filter((n) => n.idPenerima === currentUser.id);

  const notify = (ok: boolean, text: string) => setBanner({ ok, text });

  const navItems: { id: KonselorTab; label: string }[] = [
    { id: 'beranda', label: 'Beranda' },
    { id: 'ketersediaan', label: 'Ketersediaan jadwal' },
    { id: 'janji', label: 'Janji temu' },
    { id: 'darurat', label: 'Permintaan darurat' },
    { id: 'riwayat', label: 'Riwayat & catatan' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F7F8F7]">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-5 py-3.5 bg-white border-b border-[#E5E8E6]">
        <div>
          <span className="text-lg font-bold text-[#2D736B]">HealSpace</span>
          <span className="ml-2 text-xs text-[#63706C]">Konselor</span>
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

      {/* Left Sidebar — Exact Match to Page 27 Top */}
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
            <div className="text-xs text-[#7A8682] mt-0.5">Konselor</div>
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
            <div className="text-[11px] text-[#7A8682] truncate">
              {currentUser.spesialisasi}
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

      {/* Main Content */}
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

        {/* TAB 1: BERANDA & RUANG SESI AKTIF KONSELOR */}
        {activeTab === 'beranda' && (
          <div>
            <h1 className="text-2xl font-bold text-[#1A2421] tracking-tight">
              Ruang kerja konselor
            </h1>
            <p className="mt-1 text-sm text-[#63706C]">
              {currentUser.nama} · Spesialisasi: {currentUser.spesialisasi}
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-[#E5E8E6] rounded-xl p-5">
                <div className="text-xs text-[#63706C]">Janji menunggu konfirmasi</div>
                <div className="mt-1.5 text-2xl font-bold text-[#1A2421] font-mono tabular-nums">
                  {incomingAppointments.length}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('janji')}
                  className="mt-3 text-xs font-semibold text-[#2D736B] hover:underline"
                >
                  Tinjau janji masuk
                </button>
              </div>

              <div className="bg-white border border-[#E5E8E6] rounded-xl p-5">
                <div className="text-xs text-[#63706C]">Permintaan darurat siaga</div>
                <div className="mt-1.5 text-2xl font-bold text-[#B54736] font-mono tabular-nums">
                  {pendingEmergencies.length}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('darurat')}
                  className="mt-3 text-xs font-semibold text-[#B54736] hover:underline"
                >
                  Tangani sinyal darurat
                </button>
              </div>

              <div className="bg-white border border-[#E5E8E6] rounded-xl p-5">
                <div className="text-xs text-[#63706C]">Sesi berlangsung</div>
                <div className="mt-1.5 text-2xl font-bold text-[#1A2421] font-mono tabular-nums">
                  {
                    counselorSessions.filter(
                      (s) => s.status === SessionStatus.BERLANGSUNG
                    ).length
                  }
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('riwayat')}
                  className="mt-3 text-xs font-semibold text-[#2D736B] hover:underline"
                >
                  Buka catatan klien
                </button>
              </div>
            </div>

            {/* Live Counseling Chat Room for Counselor (UC11 & UC11a) */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 bg-white border border-[#E5E8E6] rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EEF1F0]">
                  <div>
                    <h2 className="text-base font-bold text-[#1A2421]">
                      Ruang sesi konseling aktif
                    </h2>
                    {activeSession && (
                      <p className="text-xs text-[#63706C] mt-0.5 tabular-nums">
                        Mahasiswa: {activeSession.namaMahasiswa} · {activeSession.hariTanggal} ({activeSession.jamSesi})
                      </p>
                    )}
                  </div>

                  {counselorSessions.length > 0 && (
                    <select
                      value={activeSession?.id ?? ''}
                      onChange={(e) => setSelectedSessionId(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-white border border-[#D7DDD9] rounded-lg"
                    >
                      {counselorSessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.namaMahasiswa} ({s.status})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {!activeSession ? (
                  <p className="py-8 text-sm text-[#63706C] text-center">
                    Belum ada sesi yang dimulai. Konfirmasi janji temu terlebih dahulu.
                  </p>
                ) : (
                  <div className="mt-4">
                    {videoOpen && (
                      <div className="mb-4 p-3.5 rounded-xl bg-[#1A2421] text-white flex items-center justify-between">
                        <span className="text-xs">
                          Konferensi Video Terhubung bersama {activeSession.namaMahasiswa}
                        </span>
                        <button
                          type="button"
                          onClick={() => setVideoOpen(false)}
                          className="px-2.5 py-1 text-xs bg-[#B54736] rounded-md"
                        >
                          Akhiri video
                        </button>
                      </div>
                    )}

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {activeSessionMessages.map((msg) => {
                        const isCounselor = msg.peranPengirim === UserRole.KONSELOR;
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${
                              isCounselor ? 'items-end' : 'items-start'
                            }`}
                          >
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-sm max-w-[80%] ${
                                isCounselor
                                  ? 'bg-[#2D736B] text-white'
                                  : 'bg-[#E9F0EE] text-[#1A2421]'
                              }`}
                            >
                              {msg.isiPesan}
                            </div>
                            <span className="mt-1 text-[11px] text-[#889490] font-mono tabular-nums">
                              {msg.namaPengirim.split(',')[0]} · {msg.waktu}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const res = sendMessage(activeSession.id, chatMessage);
                        if (res.ok) setChatMessage('');
                        else notify(false, res.message);
                      }}
                      className="mt-5 pt-4 border-t border-[#EEF1F0] flex flex-wrap sm:flex-nowrap items-center gap-2"
                    >
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        disabled={activeSession.status !== SessionStatus.BERLANGSUNG}
                        placeholder={
                          activeSession.status === SessionStatus.BERLANGSUNG
                            ? 'Balas pesan mahasiswa...'
                            : 'Sesi telah selesai.'
                        }
                        className="flex-1 px-3.5 py-2 text-sm bg-white border border-[#D7DDD9] rounded-lg focus:outline-none focus:border-[#2D736B]"
                      />
                      <button
                        type="submit"
                        disabled={activeSession.status !== SessionStatus.BERLANGSUNG}
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#2D736B] hover:bg-[#235B54] disabled:opacity-50 rounded-lg whitespace-nowrap"
                      >
                        Kirim
                      </button>
                      {activeSession.status === SessionStatus.BERLANGSUNG && (
                        <>
                          <button
                            type="button"
                            onClick={() => setVideoOpen(!videoOpen)}
                            className="px-3 py-2 text-xs font-medium border border-[#CFD6D3] rounded-lg flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <Video className="w-3.5 h-3.5 text-[#2D736B]" />
                            <span>Video</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const res = endSession(activeSession.id);
                              notify(res.ok, res.message);
                            }}
                            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#B54736] rounded-lg whitespace-nowrap"
                          >
                            Akhiri sesi
                          </button>
                        </>
                      )}
                    </form>
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 bg-white border border-[#E5E8E6] rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#1A2421]">Notifikasi</h2>
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
                <div className="mt-3 divide-y divide-[#EEF1F0]">
                  {myNotifications.slice(0, 4).map((n) => (
                    <div key={n.id} className="py-3 first:pt-1 last:pb-0">
                      <div className="text-xs font-semibold text-[#1A2421]">
                        {n.judul}
                      </div>
                      <p className="mt-1 text-xs text-[#54615D]">{n.pesan}</p>
                      <div className="mt-1 text-[11px] text-[#889490] tabular-nums">
                        {n.waktu}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KETERSEDIAAN JADWAL (UC9) */}
        {activeTab === 'ketersediaan' && (
          <div>
            <h1 className="text-2xl font-bold text-[#1A2421] tracking-tight">
              Ketersediaan jadwal
            </h1>
            <p className="mt-1 text-sm text-[#63706C]">
              Kelola slot waktu konseling Anda. Sistem memvalidasi konflik terhadap janji aktif.
            </p>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const res = addScheduleSlot(slotHari, slotMulai, slotSelesai);
                  notify(res.ok, res.message);
                }}
                className="lg:col-span-5 bg-white border border-[#E5E8E6] rounded-xl p-6 space-y-4"
              >
                <h2 className="text-base font-bold text-[#1A2421]">
                  Tambah slot ketersediaan
                </h2>
                <div>
                  <label className="block text-xs font-medium text-[#2E3A36] mb-1">
                    Hari dan tanggal
                  </label>
                  <input
                    type="text"
                    value={slotHari}
                    onChange={(e) => setSlotHari(e.target.value)}
                    placeholder="Contoh: Sen, 11 Nov 2026"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#D7DDD9] rounded-lg focus:outline-none focus:border-[#2D736B]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#2E3A36] mb-1">
                      Jam mulai
                    </label>
                    <input
                      type="text"
                      value={slotMulai}
                      onChange={(e) => setSlotMulai(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-white border border-[#D7DDD9] rounded-lg focus:outline-none focus:border-[#2D736B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#2E3A36] mb-1">
                      Jam selesai
                    </label>
                    <input
                      type="text"
                      value={slotSelesai}
                      onChange={(e) => setSlotSelesai(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-white border border-[#D7DDD9] rounded-lg focus:outline-none focus:border-[#2D736B]"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#2D736B] hover:bg-[#235B54] rounded-lg whitespace-nowrap"
                >
                  Simpan slot baru
                </button>
              </form>

              <div className="lg:col-span-7 bg-white border border-[#E5E8E6] rounded-xl p-6">
                <h2 className="text-base font-bold text-[#1A2421]">
                  Daftar slot jadwal Anda
                </h2>
                <div className="mt-4 divide-y divide-[#EEF1F0]">
                  {mySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="text-sm font-bold text-[#1A2421] tabular-nums">
                          {slot.hariTanggal}
                        </div>
                        <div className="text-xs text-[#63706C] font-mono tabular-nums mt-0.5">
                          {slot.jamMulai} - {slot.jamSelesai}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                            slot.status === 'Tersedia'
                              ? 'bg-[#E2F2EE] text-[#215750]'
                              : 'bg-[#FBF0D9] text-[#8F5B14]'
                          }`}
                        >
                          {slot.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const res = deleteScheduleSlot(slot.id);
                            notify(res.ok, res.message);
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-[#2E3A36] border border-[#CFD6D3] hover:border-[#B54736] hover:text-[#B54736] rounded-lg transition-colors whitespace-nowrap"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: JANJI TEMU MASUK — Exact Match to Page 27 Top */}
        {activeTab === 'janji' && (
          <div>
            <h1 className="text-2xl font-bold text-[#1A2421] tracking-tight">
              Janji temu masuk
            </h1>
            <p className="mt-1 text-sm text-[#63706C]">
              Konfirmasi, tolak, atau jadwalkan ulang.
            </p>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left/Center Card: Incoming Appointments — Exact Match to Page 27 Top */}
              <div className="lg:col-span-8 bg-white border border-[#E5E8E6] rounded-xl p-6">
                {incomingAppointments.length === 0 ? (
                  <p className="py-6 text-sm text-[#63706C]">
                    Seluruh permintaan janji temu masuk telah ditinjau.
                  </p>
                ) : (
                  <div className="divide-y divide-[#EEF1F0]">
                    {incomingAppointments.map((appt) => (
                      <div key={appt.id} className="py-4 first:pt-1 last:pb-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="text-sm font-bold text-[#1A2421]">
                              {appt.namaMahasiswa}
                            </div>
                            <div className="text-xs text-[#63706C] tabular-nums mt-0.5">
                              {appt.hariTanggal}
                            </div>
                            <div className="text-xs text-[#63706C] font-mono tabular-nums">
                              {appt.jam}
                            </div>
                            <div className="text-xs text-[#7A8682] mt-1">
                              Topik: {appt.alasanTopik}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <span className="px-2.5 py-1 text-xs font-medium bg-[#FBF0D9] text-[#8F5B14] rounded-md whitespace-nowrap">
                              {appt.status}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                const res = confirmAppointment(appt.id);
                                notify(res.ok, res.message);
                              }}
                              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#2D736B] hover:bg-[#235B54] rounded-lg transition-colors whitespace-nowrap"
                            >
                              Konfirmasi
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setRescheduleTargetId(
                                  rescheduleTargetId === appt.id ? null : appt.id
                                );
                                setRejectTargetId(null);
                                setSelectedNewSlotId(myAvailableSlots[0]?.id ?? '');
                              }}
                              className="px-3.5 py-2 text-xs font-medium text-[#2E3A36] bg-white border border-[#CFD6D3] hover:border-[#2D736B] rounded-lg transition-colors whitespace-nowrap"
                            >
                              Jadwal ulang
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setRejectTargetId(
                                  rejectTargetId === appt.id ? null : appt.id
                                );
                                setRescheduleTargetId(null);
                              }}
                              className="px-3.5 py-2 text-xs font-medium text-[#2E3A36] bg-white border border-[#CFD6D3] hover:border-[#B54736] hover:text-[#B54736] rounded-lg transition-colors whitespace-nowrap"
                            >
                              Tolak
                            </button>
                          </div>
                        </div>

                        {/* Inline Reschedule Slot Picker (UC10a) */}
                        {rescheduleTargetId === appt.id && (
                          <div className="mt-3 pt-3 border-t border-[#EEF1F0] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                            <select
                              value={selectedNewSlotId}
                              onChange={(e) => setSelectedNewSlotId(e.target.value)}
                              className="flex-1 px-3 py-2 text-xs bg-white border border-[#D7DDD9] rounded-lg"
                            >
                              {myAvailableSlots.length === 0 ? (
                                <option value="">
                                  Tidak ada slot kosong (tambahkan di menu Ketersediaan)
                                </option>
                              ) : (
                                myAvailableSlots.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.hariTanggal} · {s.jamMulai} - {s.jamSelesai}
                                  </option>
                                ))
                              )}
                            </select>
                            <button
                              type="button"
                              disabled={!selectedNewSlotId}
                              onClick={() => {
                                const res = proposeReschedule(appt.id, selectedNewSlotId);
                                notify(res.ok, res.message);
                                if (res.ok) setRescheduleTargetId(null);
                              }}
                              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#2D736B] disabled:opacity-50 rounded-lg whitespace-nowrap"
                            >
                              Kirim usulan jadwal
                            </button>
                          </div>
                        )}

                        {/* Inline Reject Reason Input (UC10) */}
                        {rejectTargetId === appt.id && (
                          <div className="mt-3 pt-3 border-t border-[#EEF1F0] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                            <input
                              type="text"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Tuliskan alasan penolakan untuk mahasiswa..."
                              className="flex-1 px-3 py-2 text-xs bg-white border border-[#D7DDD9] rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const res = rejectAppointment(appt.id, rejectReason);
                                notify(res.ok, res.message);
                                if (res.ok) {
                                  setRejectTargetId(null);
                                  setRejectReason('');
                                }
                              }}
                              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#B54736] rounded-lg whitespace-nowrap"
                            >
                              Konfirmasi tolak
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Confirmed Schedule Section */}
                {confirmedAppointments.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-[#E5E8E6]">
                    <div className="text-xs font-semibold text-[#63706C] mb-3">
                      Jadwal sesi terkonfirmasi
                    </div>
                    <div className="divide-y divide-[#EEF1F0]">
                      {confirmedAppointments.map((c) => (
                        <div
                          key={c.id}
                          className="py-3 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="text-sm font-semibold text-[#1A2421]">
                              {c.namaMahasiswa}
                            </div>
                            <div className="text-xs text-[#63706C] tabular-nums">
                              {c.hariTanggal} · {c.jam}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveTab('beranda')}
                            className="px-3.5 py-1.5 text-xs font-semibold text-[#2D736B] border border-[#2D736B] rounded-lg hover:bg-[#EAF4F2] whitespace-nowrap"
                          >
                            Masuk ruang sesi
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Card: Permintaan darurat — Exact Match to Page 27 Top */}
              <div className="lg:col-span-4 bg-white border border-[#E5E8E6] rounded-xl p-6">
                <h2 className="text-base font-bold text-[#1A2421]">
                  Permintaan darurat
                </h2>
                <p className="mt-1 text-xs text-[#63706C]">Perlu penanganan.</p>

                <div className="mt-4 divide-y divide-[#EEF1F0]">
                  {pendingEmergencies.length === 0 ? (
                    <p className="py-4 text-xs text-[#7A8682]">
                      Tidak ada permintaan konseling darurat yang menunggu saat ini.
                    </p>
                  ) : (
                    pendingEmergencies.map((em) => (
                      <div key={em.id} className="py-3.5 first:pt-1 last:pb-1">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold text-[#1A2421]">
                              {em.namaMahasiswa}
                            </div>
                            <div className="text-xs text-[#63706C] mt-0.5">
                              Urgensi: {em.tingkatUrgensi}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const res = handleEmergencyRequest(em.id, '');
                              notify(res.ok, res.message);
                            }}
                            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#B54736] hover:bg-[#993A2B] rounded-lg transition-colors whitespace-nowrap shrink-0"
                          >
                            Tangani
                          </button>
                        </div>
                        <p className="mt-2 text-xs text-[#54615D] leading-relaxed">
                          {em.deskripsi}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PERMINTAAN DARURAT (UC16 Detailed Management) */}
        {activeTab === 'darurat' && (
          <div>
            <h1 className="text-2xl font-bold text-[#1A2421] tracking-tight">
              Penanganan konseling darurat
            </h1>
            <p className="mt-1 text-sm text-[#63706C]">
              Tinjau sinyal prioritas mahasiswa dan catat tindakan stabilisasi awal.
            </p>

            <div className="mt-6 bg-white border border-[#E5E8E6] rounded-xl p-6 divide-y divide-[#EEF1F0]">
              {emergencyRequests.length === 0 ? (
                <p className="py-6 text-sm text-[#63706C]">
                  Belum ada riwayat permintaan darurat.
                </p>
              ) : (
                emergencyRequests.map((req) => (
                  <div key={req.id} className="py-4 first:pt-1 last:pb-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-[#1A2421]">
                            {req.namaMahasiswa}
                          </span>
                          <span className="text-xs text-[#63706C] font-mono tabular-nums">
                            · NIM {req.nimMahasiswa}
                          </span>
                        </div>
                        <div className="text-xs text-[#63706C] mt-0.5 tabular-nums">
                          Diajukan {req.waktuDiajukan} · Urgensi:{' '}
                          <strong className="text-[#B54736]">{req.tingkatUrgensi}</strong> · Status: {req.status}
                        </div>
                      </div>

                      {req.status === EmergencyStatus.MENUNGGU && (
                        <button
                          type="button"
                          onClick={() => {
                            const res = handleEmergencyRequest(
                              req.id,
                              emergencyNotes[req.id] ?? ''
                            );
                            notify(res.ok, res.message);
                          }}
                          className="px-4 py-2 text-xs font-semibold text-white bg-[#B54736] hover:bg-[#993A2B] rounded-lg whitespace-nowrap shrink-0"
                        >
                          Tangani & buka sesi prioritas
                        </button>
                      )}
                    </div>

                    <p className="mt-2.5 text-sm text-[#2E3A36]">{req.deskripsi}</p>

                    {req.status === EmergencyStatus.MENUNGGU ? (
                      <div className="mt-3">
                        <input
                          type="text"
                          value={emergencyNotes[req.id] ?? ''}
                          onChange={(e) =>
                            setEmergencyNotes({
                              ...emergencyNotes,
                              [req.id]: e.target.value,
                            })
                          }
                          placeholder="Catatan penanganan awal (opsional)..."
                          className="w-full px-3.5 py-2 text-xs bg-white border border-[#D7DDD9] rounded-lg focus:outline-none focus:border-[#2D736B]"
                        />
                      </div>
                    ) : (
                      <div className="mt-2.5 text-xs text-[#215750]">
                        Ditangani oleh {req.namaKonselorPenangan} ({req.waktuDitangani}) — {req.catatanPenanganan}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 5: RIWAYAT & CATATAN KLIEN RAHASIA (UC12 & UC13) */}
        {activeTab === 'riwayat' && (
          <div>
            <h1 className="text-2xl font-bold text-[#1A2421] tracking-tight">
              Riwayat sesi & catatan klinis
            </h1>
            <p className="mt-1 text-sm text-[#63706C]">
              Catatan konseling dienkripsi dan dibatasi hak aksesnya khusus untuk Konselor (tidak ditampilkan ke Mahasiswa).
            </p>

            <div className="mt-6 space-y-5">
              {counselorSessions.map((sesi) => {
                const draftVal =
                  noteDrafts[sesi.id] !== undefined
                    ? noteDrafts[sesi.id]
                    : sesi.catatanRahasiaKonselor ?? '';

                return (
                  <div
                    key={sesi.id}
                    className="bg-white border border-[#E5E8E6] rounded-xl p-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#EEF1F0]">
                      <div>
                        <h2 className="text-base font-bold text-[#1A2421]">
                          {sesi.namaMahasiswa}
                        </h2>
                        <div className="text-xs text-[#63706C] tabular-nums mt-0.5">
                          {sesi.hariTanggal} · {sesi.jamSesi} · Status: {sesi.status}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs text-[#2D736B] font-medium">
                        <Lock className="w-3.5 h-3.5" />
                        Rekam Catatan Rahasia Konselor
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs text-[#63706C] mb-1.5">
                        Topik awal: {sesi.topik}
                      </div>
                      <textarea
                        rows={3}
                        value={draftVal}
                        onChange={(e) =>
                          setNoteDrafts({ ...noteDrafts, [sesi.id]: e.target.value })
                        }
                        placeholder="Tuliskan observasi klinis, intervensi, dan rencana tindak lanjut sesi..."
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D7DDD9] rounded-lg text-[#1A2421] focus:outline-none focus:border-[#2D736B]"
                      />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs text-[#889490] tabular-nums">
                          {sesi.catatanDiperbaruiPada
                            ? `Terakhir disimpan: ${sesi.catatanDiperbaruiPada}`
                            : 'Belum ada catatan tersimpan'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const res = saveSessionNote(sesi.id, draftVal);
                            notify(res.ok, res.message);
                          }}
                          className="px-4 py-2 text-xs font-semibold text-white bg-[#2D736B] hover:bg-[#235B54] rounded-lg whitespace-nowrap"
                        >
                          Simpan catatan sesi
                        </button>
                      </div>
                    </div>

                    {sesi.ulasanMahasiswa && (
                      <div className="mt-4 pt-4 border-t border-[#EEF1F0] flex items-start gap-2 text-xs text-[#2E3A36]">
                        <Star className="w-4 h-4 text-[#2D736B] fill-current shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold">
                            Umpan balik mahasiswa ({sesi.rating}/5):
                          </span>{' '}
                          &ldquo;{sesi.ulasanMahasiswa}&rdquo;
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
