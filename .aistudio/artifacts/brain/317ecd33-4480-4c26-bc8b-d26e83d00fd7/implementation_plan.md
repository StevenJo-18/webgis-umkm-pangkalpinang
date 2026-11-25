# Web GIS Lokasi UMKM Kuliner Kota Pangkalpinang

Aplikasi Web GIS berbasis Node.js (Express.js), React, dan Tailwind CSS untuk memetakan lokasi UMKM kuliner di Kota Pangkalpinang berdasarkan skema database `db_webgis_umkm_pangkalpinang`. Seluruh akses data melalui API Express.js yang terstruktur dengan pola *Repository Adapter* agar berjalan langsung menggunakan SQLite lokal di preview dan siap dikoneksikan ke MySQL 8.0 melalui konfigurasi environment.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Seluruh preferensi utama telah dikonfirmasi melalui jawaban klarifikasi Anda. Silakan tinjau ringkasan keputusan di bawah ini dan klik setujui untuk memulai proses pembuatan kode.

- **Mesin Peta Interaktif**: **Leaflet dengan peta OpenStreetMap** berpusat di Kota Pangkalpinang (`-2.1316, 106.1169`), mendukung marker interaktif berbasis kategori dan pengambilan koordinat klik peta.
- **Koneksi Database Express.js**: **Repository MySQL siap pakai + SQLite lokal otomatis** (`DB_DRIVER=mysql` untuk MySQL 8.0 menggunakan `mysql2` dan query spasial `POINT SRID 4326`; `DB_DRIVER=sqlite` sebagai fallback otomatis di preview dengan skema & data awal identik).
- **Cakupan Fitur & Peran**: **Peta, filter kategori, ulasan user, dan CRUD admin** (mencakup Login/Register untuk peran `user` & `admin`, penulisan ulasan oleh `user`, serta pengelolaan UMKM dan produk oleh `admin`).
- **Arah Visual Antarmuka**: **Peta GIS terang modern bernuansa kuliner hangat** dengan kanvas netral terang, aksen rempah/kuliner hangat yang terkontrol, serta tipografi tabular untuk koordinat dan harga.

---

### 1. Overview & Core Concept

- **What It Does**: Menghadirkan sistem informasi geografis berbasis web untuk menemukan sebaran UMKM kuliner Kota Pangkalpinang di peta interaktif, melihat detail usaha beserta daftar menu produk dan ulasan pelanggan, mendaftar/masuk akun, serta mengelola data UMKM dan produk melalui panel admin.
- **Target Audience / Persona**:
  - **Pengunjung & Pelanggan Kuliner**: Menjelajahi peta Pangkalpinang, mencari usaha berdasarkan nama atau kategori (*Makanan Berat*, *Makanan Ringan*, *Minuman*, *Kue dan Roti*, *Seafood*), melihat harga menu, dan membaca ulasan.
  - **Pengguna Terdaftar (`user`)**: Melakukan Login/Register untuk memberikan rating (1–5) dan ulasan pada UMKM.
  - **Administrator (`admin`)**: Mengelola data UMKM (tambah, ubah, hapus, serta menentukan koordinat `POINT(longitude, latitude)` langsung dari peta) dan mengelola katalog produk per UMKM.
- **Key Value**: Memberikan pengalaman Web GIS yang responsif dan siap pakai sekarang, sekaligus memiliki lapisan API Express.js dan adapter MySQL yang bersih sehingga dapat dihubungkan ke database MySQL lokal/produksi tanpa merombak frontend maupun logika route.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Eksplorasi Peta & Filter Kategori**: Saat halaman dibuka, pengguna melihat split-workspace berisi panel daftar & filter kategori di sisi kiri dan peta interaktif Leaflet Pangkalpinang di sisi kanan. Pencarian nama usaha dan tombol filter kategori langsung menyaring daftar sekaligus memperbarui marker di peta.
  2. **Inspeksi Detail UMKM, Produk & Ulasan**: Mengklik salah satu kartu UMKM atau pin pada peta memusatkan kamera peta ke titik usaha dan membuka panel detail berisi alamat lengkap, nama pemilik, jam buka, nomor telepon, koordinat geografis, daftar menu produk beserta harga, rata-rata rating, dan ulasan pengguna.
  3. **Login / Register & Kirim Ulasan**: Tombol **Masuk / Daftar** di bar atas membuka modal autentikasi dua tab (*Masuk* dan *Daftar*). Setelah terautentikasi, pengguna dapat langsung mengirim rating bintang dan komentar ulasan pada panel detail UMKM.
  4. **Manajemen Data Admin (CRUD + Pemilih Titik Peta)**: Ketika masuk sebagai `admin`, menu **Kelola Data** muncul di navigasi. Admin dapat membuka tabel ringkas seluruh UMKM, menambah atau mengedit UMKM dengan mengklik langsung lokasi pada peta picker untuk mengisi `latitude` dan `longitude`, serta menambah atau menghapus produk milik UMKM tersebut.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: **Peta GIS terang modern bernuansa kuliner hangat** — memadukan keterbacaan peta geospasial yang bersih dengan sentuhan warna kuliner khas Bangka yang ramah.
  - *Color Palette & Mood* (Disiplin 60-30-10):
    - `--background` (60%): `#F8FAFC` (Kanvas terang netral yang menjaga fokus pada peta OpenStreetMap dan daftar usaha).
    - `--surface` (30%): `#FFFFFF` dengan garis batas halus `#E2E8F0`, teks utama `#0F172A`, dan teks sekunder `#475569`.
    - `--primary` / `--accent` (10%): `#B45309` (Amber rempah hangat untuk tombol utama, tab aktif, dan marker fokus) serta `#D97706` untuk indikator rating bintang.
  - *Typography & Hierarchy*: Menggunakan `Plus Jakarta Sans` (bobot 600–700) untuk judul dan navigasi, `DM Sans` (14px–16px) untuk teks deskripsi dan ulasan, serta `JetBrains Mono` (`tabular-nums`) untuk koordinat geografis (`-2.1316, 106.1169`), harga Rupiah, dan jam operasional.
  - *Component Styling & Layout*:
    - **Top Bar Contract (3 Zona)**: Nama aplikasi tunggal di kiri (*WebGIS UMKM Pangkalpinang*), tautan navigasi ringkas di tengah (*Peta Lokasi*, *Direktori*, dan *Kelola Data* khusus admin), serta 1 aksi utama di kanan (*Masuk / Daftar* atau menu akun *Keluar*).
    - **Zero-Pill Metadata**: Nama kategori, rata-rata rating, dan jam operasional ditampilkan sebagai teks bersih dengan pemisah `·` tanpa lencana kapsul bertumpuk.
    - **Single-Elevation Depth**: Panel dan kartu menggunakan garis batas tipis `1px` tanpa kartu bersarang di dalam kartu.

