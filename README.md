<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/aeea8a5b-ee29-4660-bbc3-c8ab00796ac2

## Menjalankan Secara Lokal

**Prasyarat:** Node.js dan PostgreSQL.

1. Jalankan `npm install`.
2. Buat database `healspace` dan isi `DATABASE_URL` di `.env`.
3. Jalankan `npm run db:schema`. Jika belum ada data aplikasi, perintah ini membuat seed demo dan menyimpan hash kata sandi; daftar SIAKAD demo diselaraskan setiap kali perintah dijalankan.
4. Jalankan `npm run server` di terminal pertama.
5. Jalankan `npm run dev` di terminal kedua, lalu buka `http://localhost:3000`.

Pemeriksaan koneksi tersedia di `http://localhost:3000/api/health`.

## Akun Demo

Semua akun seed lokal menggunakan kata sandi `password123`:

- Mahasiswa: `cheiven.walangitan@kampus.ac.id`
- Konselor: `maya.ratnasari@kampus.ac.id`
- Admin: `admin@kampus.ac.id`

Gunakan akun demo hanya untuk pengujian lokal dan ganti sebelum penggunaan selain demo.

## Batasan Implementasi

Login membuat sesi server dengan cookie `HttpOnly`; endpoint state memerlukan sesi dan memfilter data menurut peran. Data akun seed dibuat server-side, dan kata sandi disimpan sebagai hash scrypt. Registrasi memeriksa NIM pada dataset SIAKAD seed lokal.

Untuk saat ini, data domain aplikasi masih disimpan sebagai satu snapshot JSONB di `healspace_app_state`. Tabel relasional lain di [schema.sql](database/schema.sql) belum menjadi sumber data CRUD. SIAKAD, notifikasi email/SMS, dan tautan video masih berupa data/demo lokal.

Jurnal, hasil skrining, permintaan darurat, dan catatan konseling adalah data sensitif. Jangan gunakan data nyata atau deploy layanan ini sebelum penyimpanan relasional, integrasi resmi, pengujian keamanan, dan perlindungan operasionalnya selesai.
"# sayang-sir-george" 
