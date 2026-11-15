import React, { useState } from 'react';
import { useHealSpace } from '../context/HealSpaceContext';
import {
  AccountStatus,
  AppointmentStatus,
  EducationArticle,
  RiskCategory,
  UserRole,
} from '../types/healspace';
import { X, Menu, Download } from 'lucide-react';

type AdminTab = 'ringkasan' | 'pengguna' | 'edukasi' | 'laporan';

export const AdminDashboard: React.FC = () => {
  const {
    currentUser,
    logout,
    users,
    appointments,
    sessions,
    screeningResults,
    emergencyRequests,
    articles,
    auditLogs,
    toggleUserStatus,
    createUserByAdmin,
    saveArticle,
    deleteArticle,
  } = useHealSpace();

  const [activeTab, setActiveTab] = useState<AdminTab>('ringkasan');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

  // Data pengguna filter & add user state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'Semua' | UserRole>('Semua');
  const [newNama, setNewNama] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.KONSELOR);
  const [newAttr, setNewAttr] = useState('');

  // Konten edukasi editor state
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [artJudul, setArtJudul] = useState('');
  const [artKategori, setArtKategori] = useState('Stres Akademik');
  const [artDurasi, setArtDurasi] = useState('4 menit baca');
  const [artStatus, setArtStatus] = useState<'Terbit' | 'Draf'>('Terbit');
  const [artRingkasan, setArtRingkasan] = useState('');
  const [artBody, setArtBody] = useState('');

  // Laporan filter state
  const [reportPeriod, setReportPeriod] = useState('Semester Ganjil 2026/2027');

  if (!currentUser) return null;

  const notify = (ok: boolean, text: string) => setBanner({ ok, text });

  const nonAdminUsers = users.filter((u) => u.peran !== UserRole.ADMIN);
  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'Semua' || u.peran === roleFilter;
    const matchesSearch =
      u.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.nim && u.nim.includes(searchQuery));
    return matchesRole && matchesSearch;
  });

  const navItems: { id: AdminTab; label: string }[] = [
    { id: 'ringkasan', label: 'Ringkasan' },
    { id: 'pengguna', label: 'Data pengguna' },
    { id: 'edukasi', label: 'Konten edukasi' },
    { id: 'laporan', label: 'Laporan & statistik' },
  ];

  const startEditArticle = (art: EducationArticle) => {
    setEditingArticleId(art.id);
    setArtJudul(art.judul);
    setArtKategori(art.kategori);
    setArtDurasi(art.durasiBaca);
    setArtStatus(art.statusPublikasi);
    setArtRingkasan(art.ringkasan);
    setArtBody(art.isiKonten.join('\n\n'));
  };

  const resetArticleForm = () => {
    setEditingArticleId(null);
    setArtJudul('');
    setArtKategori('Stres Akademik');
    setArtDurasi('4 menit baca');
    setArtStatus('Terbit');
    setArtRingkasan('');
    setArtBody('');
  };

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    const paragraphs = artBody
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    const res = saveArticle({
      id: editingArticleId ?? undefined,
      judul: artJudul,
      kategori: artKategori,
      durasiBaca: artDurasi,
      statusPublikasi: artStatus,
      ringkasan: artRingkasan,
      isiKonten: paragraphs,
    });
    notify(res.ok, res.message);
    if (res.ok) resetArticleForm();
  };

  const handleDownloadCsv = () => {
    const rows = [
      ['Metrik', 'Nilai', 'Periode'],
      ['Total Pengguna Terdaftar', String(users.length), reportPeriod],
      ['Total Mahasiswa', String(users.filter((u) => u.peran === UserRole.MAHASISWA).length), reportPeriod],
      ['Total Konselor', String(users.filter((u) => u.peran === UserRole.KONSELOR).length), reportPeriod],
      ['Total Janji Temu', String(appointments.length), reportPeriod],
      ['Total Sesi Konseling', String(sessions.length), reportPeriod],
      ['Total Pengisian Skrining', String(screeningResults.length), reportPeriod],
      ['Total Permintaan Darurat', String(emergencyRequests.length), reportPeriod],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'laporan-statistik-healspace.csv';
    a.click();
    URL.revokeObjectURL(url);
    notify(true, 'Laporan statistik berhasil diunduh dalam format CSV.');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F7F8F7]">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-5 py-3.5 bg-white border-b border-[#E5E8E6]">
        <div>
          <span className="text-lg font-bold text-[#2D736B]">HealSpace</span>
          <span className="ml-2 text-xs text-[#63706C]">Admin</span>
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

      {/* Left Sidebar — Exact Match to Page 27 Bottom */}
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
            <div className="text-xs text-[#7A8682] mt-0.5">Admin</div>
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
              {currentUser.levelAdmin ?? 'Administrator'}
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

        {/* TAB 1: RINGKASAN SISTEM — Exact Match to Page 27 Bottom */}
        {activeTab === 'ringkasan' && (
          <div>
            <h1 className="text-2xl font-bold text-[#1A2421] tracking-tight">
              Ringkasan sistem
            </h1>
            <p className="mt-1 text-sm text-[#63706C]">
              Statistik penggunaan HealSpace.
            </p>

            {/* Top 3 Stat Cards — Exact Match to Page 27 Bottom */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white border border-[#E5E8E6] rounded-xl p-6">
                <div className="text-xs text-[#63706C]">Pengguna</div>
                <div className="mt-2 text-2xl font-bold text-[#1A2421] font-mono tabular-nums">
                  {users.length}
                </div>
              </div>

              <div className="bg-white border border-[#E5E8E6] rounded-xl p-6">
                <div className="text-xs text-[#63706C]">Janji temu</div>
                <div className="mt-2 text-2xl font-bold text-[#1A2421] font-mono tabular-nums">
                  {appointments.length}
                </div>
              </div>

              <div className="bg-white border border-[#E5E8E6] rounded-xl p-6">
                <div className="text-xs text-[#63706C]">Sesi konseling</div>
                <div className="mt-2 text-2xl font-bold text-[#1A2421] font-mono tabular-nums">
                  {sessions.length}
                </div>
              </div>
            </div>

            {/* Data Pengguna Card — Exact Match to Page 27 Bottom */}
            <div className="mt-6 bg-white border border-[#E5E8E6] rounded-xl p-6">
              <h2 className="text-base font-bold text-[#1A2421]">Data pengguna</h2>

              <div className="mt-4 divide-y divide-[#EEF1F0]">
                {nonAdminUsers.map((u) => (
                  <div
                    key={u.id}
                    className="py-3.5 first:pt-1 last:pb-1 grid grid-cols-1 sm:grid-cols-12 items-center gap-3"
                  >
                    <div className="sm:col-span-5">
                      <div className="text-sm font-semibold text-[#1A2421]">
                        {u.nama}
                      </div>
                      <div className="text-xs text-[#7A8682]">{u.email}</div>
                    </div>

                    <div className="sm:col-span-3 text-sm text-[#4A5753]">
                      {u.peran}
                    </div>

                    <div className="sm:col-span-2">
                      {u.statusAkun === AccountStatus.AKTIF ? (
                        <span className="px-2.5 py-1 text-xs font-medium bg-[#E2F2EE] text-[#215750] rounded-md">
                          Aktif
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-medium bg-[#EEF1F0] text-[#54615D] rounded-md">
                          Nonaktif
                        </span>
                      )}
                    </div>

                    <div className="sm:col-span-2 flex sm:justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const res = toggleUserStatus(u.id);
                          notify(res.ok, res.message);
                        }}
                        className="px-3.5 py-1.5 text-xs font-medium text-[#2E3A36] bg-white border border-[#CFD6D3] hover:border-[#2D736B] rounded-lg transition-colors whitespace-nowrap"
                      >
                        {u.statusAkun === AccountStatus.AKTIF
                          ? 'Nonaktifkan'
                          : 'Aktifkan'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-[#EEF1F0]">
                <button
                  type="button"
                  onClick={() => setActiveTab('edukasi')}
                  className="px-4 py-2 text-xs font-medium text-[#2E3A36] bg-white border border-[#CFD6D3] hover:border-[#2D736B] hover:text-[#2D736B] rounded-lg transition-colors whitespace-nowrap"
                >
                  Kelola konten edukasi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DATA PENGGUNA (UC19 & UC19a) */}
        {activeTab === 'pengguna' && (
          <div>
            <h1 className="text-2xl font-bold text-[#1A2421] tracking-tight">
              Manajemen data pengguna
            </h1>
            <p className="mt-1 text-sm text-[#63706C]">
              Kelola akun Mahasiswa serta Konselor dan pantau status aktivasi akun.
            </p>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 bg-white border border-[#E5E8E6] rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EEF1F0]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama, email, atau NIM..."
                    className="flex-1 px-3.5 py-2 text-sm bg-white border border-[#D7DDD9] rounded-lg focus:outline-none focus:border-[#2D736B]"
                  />
                  <div className="flex items-center gap-1 p-1 bg-[#F2F5F4] rounded-lg">
                    {(['Semua', UserRole.MAHASISWA, UserRole.KONSELOR] as const).map(
                      (r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRoleFilter(r)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                            roleFilter === r
                              ? 'bg-white text-[#1A2421]'
                              : 'text-[#63706C] hover:text-[#1A2421]'
                          }`}
                        >
                          {r}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="mt-3 divide-y divide-[#EEF1F0]">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm font-semibold text-[#1A2421]">
                          {u.nama}
                        </div>
                        <div className="text-xs text-[#63706C]">
                          {u.peran} · {u.email}
                          {u.nim ? ` · NIM ${u.nim}` : ''}
                          {u.spesialisasi ? ` · ${u.spesialisasi}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                            u.statusAkun === AccountStatus.AKTIF
                              ? 'bg-[#E2F2EE] text-[#215750]'
                              : 'bg-[#EEF1F0] text-[#54615D]'
                          }`}
                        >
                          {u.statusAkun}
                        </span>
                        {u.peran !== UserRole.ADMIN && (
                          <button
                            type="button"
                            onClick={() => {
                              const res = toggleUserStatus(u.id);
                              notify(res.ok, res.message);
                            }}
                            className="px-3.5 py-1.5 text-xs font-medium text-[#2E3A36] border border-[#CFD6D3] hover:border-[#2D736B] rounded-lg whitespace-nowrap"
                          >
                            {u.statusAkun === AccountStatus.AKTIF
                              ? 'Nonaktifkan'
                              : 'Aktifkan'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const res = createUserByAdmin({
                    nama: newNama,
                    email: newEmail,
                    peran: newRole,
                    spesialisasiOrNim: newAttr,
                  });
                  notify(res.ok, res.message);
                  if (res.ok) {
                    setNewNama('');
                    setNewEmail('');
                    setNewAttr('');
                  }
                }}
                className="lg:col-span-4 bg-white border border-[#E5E8E6] rounded-xl p-6 space-y-4"
              >
                <h2 className="text-base font-bold text-[#1A2421]">
                  Tambah akun baru
                </h2>
                <div>
                  <label className="block text-xs font-medium text-[#2E3A36] mb-1">
                    Peran pengguna
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#D7DDD9] rounded-lg"
                  >
                    <option value={UserRole.KONSELOR}>Konselor</option>
                    <option value={UserRole.MAHASISWA}>Mahasiswa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#2E3A36] mb-1">
                    Nama lengkap & gelar
                  </label>
                  <input
                    type="text"
                    value={newNama}
                    onChange={(e) => setNewNama(e.target.value)}
                    placeholder="Contoh: Clarissa Sondakh, M.Psi."
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#D7DDD9] rounded-lg focus:outline-none focus:border-[#2D736B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#2E3A36] mb-1">
                    Email resmi
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="nama@kampus.ac.id"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#D7DDD9] rounded-lg focus:outline-none focus:border-[#2D736B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#2E3A36] mb-1">
                    {newRole === UserRole.KONSELOR ? 'Bidang spesialisasi' : 'NIM'}
                  </label>
                  <input
                    type="text"
                    value={newAttr}
                    onChange={(e) => setNewAttr(e.target.value)}
                    placeholder={
                      newRole === UserRole.KONSELOR
                        ? 'Psikologi Klinis Dewasa Muda'
                        : '10502231055'
                    }
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#D7DDD9] rounded-lg focus:outline-none focus:border-[#2D736B]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-4 text-xs font-semibold text-white bg-[#2D736B] hover:bg-[#235B54] rounded-lg whitespace-nowrap"
                >
                  Simpan pengguna
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: KELOLA KONTEN EDUKASI (UC20) */}
        {activeTab === 'edukasi' && (
          <div>
            <h1 className="text-2xl font-bold text-[#1A2421] tracking-tight">
              Kelola konten edukasi
            </h1>
            <p className="mt-1 text-sm text-[#63706C]">
              Publikasikan panduan kesehatan mental yang dapat diakses langsung oleh Mahasiswa.
            </p>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleSaveArticle}
                className="lg:col-span-5 bg-white border border-[#E5E8E6] rounded-xl p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#1A2421]">
                    {editingArticleId ? 'Perbarui artikel' : 'Tambah artikel baru'}
                  </h2>
                  {editingArticleId && (
                    <button
                      type="button"
                      onClick={resetArticleForm}
                      className="text-xs text-[#63706C] hover:text-[#1A2421]"
                    >
                      Batal edit
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#2E3A36] mb-1">
                    Judul panduan
                  </label>
                  <input
                    type="text"
                    value={artJudul}
                    onChange={(e) => setArtJudul(e.target.value)}
                    placeholder="Judul artikel kesehatan mental"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#D7DDD9] rounded-lg focus:outline-none focus:border-[#2D736B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#2E3A36] mb-1">
                      Kategori
                    </label>
                    <input
                      type="text"
                      value={artKategori}
                      onChange={(e) => setArtKategori(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-[#D7DDD9] rounded-lg focus:outline-none focus:border-[#2D736B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#2E3A36] mb-1">
                      Status publikasi
                    </label>
                    <select
                      value={artStatus}
                      onChange={(e) =>
                        setArtStatus(e.target.value as 'Terbit' | 'Draf')
                      }
                      className="w-full px-3.5 py-2 text-sm bg-white border border-[#D7DDD9] rounded-lg"
                    >
                      <option value="Terbit">Terbit</option>
                      <option value="Draf">Draf</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#2E3A36] mb-1">
                    Ringkasan singkat
                  </label>
                  <input
                    type="text"
                    value={artRingkasan}
                    onChange={(e) => setArtRingkasan(e.target.value)}
                    placeholder="Ringkasan 1 kalimat..."
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#D7DDD9] rounded-lg focus:outline-none focus:border-[#2D736B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#2E3A36] mb-1">
                    Isi materi edukasi (pisahkan paragraf dengan baris baru)
                  </label>
                  <textarea
                    rows={5}
                    value={artBody}
                    onChange={(e) => setArtBody(e.target.value)}
                    placeholder="Tuliskan panduan lengkap..."
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#D7DDD9] rounded-lg focus:outline-none focus:border-[#2D736B]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#2D736B] hover:bg-[#235B54] rounded-lg whitespace-nowrap"
                >
                  {editingArticleId ? 'Simpan perubahan' : 'Publikasikan konten'}
                </button>
              </form>

              <div className="lg:col-span-7 bg-white border border-[#E5E8E6] rounded-xl p-6">
                <h2 className="text-base font-bold text-[#1A2421]">
                  Daftar artikel edukasi ({articles.length})
                </h2>

                <div className="mt-4 divide-y divide-[#EEF1F0]">
                  {articles.map((art) => (
                    <div key={art.id} className="py-4 first:pt-1 last:pb-1">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <div className="text-xs text-[#63706C]">
                            {art.kategori} · {art.durasiBaca} · Status: {art.statusPublikasi}
                          </div>
                          <div className="mt-1 text-sm font-bold text-[#1A2421]">
                            {art.judul}
                          </div>
                          <p className="mt-1 text-xs text-[#54615D]">
                            {art.ringkasan}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditArticle(art)}
                            className="px-3 py-1.5 text-xs font-medium text-[#2E3A36] border border-[#CFD6D3] hover:border-[#2D736B] rounded-lg whitespace-nowrap"
                          >
                            Ubah
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const res = deleteArticle(art.id);
                              notify(res.ok, res.message);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-[#2E3A36] border border-[#CFD6D3] hover:border-[#B54736] hover:text-[#B54736] rounded-lg whitespace-nowrap"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LAPORAN & STATISTIK + LOG AUDIT (UC21) */}
        {activeTab === 'laporan' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-[#1A2421] tracking-tight">
                  Laporan & statistik penggunaan
                </h1>
                <p className="mt-1 text-sm text-[#63706C]">
                  Agregasi data operasional janji temu, sesi konseling, skrining mandiri, dan log audit.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <select
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-[#D7DDD9] rounded-lg"
                >
                  <option value="Semester Ganjil 2026/2027">Semester Ganjil 2026/2027</option>
                  <option value="November 2026">November 2026</option>
                  <option value="Semua Waktu">Semua Waktu</option>
                </select>
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-[#2D736B] hover:bg-[#235B54] rounded-lg flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh CSV</span>
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-[#E5E8E6] rounded-xl p-5">
                <div className="text-xs text-[#63706C]">Mahasiswa terdaftar</div>
                <div className="mt-1.5 text-2xl font-bold text-[#1A2421] font-mono tabular-nums">
                  {users.filter((u) => u.peran === UserRole.MAHASISWA).length}
                </div>
              </div>
              <div className="bg-white border border-[#E5E8E6] rounded-xl p-5">
                <div className="text-xs text-[#63706C]">Janji dikonfirmasi</div>
                <div className="mt-1.5 text-2xl font-bold text-[#2D736B] font-mono tabular-nums">
                  {
                    appointments.filter(
                      (a) =>
                        a.status === AppointmentStatus.DIKONFIRMASI ||
                        a.status === AppointmentStatus.SELESAI
                    ).length
                  }
                </div>
              </div>
              <div className="bg-white border border-[#E5E8E6] rounded-xl p-5">
                <div className="text-xs text-[#63706C]">Pengisian skrining</div>
                <div className="mt-1.5 text-2xl font-bold text-[#1A2421] font-mono tabular-nums">
                  {screeningResults.length}
                </div>
              </div>
              <div className="bg-white border border-[#E5E8E6] rounded-xl p-5">
                <div className="text-xs text-[#63706C]">Kasus darurat</div>
                <div className="mt-1.5 text-2xl font-bold text-[#B54736] font-mono tabular-nums">
                  {emergencyRequests.length}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Distribusi Risiko Skrining */}
              <div className="lg:col-span-5 bg-white border border-[#E5E8E6] rounded-xl p-6">
                <h2 className="text-base font-bold text-[#1A2421]">
                  Distribusi tingkat risiko skrining
                </h2>
                <div className="mt-4 space-y-3.5">
                  {(
                    [
                      { label: 'Risiko Rendah', cat: RiskCategory.RENDAH, bar: 'bg-[#2D736B]' },
                      { label: 'Risiko Sedang', cat: RiskCategory.SEDANG, bar: 'bg-[#C2852C]' },
                      { label: 'Risiko Tinggi / Darurat', cat: RiskCategory.TINGGI, bar: 'bg-[#B54736]' },
                    ] as const
                  ).map((row) => {
                    const count = screeningResults.filter(
                      (r) => r.kategoriRisiko === row.cat
                    ).length;
                    const pct =
                      screeningResults.length > 0
                        ? Math.round((count / screeningResults.length) * 100)
                        : 0;
                    const widthClass =
                      count === 0
                        ? 'w-0'
                        : pct >= 75
                        ? 'w-full'
                        : pct >= 50
                        ? 'w-2/3'
                        : pct >= 25
                        ? 'w-1/3'
                        : 'w-1/6';
                    return (
                      <div key={row.label}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-[#2E3A36]">{row.label}</span>
                          <span className="font-mono tabular-nums text-[#63706C]">
                            {count} mahasiswa ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-[#EEF1F0] rounded-full overflow-hidden">
                          <div className={`h-full ${row.bar} ${widthClass} transition-all`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Log Audit Sistem (Sequence Diagram 5) */}
              <div className="lg:col-span-7 bg-white border border-[#E5E8E6] rounded-xl p-6">
                <h2 className="text-base font-bold text-[#1A2421]">
                  Log audit administratif & SIAKAD
                </h2>
                <div className="mt-4 divide-y divide-[#EEF1F0]">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="py-3 first:pt-1 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#1A2421]">
                          {log.aksi}
                        </span>
                        <span className="text-[11px] text-[#889490] font-mono tabular-nums">
                          {log.waktu}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-[#63706C]">
                        Aktor: {log.aktor} · Target: {log.target}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