- **Interactive Feedback & Motion**:
  - Animasi buka/tutup panel detail, modal autentikasi, dan pergantian tampilan dibatasi $\le 200\text{ms}$ menggunakan `transform` dan `opacity`.
  - Dilengkapi skeleton loading saat mengambil data API, tampilan state kosong dengan tombol reset filter, validasi form real-time, serta notifikasi toast untuk setiap aksi sukses atau galat.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Pola Database Repository Adapter (`mysql2` + SQLite Lokal)**
  - *Chosen Approach*: Menyediakan antarmuka repository tunggal di server Express.js dengan dua driver: adapter **MySQL 8.0** (`mysql2/promise` yang menggunakan fungsi spasial `ST_SRID(POINT(?, ?), 4326)`, `ST_Longitude(location)`, `ST_Latitude(location)`) dan adapter **SQLite** (`better-sqlite3` lokal yang otomatis membuat tabel dan mengisi data awal 5 kategori serta UMKM kuliner representatif di Kota Pangkalpinang).
  - *Why*: Memastikan aplikasi langsung berfungsi penuh di preview tanpa memerlukan server MySQL eksternal, sekaligus memastikan seluruh query dan struktur kolom 100% kompatibel saat Anda menghubungkan server MySQL `db_webgis_umkm_pangkalpinang` melalui `.env`.
  - *Alternatives Considered*: Koneksi MySQL tunggal tanpa fallback (tidak dapat dijalankan di preview) atau penyimpanan memori statis (tidak persisten dan tidak terstruktur untuk koneksi database nyata).

- **Decision 2: Leaflet + OpenStreetMap untuk Web GIS**
  - *Chosen Approach*: Merender peta interaktif menggunakan `leaflet` dengan layer OpenStreetMap dan marker SVG terklasifikasi per kategori.
  - *Why*: Bebas API key, sangat ringan, mendukung interaksi klik peta untuk memilih titik koordinat UMKM secara presisi di Kota Pangkalpinang.
  - *Alternatives Considered*: Google Maps Platform (membutuhkan kunci API dan aktivasi penagihan).

