export enum UserRole {
  MAHASISWA = 'Mahasiswa',
  KONSELOR = 'Konselor',
  ADMIN = 'Admin',
}

export enum AccountStatus {
  AKTIF = 'Aktif',
  NONAKTIF = 'Nonaktif',
}

export enum AppointmentStatus {
  MENUNGGU = 'Menunggu',
  DIKONFIRMASI = 'Dikonfirmasi',
  DITOLAK = 'Ditolak',
  DIBATALKAN = 'Dibatalkan',
  JADWAL_ULANG = 'Jadwal Ulang',
  SELESAI = 'Selesai',
}

export enum SessionStatus {
  BERLANGSUNG = 'Berlangsung',
  SELESAI = 'Selesai',
}

export enum RiskCategory {
  RENDAH = 'Rendah',
  SEDANG = 'Sedang',
  TINGGI = 'Tinggi',
}

export enum EmergencyUrgency {
  SEDANG = 'Sedang',
  TINGGI = 'Tinggi',
  KRITIS = 'Kritis',
}

export enum EmergencyStatus {
  MENUNGGU = 'Menunggu',
  DITANGANI = 'Ditangani',
  SELESAI = 'Selesai',
}

export interface SIAKADStudentRecord {
  nim: string;
  namaLengkap: string;
  programStudi: string;
  fakultas: string;
  statusAkademik: 'Aktif' | 'Cuti' | 'Nonaktif';
}

export interface UserAccount {
  id: string;
  nama: string;
  email: string;
  password: string;
  noTelepon: string;
  peran: UserRole;
  statusAkun: AccountStatus;
  terakhirLogin: string;
  // Mahasiswa subtype attributes
  nim?: string;
  programStudi?: string;
  fakultas?: string;
  statusVerifikasi?: boolean;
  // Konselor subtype attributes
  spesialisasi?: string;
  statusKetersediaan?: 'Siaga' | 'Sibuk';
  // Admin subtype attributes
  levelAdmin?: string;
}

export interface AvailabilitySlot {
  id: string;
  idKonselor: string;
  namaKonselor: string;
  spesialisasi: string;
  hariTanggal: string; // e.g., "Sen, 4 Nov 2026"
  jamMulai: string;    // e.g., "09.00"
  jamSelesai: string;  // e.g., "10.00"
  status: 'Tersedia' | 'Dipesan';
}

export interface Appointment {
  id: string;
  idMahasiswa: string;
  namaMahasiswa: string;
  nimMahasiswa: string;
  idKonselor: string;
  namaKonselor: string;
  idJadwal: string;
  hariTanggal: string;
  jam: string;
  alasanTopik: string;
  status: AppointmentStatus;
  alasanPenolakan?: string;
  usulanJadwalId?: string;
  usulanHariTanggal?: string;
  usulanJam?: string;
  dibuatPada: string;
}

export interface SessionMessage {
  id: string;
  idSesi: string;
  idPengirim: string;
  namaPengirim: string;
  peranPengirim: UserRole;
  isiPesan: string;
  waktu: string;
}

export interface CounselingSession {
  id: string;
  idJanji: string;
  idMahasiswa: string;
  namaMahasiswa: string;
  idKonselor: string;
  namaKonselor: string;
  hariTanggal: string;
  jamSesi: string;
  topik: string;
  status: SessionStatus;
  waktuMulai: string;
  waktuSelesai?: string;
  tautanVideo?: string;
  catatanRahasiaKonselor?: string;
  catatanDiperbaruiPada?: string;
  rating?: number;
  ulasanMahasiswa?: string;
}

export interface ScreeningQuestion {
  id: number;
  teks: string;
}

export interface ScreeningResult {
  id: string;
  idMahasiswa: string;
  namaMahasiswa: string;
  skor: number;
  skorMaksimal: number;
  kategoriRisiko: RiskCategory;
  interpretasi: string;
  tanggal: string;
}

export interface EmergencyRequest {
  id: string;
  idMahasiswa: string;
  namaMahasiswa: string;
  nimMahasiswa: string;
  tingkatUrgensi: EmergencyUrgency;
  deskripsi: string;
  status: EmergencyStatus;
  idKonselorPenangan?: string;
  namaKonselorPenangan?: string;
  catatanPenanganan?: string;
  waktuDiajukan: string;
  waktuDitangani?: string;
}

export interface EducationArticle {
  id: string;
  judul: string;
  kategori: string;
  ringkasan: string;
  isiKonten: string[];
  durasiBaca: string;
  statusPublikasi: 'Terbit' | 'Draf';
  diperbaruiPada: string;
}

export interface MoodJournalEntry {
  id: string;
  idMahasiswa: string;
  suasanaHati: 'Tenang' | 'Baik' | 'Lelah' | 'Cemas' | 'Berat';
  catatanJurnal: string;
  tanggal: string;
}

export interface NotificationItem {
  id: string;
  idPenerima: string;
  judul: string;
  pesan: string;
  saluran: 'Sistem & Email SIAKAD' | 'Gateway SMS/Email';
  dibaca: boolean;
  waktu: string;
}

export interface AuditLogEntry {
  id: string;
  aktor: string;
  aksi: string;
  target: string;
  waktu: string;
}
