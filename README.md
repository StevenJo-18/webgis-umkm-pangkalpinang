# WebGIS UMKM Pangkalpinang

Aplikasi direktori dan peta lokasi UMKM Pangkalpinang. Front-end menggunakan React, Vite, Tailwind CSS, dan Leaflet; API menggunakan Express.js dengan MySQL 8 sebagai database utama. SQLite hanya tersedia sebagai mode lokal eksplisit.

## Fitur utama

- **Pengunjung/user:** melihat peta dan direktori, mencari dan memfilter UMKM, melihat detail, produk, rating, dan ulasan.
- **User terdaftar:** memberi rating/ulasan dan menghapus ulasannya sendiri.
- **Admin:** menambah, mengubah, dan menghapus data UMKM; mengelola produk; menghapus ulasan; melihat ringkasan serta status koneksi database.
- **Akses:** endpoint perubahan data dilindungi pemeriksaan role di sisi Express, bukan hanya disembunyikan dari UI.

## Persiapan MySQL

1. Pastikan MySQL 8 berjalan (misalnya melalui Laragon) dan import skema serta data demo dari [database_webgis_umkm_pangkalpinang.sql](./database_webgis_umkm_pangkalpinang.sql) melalui phpMyAdmin atau MySQL CLI:

   ```powershell
   cmd /c "mysql -u root -p < database_webgis_umkm_pangkalpinang.sql"
   ```
2. Skrip aman dijalankan ulang: tidak menghapus tabel/data dan tidak menggandakan kategori, data contoh, atau produknya. Skrip membuat tabel yang belum ada tetapi **tidak** mengubah struktur tabel lama yang tidak sesuai. Data usaha diberi nama `Contoh UMKM`, tanpa kontak, dan koordinat simulasi; verifikasi atau ganti sebelum publikasi. Jika memakai nama database selain default, sesuaikan `CREATE DATABASE` dan `USE` dengan `DB_NAME`.
3. Salin `.env.example` menjadi `.env`, lalu isi host, port, user, password, nama database, dan rahasia JWT Anda. Nilai database bawaan adalah `db_webgis_umkm_pangkalpinang`.

   ```powershell
   Copy-Item .env.example .env
   $bytes = New-Object byte[] 48
   $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
   $rng.GetBytes($bytes)
   [Convert]::ToBase64String($bytes)
   ```

   Tempel hasil nilai acak ke `JWT_SECRET` pada `.env`, lalu isi `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, dan `DB_NAME`.
4. Backend memeriksa keberadaan tabel dan kolom yang dipakai aplikasi serta memastikan `umkm.location` bertipe `POINT`. Setelah aplikasi berjalan, `GET /api/health` menunjukkan driver/database aktif.

Untuk memberi role admin, daftarkan akun terlebih dahulu lewat aplikasi, lalu jalankan di MySQL/phpMyAdmin:

```sql
UPDATE users SET role = 'admin' WHERE email = 'email-akun-anda@example.com';
```

Jangan gunakan kredensial atau akun contoh yang tidak ada di database MySQL Anda.

## Menjalankan di Windows / Laragon

Buka terminal pada folder proyek. Jalankan perintah-perintah berikut di terminal terpisah sesuai tahapnya:

**Terminal 1 — install dependency (sekali setelah checkout/perubahan dependency):**

```powershell
npm install
```

**Terminal 2 — jalankan aplikasi selama pengembangan:**

```powershell
npm run dev
```

Buka `http://localhost:3000`. Pastikan `.env` sudah diisi. Front-end React (dibangun oleh Vite) dan API Express berjalan dalam satu proses, sehingga tidak perlu menjalankan Vite dan Express pada terminal terpisah. Gunakan Node.js 20.19 atau lebih baru untuk Vite 8.

**Terminal 3 (opsional) — build front-end untuk production:**

```powershell
npm run build
```

Setelah build, jalankan server production dengan (di PowerShell):

```powershell
$env:NODE_ENV = "production"
npm start
```

## Mode SQLite lokal (opsional)

Ubah `DB_DRIVER="sqlite"` pada `.env` dan atur `SQLITE_PATH` bila diperlukan. Mode ini membuat database lokal secara otomatis; konfigurasi bawaan MySQL tidak akan beralih ke SQLite saat koneksi gagal (fallback hanya aktif bila `DB_STRICT="false"`).