- **Decision 3: Autentikasi Aman Sesuai Skema Tabel `users`**
  - *Chosen Approach*: Hashing password menggunakan fungsi kriptografi standar (`scrypt` dengan salt acak / `bcryptjs`) yang disimpan pada kolom `password_hash`, serta sesi berbasis token JWT/HMAC bertanda tangan di HTTP-only cookie untuk memvalidasi peran `admin` dan `user`.
  - *Why*: Menjaga konsistensi penuh dengan kolom `user_id`, `full_name`, `email`, `password_hash`, `role` pada tabel `users` dan melindungi endpoint sensitif admin.
  - *Alternatives Considered*: Menyimpan status login di state browser saja (rentan dimanipulasi dan tidak menguji alur API Express.js).

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Tailwind + Leaflet)                │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Top Bar: Brand  │  Nav (Peta / Direktori / Kelola*)  │  Auth CTA  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│           │                          │                        │         │
│           ▼                          ▼                        ▼         │
│  ┌─────────────────┐     ┌──────────────────────┐    ┌───────────────┐  │
│  │ Sidebar Katalog │◄───►│   Peta Leaflet OSM   │    │ Modal Login / │  │
│  │ Search & Filter │     │  Marker & Popup UMKM │    │ Register      │  │
│  └────────┬────────┘     └──────────┬───────────┘    └───────────────┘  │
│           │                         │                                   │
│           └────────────┬────────────┘                                   │
│                        ▼                                                │
│          ┌───────────────────────────┐    ┌──────────────────────────┐  │
│          │ Drawer Detail UMKM        │    │ Workspace Admin CRUD     │  │
│          │ (Profil, Produk, Ulasan)  │    │ (Form UMKM + Map Picker) │  │
│          └─────────────┬─────────────┘    └────────────┬─────────────┘  │
└────────────────────────┼───────────────────────────────┼────────────────┘
                         │     Express REST API (/api/*) │
                         ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     BACKEND SERVER (Express.js + Vite)                  │
│                                                                         │
│  ┌──────────────────┐  ┌────────────────────┐  ┌─────────────────────┐  │
│  │ Auth & RBAC Guard│  │ API Route Handlers │  │ Request Validator & │  │
│  │ (Token + Roles)  │  │ /auth, /categories │  │ Error Middleware    │  │
│  └────────┬─────────┘  │ /umkm, /products,  │  └─────────────────────┘  │
│           │            │ /reviews, /health  │                           │
│           │            └─────────┬──────────┘                           │
│           └──────────────────────┼──────────────────────────────────────┤
│                                  ▼                                      │
│                   ┌──────────────────────────────┐                      │
│                   │  Database Repository Layer   │                      │
│                   │  (Unified Async Interface)   │                      │
│                   └──────┬────────────────┬──────┘                      │
│                          │                │                             │
│         DB_DRIVER=mysql  ▼                ▼  DB_DRIVER=sqlite (Default) │
│              ┌───────────────────┐  ┌───────────────────┐               │
│              │ MySQL 8.0 Adapter │  │  SQLite Adapter   │               │
│              │ (mysql2 + Spatial │  │  (Auto-Init Schema│               │
│              │  POINT SRID 4326) │  │   & Seed Data)    │               │
│              └───────────────────┘  └───────────────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  Seluruh model mengikuti skema `db_webgis_umkm_pangkalpinang`:
  - **`users`**: `user_id`, `full_name`, `email`, `password_hash`, `role` (`'admin' | 'user'`), `created_at`.
  - **`categories`**: `category_id`, `category_name`, `description` (5 kategori bawaan: *Makanan Berat*, *Makanan Ringan*, *Minuman*, *Kue dan Roti*, *Seafood*).
  - **`umkm`**: `umkm_id`, `category_id`, `business_name`, `owner_name`, `address`, `longitude`, `latitude` (disimpan sebagai `POINT(longitude, latitude) SRID 4326` pada MySQL), `phone_number`, `opening_hours`, `description`, `created_at`, `updated_at`, serta agregasi `average_rating` dan `total_reviews`.
  - **`products`**: `product_id`, `umkm_id`, `product_name`, `price`, `description`, `product_image`, `created_at`.
  - **`reviews`**: `review_id`, `umkm_id`, `user_id`, `rating` (1–5), `review_text`, `created_at`, serta `full_name` pengulas.

- **Interactive Component & State Mapping**:
  - **Pencarian & Filter Kategori**: Input pencarian dan pilihan kategori memperbarui parameter query (`GET /api/umkm?categoryId=...&q=...`) serta menyelaraskan marker yang tampil di peta Leaflet.
  - **Pemilihan Marker & Drawer Detail**: Klik marker atau item sidebar memanggil `GET /api/umkm/:id` yang mengembalikan profil UMKM, array `products`, dan array `reviews`, sambil menggeser pusat peta secara halus ke titik koordinat UMKM.
  - **Alur Register & Login (`/api/auth/*`)**:
    - Tab **Daftar** mengirim `full_name`, `email`, dan `password` ke `POST /api/auth/register` dan otomatis masuk sebagai `user`.
    - Tab **Masuk** mengirim `email` dan `password` ke `POST /api/auth/login`, menerima cookie sesi + data profil pengguna, serta membuka akses tab **Kelola Data** bila `role === 'admin'`.
  - **Alur Ulasan Pengguna**: Pengguna yang login dapat mengirim rating (1–5) dan teks ulasan melalui `POST /api/umkm/:id/reviews`, yang segera memperbarui daftar ulasan serta rata-rata rating UMKM.
  - **Alur Admin CRUD & Pemilih Titik Peta**: Pada tampilan **Kelola Data**, admin dapat membuat/memperbarui/menghapus data UMKM (`POST /api/umkm`, `PUT /api/umkm/:id`, `DELETE /api/umkm/:id`) serta menambah/menghapus produk (`POST /api/umkm/:id/products`, `DELETE /api/products/:productId`). Formulir UMKM menyertakan peta interaktif mini yang mengisi nilai `latitude` dan `longitude` secara otomatis saat admin mengklik lokasi di Pangkalpinang.

- **Environment Readiness for Future MySQL Connection**:
  - Menyediakan `.env.example` terdokumentasi (`DB_DRIVER`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`) dan endpoint `GET /api/health` yang melaporkan adapter database yang sedang terhubung (`sqlite` atau `mysql`).
