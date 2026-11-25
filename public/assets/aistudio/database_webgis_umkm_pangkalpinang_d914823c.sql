-- =========================================================
-- PROYEK WEB GIS UMKM KULINER KOTA PANGKALPINANG
-- DBMS: MySQL 8.0
-- Basis rancangan: Proposal Proyek Steven Jo (24BD1)
-- Catatan:
--   1. Kolom location menggunakan POINT dengan SRID 4326.
--   2. Koordinat dimasukkan sebagai POINT(longitude, latitude).
--   3. Data UMKM, produk, pengguna, dan ulasan dapat ditambahkan
--      melalui phpMyAdmin atau aplikasi Web GIS.
-- =========================================================

CREATE DATABASE IF NOT EXISTS db_webgis_umkm_pangkalpinang
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_webgis_umkm_pangkalpinang;

-- =========================================================
-- 1. TABEL USERS
-- Menyimpan akun pengguna/admin aplikasi.
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
    user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================================================
-- 2. TABEL CATEGORIES
-- Menyimpan kategori UMKM kuliner.
-- =========================================================
CREATE TABLE IF NOT EXISTS categories (
    category_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL
) ENGINE=InnoDB;

-- =========================================================
-- 3. TABEL UMKM
-- Menyimpan profil dan lokasi usaha.
-- location: POINT(longitude, latitude), SRID 4326.
-- =========================================================
CREATE TABLE IF NOT EXISTS umkm (
    umkm_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id INT UNSIGNED NOT NULL,
    business_name VARCHAR(150) NOT NULL,
    owner_name VARCHAR(100) NULL,
    address TEXT NOT NULL,
    location POINT NOT NULL SRID 4326,
    phone_number VARCHAR(25) NULL,
    opening_hours VARCHAR(150) NULL,
    description TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_umkm_category
        FOREIGN KEY (category_id)
        REFERENCES categories(category_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    SPATIAL INDEX idx_umkm_location (location),
    INDEX idx_umkm_business_name (business_name),
    INDEX idx_umkm_category_id (category_id)
) ENGINE=InnoDB;

-- =========================================================
-- 4. TABEL PRODUCTS
-- Menyimpan produk yang dijual oleh setiap UMKM.
-- =========================================================
CREATE TABLE IF NOT EXISTS products (
    product_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    umkm_id INT UNSIGNED NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    description TEXT NULL,
    product_image VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_product_price CHECK (price >= 0),
    CONSTRAINT fk_products_umkm
        FOREIGN KEY (umkm_id)
        REFERENCES umkm(umkm_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    INDEX idx_products_umkm_id (umkm_id)
) ENGINE=InnoDB;

-- =========================================================
-- 5. TABEL REVIEWS
-- Menyimpan ulasan dan rating pengguna terhadap UMKM.
-- =========================================================
CREATE TABLE IF NOT EXISTS reviews (
    review_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    umkm_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    rating TINYINT UNSIGNED NOT NULL,
    review_text TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT fk_reviews_umkm
        FOREIGN KEY (umkm_id)
        REFERENCES umkm(umkm_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_reviews_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    INDEX idx_reviews_umkm_id (umkm_id),
    INDEX idx_reviews_user_id (user_id)
) ENGINE=InnoDB;

-- =========================================================
-- DATA AWAL KATEGORI
-- Kategori ini merupakan contoh awal dan dapat disesuaikan.
-- =========================================================
INSERT IGNORE INTO categories (category_name, description) VALUES
('Makanan Berat', 'UMKM yang menjual makanan utama atau makanan berat.'),
('Makanan Ringan', 'UMKM yang menjual camilan atau makanan ringan.'),
('Minuman', 'UMKM yang menjual minuman.'),
('Kue dan Roti', 'UMKM yang menjual kue, roti, dan makanan sejenis.'),
('Seafood', 'UMKM yang menjual makanan berbahan dasar hasil laut.');

-- =========================================================
-- CONTOH PENAMBAHAN DATA (JALANKAN SETELAH MENGISI DATA NYATA)
-- Jangan gunakan koordinat contoh untuk lokasi usaha sebenarnya.
--
-- INSERT INTO users (full_name, email, password_hash, role)
-- VALUES ('Nama Admin', 'admin@example.com', '<HASH_PASSWORD>', 'admin');
--
-- INSERT INTO umkm
-- (category_id, business_name, owner_name, address, location,
--  phone_number, opening_hours, description)
-- VALUES
-- (1, 'Nama UMKM', 'Nama Pemilik', 'Alamat lengkap, Pangkalpinang',
--  ST_SRID(POINT(106.XXXX, -2.XXXX), 4326),
--  '08xxxxxxxxxx', '08.00-21.00', 'Deskripsi usaha');
--
-- Ganti 106.XXXX dan -2.XXXX dengan longitude dan latitude
-- hasil pengambilan data lokasi UMKM yang sebenarnya.
--
-- INSERT INTO products (umkm_id, product_name, price, description)
-- VALUES (1, 'Nama Produk', 15000.00, 'Deskripsi produk');
--
-- INSERT INTO reviews (umkm_id, user_id, rating, review_text)
-- VALUES (1, 1, 5, 'Contoh ulasan pengguna.');
-- =========================================================

-- =========================================================
-- CONTOH QUERY UNTUK APLIKASI WEB GIS
-- =========================================================

-- A. Menampilkan daftar UMKM beserta kategori.
-- SELECT u.umkm_id, u.business_name, u.owner_name, u.address,
--        c.category_name, u.phone_number, u.opening_hours,
--        u.description
-- FROM umkm AS u
-- JOIN categories AS c ON c.category_id = u.category_id
-- ORDER BY u.business_name;

-- B. Mengambil koordinat UMKM untuk ditampilkan pada peta.
-- SELECT umkm_id, business_name,
--        ST_Longitude(location) AS longitude,
--        ST_Latitude(location) AS latitude
-- FROM umkm;

-- C. Menampilkan produk berdasarkan UMKM.
-- SELECT p.product_id, p.product_name, p.price, p.description,
--        u.business_name
-- FROM products AS p
-- JOIN umkm AS u ON u.umkm_id = p.umkm_id
-- WHERE u.umkm_id = 1;

-- D. Menampilkan ulasan dan nama pengguna.
-- SELECT r.review_id, u.business_name, usr.full_name,
--        r.rating, r.review_text, r.created_at
-- FROM reviews AS r
-- JOIN umkm AS u ON u.umkm_id = r.umkm_id
-- JOIN users AS usr ON usr.user_id = r.user_id
-- ORDER BY r.created_at DESC;

-- E. Menghitung rata-rata rating setiap UMKM.
-- SELECT u.umkm_id, u.business_name,
--        ROUND(AVG(r.rating), 2) AS average_rating,
--        COUNT(r.review_id) AS total_reviews
-- FROM umkm AS u
-- LEFT JOIN reviews AS r ON r.umkm_id = u.umkm_id
-- GROUP BY u.umkm_id, u.business_name;
