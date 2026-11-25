-- Skema dan data demo WebGIS UMKM Pangkalpinang
-- DBMS: MySQL 8.0+
-- Kontrak tabel/kolom mengikuti daftar required di MySQLRepository.init().
-- init() juga memeriksa bahwa umkm.location memiliki DATA_TYPE = point.
-- Data usaha di bawah adalah data SIMULASI, bukan direktori usaha terverifikasi.
-- Koordinat dibuat di sekitar Pangkalpinang dan harus diganti/diverifikasi sebelum publikasi.
--
-- Titik selalu disimpan sebagai POINT(longitude, latitude), SRID 4326,
-- sesuai pemanggilan ST_Longitude/ST_Latitude pada server/db/mysqlRepository.ts.

CREATE DATABASE IF NOT EXISTS db_webgis_umkm_pangkalpinang
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_webgis_umkm_pangkalpinang;

CREATE TABLE IF NOT EXISTS users (
  user_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  category_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  PRIMARY KEY (category_id),
  UNIQUE KEY uq_categories_name (category_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS umkm (
  umkm_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
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
  PRIMARY KEY (umkm_id),
  CONSTRAINT fk_umkm_category
    FOREIGN KEY (category_id)
    REFERENCES categories(category_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  SPATIAL INDEX idx_umkm_location (location),
  INDEX idx_umkm_business_name (business_name),
  INDEX idx_umkm_category_id (category_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  product_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  umkm_id INT UNSIGNED NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  description TEXT NULL,
  product_image VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (product_id),
  CONSTRAINT chk_product_price CHECK (price >= 0),
  CONSTRAINT fk_products_umkm
    FOREIGN KEY (umkm_id)
    REFERENCES umkm(umkm_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  INDEX idx_products_umkm_id (umkm_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reviews (
  review_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  umkm_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  review_text TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (review_id),
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

INSERT IGNORE INTO categories (category_name, description) VALUES
  ('Makanan Berat', 'UMKM yang menjual makanan utama atau makanan berat.'),
  ('Makanan Ringan', 'UMKM yang menjual camilan atau makanan ringan.'),
  ('Minuman', 'UMKM yang menjual minuman.'),
  ('Kue dan Roti', 'UMKM yang menjual kue, roti, dan makanan sejenis.'),
  ('Seafood', 'UMKM yang menjual makanan berbahan dasar hasil laut.');

-- Contoh berikut sengaja memakai nama "Contoh UMKM" dan tanpa nomor telepon
-- agar tidak dianggap sebagai informasi usaha/orang yang telah diverifikasi.
-- NOT EXISTS membuat seed ini aman dijalankan ulang.
INSERT INTO umkm
  (category_id, business_name, owner_name, address, location, phone_number, opening_hours, description)
SELECT
  c.category_id,
  sample.business_name,
  NULL,
  sample.address,
  ST_SRID(POINT(sample.longitude, sample.latitude), 4326),
  NULL,
  sample.opening_hours,
  sample.description
FROM (
  SELECT
    'Makanan Berat' AS category_name,
    'UMKM Lempah Kuning' AS business_name,
    'Area Taman Sari, Pangkalpinang (lokasi simulasi)' AS address,
    106.1169 AS longitude,
    -2.1316 AS latitude,
    '09.00-20.00 WIB' AS opening_hours,
    'Data demo kuliner khas Bangka. Verifikasi alamat dan koordinat sebelum digunakan.' AS description
  UNION ALL SELECT
    'Makanan Ringan',
    'UMKM Otak-Otak Bangka',
    'Area Rangkui, Pangkalpinang (lokasi simulasi)',
    106.1115,
    -2.1342,
    '10.00-18.00 WIB',
    'Data demo makanan ringan khas Bangka. Verifikasi alamat dan koordinat sebelum digunakan.'
  UNION ALL SELECT
    'Minuman',
    'UMKM Kopi dan Es',
    'Area Gabek, Pangkalpinang (lokasi simulasi)',
    106.1220,
    -2.1265,
    '08.00-21.00 WIB',
    'Data demo minuman. Verifikasi alamat dan koordinat sebelum digunakan.'
  UNION ALL SELECT
    'Kue dan Roti',
    'UMKM Kue Bangka',
    'Area Bukit Intan, Pangkalpinang (lokasi simulasi)',
    106.1210,
    -2.1430,
    '07.00-17.00 WIB',
    'Data demo kue tradisional. Verifikasi alamat dan koordinat sebelum digunakan.'
  UNION ALL SELECT
    'Seafood',
    'UMKM Seafood Pangkalpinang',
    'Area Pangkalbalam, Pangkalpinang (lokasi simulasi)',
    106.1030,
    -2.1080,
    '11.00-22.00 WIB',
    'Data demo hidangan laut. Verifikasi alamat dan koordinat sebelum digunakan.'
) AS sample
JOIN categories AS c ON c.category_name = sample.category_name
WHERE NOT EXISTS (
  SELECT 1
  FROM umkm AS existing
  WHERE existing.business_name = sample.business_name
);

INSERT INTO products (umkm_id, product_name, price, description)
SELECT u.umkm_id, sample.product_name, sample.price, sample.description
FROM (
  SELECT
    'UMKM Lempah Kuning' AS business_name,
    'Lempah Kuning Ikan' AS product_name,
    32000.00 AS price,
    'Produk demo; harga dan deskripsi perlu dikonfirmasi.' AS description
  UNION ALL SELECT
    'UMKM Otak-Otak Bangka',
    'Otak-Otak Ikan',
    15000.00,
    'Produk demo; harga dan deskripsi perlu dikonfirmasi.'
  UNION ALL SELECT
    'UMKM Kopi dan Es',
    'Es Kopi Susu',
    18000.00,
    'Produk demo; harga dan deskripsi perlu dikonfirmasi.'
  UNION ALL SELECT
    'UMKM Kue Bangka',
    'Kue Bangka',
    12000.00,
    'Produk demo; harga dan deskripsi perlu dikonfirmasi.'
  UNION ALL SELECT
    'UMKM Seafood Pangkalpinang',
    'Olahan Seafood',
    35000.00,
    'Produk demo; harga dan deskripsi perlu dikonfirmasi.'
) AS sample
JOIN umkm AS u ON u.business_name = sample.business_name
WHERE NOT EXISTS (
  SELECT 1
  FROM products AS existing
  WHERE existing.umkm_id = u.umkm_id
    AND existing.product_name = sample.product_name
);

-- Tampilkan nama dan tipe aktual untuk audit setelah skrip dijalankan.
-- umkm.location harus memiliki data_type = 'point'.
SELECT TABLE_NAME AS table_name,
       COLUMN_NAME AS column_name,
       DATA_TYPE AS data_type,
       COLUMN_TYPE AS column_type
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name IN ('users', 'categories', 'umkm', 'products', 'reviews')
ORDER BY FIELD(table_name, 'users', 'categories', 'umkm', 'products', 'reviews'),
         ordinal_position;
