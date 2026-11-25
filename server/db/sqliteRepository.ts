import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import type {
  Category,
  Product,
  Review,
  UmkmDetail,
  UmkmSummary,
  User,
} from '../../src/types/index.js';
import type {
  CreateProductInput,
  CreateReviewInput,
  CreateUmkmInput,
  CreateUserInput,
  DatabaseRepository,
  UmkmFilterParams,
  UpdateUmkmInput,
  UserRecord,
} from './repository.js';

export class SQLiteRepository implements DatabaseRepository {
  readonly driver = 'sqlite' as const;
  readonly databaseName = 'db_webgis_umkm_pangkalpinang (SQLite Lokal)';
  private db: Database.Database;

  constructor(private readonly dbPath: string) {
    const resolved = path.resolve(dbPath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    this.db = new Database(resolved);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  async init(): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS categories (
        category_id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_name TEXT NOT NULL UNIQUE,
        description TEXT NULL
      );

      CREATE TABLE IF NOT EXISTS umkm (
        umkm_id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        business_name TEXT NOT NULL,
        owner_name TEXT NULL,
        address TEXT NOT NULL,
        longitude REAL NOT NULL,
        latitude REAL NOT NULL,
        phone_number TEXT NULL,
        opening_hours TEXT NULL,
        description TEXT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (category_id) REFERENCES categories(category_id) ON UPDATE CASCADE ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS products (
        product_id INTEGER PRIMARY KEY AUTOINCREMENT,
        umkm_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        price REAL NOT NULL DEFAULT 0 CHECK (price >= 0),
        description TEXT NULL,
        product_image TEXT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (umkm_id) REFERENCES umkm(umkm_id) ON UPDATE CASCADE ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS reviews (
        review_id INTEGER PRIMARY KEY AUTOINCREMENT,
        umkm_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        review_text TEXT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (umkm_id) REFERENCES umkm(umkm_id) ON UPDATE CASCADE ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_umkm_business_name ON umkm(business_name);
      CREATE INDEX IF NOT EXISTS idx_umkm_category_id ON umkm(category_id);
      CREATE INDEX IF NOT EXISTS idx_products_umkm_id ON products(umkm_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_umkm_id ON reviews(umkm_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
    `);

    this.seedInitialData();
  }

  private seedInitialData(): void {
    const categoryCount = (this.db.prepare('SELECT COUNT(*) AS cnt FROM categories').get() as { cnt: number }).cnt;
    if (categoryCount === 0) {
      const insertCat = this.db.prepare('INSERT INTO categories (category_name, description) VALUES (?, ?)');
      const categoriesSeed: [string, string][] = [
        ['Makanan Berat', 'UMKM yang menjual makanan utama atau makanan berat.'],
        ['Makanan Ringan', 'UMKM yang menjual camilan atau makanan ringan.'],
        ['Minuman', 'UMKM yang menjual minuman.'],
        ['Kue dan Roti', 'UMKM yang menjual kue, roti, dan makanan sejenis.'],
        ['Seafood', 'UMKM yang menjual makanan berbahan dasar hasil laut.'],
      ];
      for (const [name, desc] of categoriesSeed) {
        insertCat.run(name, desc);
      }
    }

    const userCount = (this.db.prepare('SELECT COUNT(*) AS cnt FROM users').get() as { cnt: number }).cnt;
    if (userCount === 0) {
      const insertUser = this.db.prepare(
        'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)'
      );
      const adminHash = bcrypt.hashSync('admin123', 10);
      const userHash = bcrypt.hashSync('user123', 10);
      insertUser.run('Admin WebGIS Pangkalpinang', 'admin@umkmpkp.id', adminHash, 'admin');
      insertUser.run('Rizky Pratama', 'warga@umkmpkp.id', userHash, 'user');
    }

    const umkmCount = (this.db.prepare('SELECT COUNT(*) AS cnt FROM umkm').get() as { cnt: number }).cnt;
    if (umkmCount === 0) {
      const insertUmkm = this.db.prepare(`
        INSERT INTO umkm (category_id, business_name, owner_name, address, longitude, latitude, phone_number, opening_hours, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertProduct = this.db.prepare(`
        INSERT INTO products (umkm_id, product_name, price, description)
        VALUES (?, ?, ?, ?)
      `);
      const insertReview = this.db.prepare(`
        INSERT INTO reviews (umkm_id, user_id, rating, review_text)
        VALUES (?, ?, ?, ?)
      `);

      const seedList = [
        {
          category_id: 1,
          business_name: 'Warung Lempah Kuning Muara Taman Sari',
          owner_name: 'Ibu Rosmala',
          address: 'Jl. Merdeka No. 18, Taman Sari, Kota Pangkalpinang',
          longitude: 106.1137,
          latitude: -2.1292,
          phone_number: '0812-7104-8821',
          opening_hours: '09.00 - 20.00 WIB',
          description: 'Sajian khas Bangka lempah kuning ikan tenggiri segar dengan kuah kunyit asam nanas yang autentik.',
          products: [
            { name: 'Lempah Kuning Ikan Tenggiri', price: 32000, desc: 'Potongan ikan tenggiri segar dengan kuah rempah nanas.' },
            { name: 'Lempah Darat Keladi', price: 22000, desc: 'Sayur tradisional Bangka dengan terasi lokal pilihan.' },
            { name: 'Nasi Putih + Sambal Rusip', price: 12000, desc: 'Nasi hangat dengan sambal rusip khas Pangkalpinang.' },
          ],
          reviews: [
            { userId: 2, rating: 5, text: 'Kuah lempah kuningnya segar dan bumbu rempahnya terasa pas.' },
            { userId: 1, rating: 5, text: 'Lokasi strategis dekat Taman Merdeka, pelayanan cepat.' },
          ],
        },
        {
          category_id: 1,
          business_name: 'Mie Bangka Asli Ko Acung Rangkui',
          owner_name: 'Hendra Wijaya',
          address: 'Jl. Jenderal Sudirman No. 114, Rangkui, Kota Pangkalpinang',
          longitude: 106.1162,
          latitude: -2.1342,
          phone_number: '0813-6782-1190',
          opening_hours: '06.30 - 15.00 WIB',
          description: 'Mie Bangka racikan rumahan dengan kecap manis khas, tauge segar, dan bakso ikan tenggiri.',
          products: [
            { name: 'Mie Bangka Komplit', price: 25000, desc: 'Mie kuning kenyal dengan ayam cincang, bakso ikan, dan pangsit.' },
            { name: 'Bihun Kuah Bakso Ikan', price: 23000, desc: 'Kuah kaldu ikan bening dengan bakso ikan buatan sendiri.' },
          ],
          reviews: [
            { userId: 2, rating: 5, text: 'Menu sarapan favorit setiap akhir pekan di Rangkui.' },
          ],
        },
        {
          category_id: 2,
          business_name: 'Otak-Otak & Kemplang Ibu Lilis Batin Tikal',
          owner_name: 'Lilis Suryani',
          address: 'Jl. Masjid Jamik No. 42, Batin Tikal, Kota Pangkalpinang',
          longitude: 106.1189,
          latitude: -2.1258,
          phone_number: '0852-7309-4410',
          opening_hours: '08.00 - 21.00 WIB',
          description: 'Pusat jajanan otak-otak daun pisang panggang arang dan kemplang ikan tenggiri asli Bangka.',
          products: [
            { name: 'Otak-Otak Daun Isi 10', price: 30000, desc: 'Dipanggang arang lengkap dengan cuko tauco dan cuka merah.' },
            { name: 'Kemplang Panggang 250g', price: 35000, desc: 'Kerupuk ikan tenggiri panggang renyah tanpa pengawet.' },
            { name: 'Getas Ikan Tenggiri', price: 28000, desc: 'Camilan gurih bulat khas oleh-oleh Pangkalpinang.' },
          ],
          reviews: [
            { userId: 2, rating: 4, text: 'Otak-otaknya masih hangat saat dibeli, cuko tauconya mantap.' },
          ],
        },
        {
          category_id: 3,
          business_name: 'Kedai Kopi & Es Kacang Merah Merdeka',
          owner_name: 'Budi Santoso',
          address: 'Jl. Trem No. 9, Bukit Merapin, Gerunggang, Kota Pangkalpinang',
          longitude: 106.1035,
          latitude: -2.1398,
          phone_number: '0811-7180-332',
          opening_hours: '07.00 - 22.00 WIB',
          description: 'Kedai kopi klasik bergaya kopitiam Bangka dengan sajian es kacang merah susu dan roti bakar srikaya.',
          products: [
            { name: 'Kopi Susu Klasik Bangka', price: 14000, desc: 'Seduhan kopi robusta tradisional disaring kain.' },
            { name: 'Es Kacang Merah Spesial', price: 18000, desc: 'Kacang merah empuk dengan sirup gula merah dan susu kental.' },
            { name: 'Teh Tarik Pandan', price: 15000, desc: 'Minuman teh susu harum pandan dingin atau hangat.' },
          ],
          reviews: [
            { userId: 2, rating: 5, text: 'Tempat nyaman untuk bersantai sore sambil minum es kacang merah.' },
          ],
        },
        {
          category_id: 4,
          business_name: 'Martabak & Hok Lo Pan Sudirman',
          owner_name: 'Taufik Hidayat',
          address: 'Jl. Soekarno Hatta Km. 4, Bukit Intan, Kota Pangkalpinang',
          longitude: 106.1268,
          latitude: -2.1489,
          phone_number: '0821-8890-5567',
          opening_hours: '16.00 - 23.30 WIB',
          description: 'Spesialis Hok Lo Pan (martabak manis Bangka) bersarang lembut dengan topping wijen kacang dan keju.',
          products: [
            { name: 'Hok Lo Pan Wijen Kacang Cokelat', price: 38000, desc: 'Adonan lembut wangi mentega dengan taburan klasik Bangka.' },
            { name: 'Hok Lo Pan Keju Susu', price: 42000, desc: 'Parutan keju cheddar melimpah dengan susu manis.' },
          ],
          reviews: [
            { userId: 2, rating: 5, text: 'Teksturnya bersarang rapi dan tidak terlalu berminyak.' },
          ],
        },
        {
          category_id: 5,
          business_name: 'Seafood Bakar Pesisir Pasir Padi',
          owner_name: 'Pak Darmawan',
          address: 'Kawasan Wisata Pantai Pasir Padi, Air Itam, Kota Pangkalpinang',
          longitude: 106.1665,
          latitude: -2.1045,
          phone_number: '0812-7901-2245',
          opening_hours: '10.00 - 21.30 WIB',
          description: 'Hidangan laut segar langsung dari nelayan lokal, mulai dari kepiting saos padang hingga ikan bakar kecap.',
          products: [
            { name: 'Kepiting Lada Hitam (Porsi 2 Orang)', price: 95000, desc: 'Kepiting bakau segar dimasak bumbu lada hitam.' },
            { name: 'Ikan Kakap Bakar Kecap', price: 65000, desc: 'Ikan kakap segar bakar bumbu kecap manis cabai rawit.' },
            { name: 'Cumi Goreng Tepung Crispy', price: 45000, desc: 'Cumi cincin renyah disajikan dengan saus asam manis.' },
          ],
          reviews: [
            { userId: 2, rating: 4, text: 'Ikannya sangat segar dan pemandangan pantai langsung terlihat.' },
          ],
        },
        {
          category_id: 4,
          business_name: 'Dapur Kue Rintak & Bolu Kijing Gabek',
          owner_name: 'Ibu Marlina',
          address: 'Jl. Depati Hamzah No. 27, Gabek, Kota Pangkalpinang',
          longitude: 106.1088,
          latitude: -2.1098,
          phone_number: '0853-7741-9012',
          opening_hours: '08.00 - 18.00 WIB',
          description: 'UMKM produksi kue kering sagu rintak dan bolu kijing tradisional Bangka untuk camilan maupun hantaran.',
          products: [
            { name: 'Kue Rintak Sagu Santan (Toples)', price: 40000, desc: 'Kue kering berbahan tepung sagu dan santan wangi.' },
            { name: 'Bolu Kijing Panggang (Isi 12)', price: 28000, desc: 'Bolu klasik gurih manis dengan aroma telur kampung.' },
          ],
          reviews: [
            { userId: 2, rating: 5, text: 'Kue rintaknya lumer di mulut dan cocok untuk oleh-oleh keluarga.' },
          ],
        },
        {
          category_id: 2,
          business_name: 'Pempek & Tekwan Ikan Pangkal Balam',
          owner_name: 'Nadia Kartika',
          address: 'Jl. RE Martadinata No. 61, Pangkal Balam, Kota Pangkalpinang',
          longitude: 106.1325,
          latitude: -2.1112,
          phone_number: '0819-9520-7788',
          opening_hours: '09.30 - 20.30 WIB',
          description: 'Aneka pempek kapal selam, lenjer, dan tekwan kuah kaldu udang segar dekat kawasan pelabuhan.',
          products: [
            { name: 'Pempek Kapal Selam Tenggiri', price: 20000, desc: 'Pempek isi telur utuh dengan cuko gula aren pekat.' },
            { name: 'Tekwan Kuah Udang', price: 18000, desc: 'Pentol ikan dengan bihun, jamur kuping, dan bengkoang.' },
          ],
          reviews: [
            { userId: 2, rating: 4, text: 'Cukonya mantap, porsi tekwan cukup mengenyangkan.' },
          ],
        },
      ];

      const runSeed = this.db.transaction(() => {
        for (const item of seedList) {
          const info = insertUmkm.run(
            item.category_id,
            item.business_name,
            item.owner_name,
            item.address,
            item.longitude,
            item.latitude,
            item.phone_number,
            item.opening_hours,
            item.description
          );
          const umkmId = Number(info.lastInsertRowid);
          for (const p of item.products) {
            insertProduct.run(umkmId, p.name, p.price, p.desc);
          }
          for (const r of item.reviews) {
            insertReview.run(umkmId, r.userId, r.rating, r.text);
          }
        }
      });
      runSeed();
    }
  }

  async healthCheck() {
    try {
      this.db.prepare('SELECT 1').get();
      return {
        ok: true,
        driver: this.driver,
        database: this.databaseName,
        message: 'Database SQLite lokal aktif dan siap digunakan (siap beralih ke MySQL via .env).',
      };
    } catch (err) {
      return {
        ok: false,
        driver: this.driver,
        database: this.databaseName,
        message: err instanceof Error ? err.message : 'Database SQLite bermasalah',
      };
    }
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const row = this.db
      .prepare(
        `SELECT user_id, full_name, email, password_hash, role, created_at
         FROM users
         WHERE LOWER(email) = LOWER(?)
         LIMIT 1`
      )
      .get(email) as UserRecord | undefined;
    return row ?? null;
  }

  async findUserById(userId: number): Promise<User | null> {
    const row = this.db
      .prepare(
        `SELECT user_id, full_name, email, role, created_at
         FROM users
         WHERE user_id = ?
         LIMIT 1`
      )
      .get(userId) as User | undefined;
    return row ?? null;
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const role = input.role ?? 'user';
    const info = this.db
      .prepare(
        `INSERT INTO users (full_name, email, password_hash, role)
         VALUES (?, ?, ?, ?)`
      )
      .run(input.full_name, input.email, input.password_hash, role);
    const created = await this.findUserById(Number(info.lastInsertRowid));
    if (!created) throw new Error('Gagal membaca data pengguna baru');
    return created;
  }

  async listCategories(): Promise<Category[]> {
    return this.db
      .prepare('SELECT category_id, category_name, description FROM categories ORDER BY category_id ASC')
      .all() as Category[];
  }

  async listUmkm(filters: UmkmFilterParams = {}): Promise<UmkmSummary[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.categoryId) {
      conditions.push('u.category_id = ?');
      params.push(filters.categoryId);
    }

    if (filters.q && filters.q.trim() !== '') {
      const like = `%${filters.q.trim()}%`;
      conditions.push(
        '(u.business_name LIKE ? OR u.address LIKE ? OR COALESCE(u.owner_name, "") LIKE ? OR COALESCE(u.description, "") LIKE ?)'
      );
      params.push(like, like, like, like);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    let orderClause = 'ORDER BY u.business_name ASC';
    if (filters.sort === 'rating') {
      orderClause = 'ORDER BY COALESCE(average_rating, 0) DESC, total_reviews DESC, u.business_name ASC';
    } else if (filters.sort === 'reviews') {
      orderClause = 'ORDER BY total_reviews DESC, COALESCE(average_rating, 0) DESC, u.business_name ASC';
    }

    const rows = this.db
      .prepare(
        `SELECT
          u.umkm_id,
          u.category_id,
          c.category_name,
          u.business_name,
          u.owner_name,
          u.address,
          u.longitude,
          u.latitude,
          u.phone_number,
          u.opening_hours,
          u.description,
          ROUND(AVG(r.rating), 2) AS average_rating,
          COUNT(DISTINCT r.review_id) AS total_reviews,
          COUNT(DISTINCT p.product_id) AS product_count,
          u.created_at,
          u.updated_at
        FROM umkm AS u
        JOIN categories AS c ON c.category_id = u.category_id
        LEFT JOIN reviews AS r ON r.umkm_id = u.umkm_id
        LEFT JOIN products AS p ON p.umkm_id = u.umkm_id
        ${whereClause}
        GROUP BY u.umkm_id
        ${orderClause}`
      )
      .all(...params) as UmkmSummary[];

    return rows.map((row) => ({
      ...row,
      average_rating: row.average_rating !== null ? Number(row.average_rating) : null,
      total_reviews: Number(row.total_reviews ?? 0),
      product_count: Number(row.product_count ?? 0),
    }));
  }

  async getUmkmById(umkmId: number): Promise<UmkmDetail | null> {
    const row = this.db
      .prepare(
        `SELECT
          u.umkm_id,
          u.category_id,
          c.category_name,
          u.business_name,
          u.owner_name,
          u.address,
          u.longitude,
          u.latitude,
          u.phone_number,
          u.opening_hours,
          u.description,
          ROUND(AVG(r.rating), 2) AS average_rating,
          COUNT(DISTINCT r.review_id) AS total_reviews,
          COUNT(DISTINCT p.product_id) AS product_count,
          u.created_at,
          u.updated_at
        FROM umkm AS u
        JOIN categories AS c ON c.category_id = u.category_id
        LEFT JOIN reviews AS r ON r.umkm_id = u.umkm_id
        LEFT JOIN products AS p ON p.umkm_id = u.umkm_id
        WHERE u.umkm_id = ?
        GROUP BY u.umkm_id
        LIMIT 1`
      )
      .get(umkmId) as UmkmSummary | undefined;

    if (!row) return null;

    const products = this.db
      .prepare(
        `SELECT product_id, umkm_id, product_name, price, description, product_image, created_at
         FROM products
         WHERE umkm_id = ?
         ORDER BY created_at DESC, product_id DESC`
      )
      .all(umkmId) as Product[];

    const reviews = this.db
      .prepare(
        `SELECT r.review_id, r.umkm_id, r.user_id, usr.full_name, r.rating, r.review_text, r.created_at
         FROM reviews AS r
         JOIN users AS usr ON usr.user_id = r.user_id
         WHERE r.umkm_id = ?
         ORDER BY r.created_at DESC, r.review_id DESC`
      )
      .all(umkmId) as Review[];

    return {
      ...row,
      average_rating: row.average_rating !== null ? Number(row.average_rating) : null,
      total_reviews: Number(row.total_reviews ?? 0),
      product_count: Number(row.product_count ?? 0),
      products,
      reviews,
    };
  }

  async createUmkm(input: CreateUmkmInput): Promise<UmkmDetail> {
    const info = this.db
      .prepare(
        `INSERT INTO umkm (category_id, business_name, owner_name, address, longitude, latitude, phone_number, opening_hours, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.category_id,
        input.business_name,
        input.owner_name ?? null,
        input.address,
        input.longitude,
        input.latitude,
        input.phone_number ?? null,
        input.opening_hours ?? null,
        input.description ?? null
      );
    const created = await this.getUmkmById(Number(info.lastInsertRowid));
    if (!created) throw new Error('Gagal membaca UMKM baru');
    return created;
  }

  async updateUmkm(umkmId: number, input: UpdateUmkmInput): Promise<UmkmDetail | null> {
    const existing = await this.getUmkmById(umkmId);
    if (!existing) return null;

    this.db
      .prepare(
        `UPDATE umkm
         SET category_id = ?,
             business_name = ?,
             owner_name = ?,
             address = ?,
             longitude = ?,
             latitude = ?,
             phone_number = ?,
             opening_hours = ?,
             description = ?,
             updated_at = datetime('now')
         WHERE umkm_id = ?`
      )
      .run(
        input.category_id ?? existing.category_id,
        input.business_name ?? existing.business_name,
        input.owner_name !== undefined ? input.owner_name : existing.owner_name,
        input.address ?? existing.address,
        input.longitude ?? existing.longitude,
        input.latitude ?? existing.latitude,
        input.phone_number !== undefined ? input.phone_number : existing.phone_number,
        input.opening_hours !== undefined ? input.opening_hours : existing.opening_hours,
        input.description !== undefined ? input.description : existing.description,
        umkmId
      );

    return this.getUmkmById(umkmId);
  }

  async deleteUmkm(umkmId: number): Promise<boolean> {
    const info = this.db.prepare('DELETE FROM umkm WHERE umkm_id = ?').run(umkmId);
    return info.changes > 0;
  }

  async createProduct(umkmId: number, input: CreateProductInput): Promise<Product> {
    const info = this.db
      .prepare(
        `INSERT INTO products (umkm_id, product_name, price, description, product_image)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(umkmId, input.product_name, input.price, input.description ?? null, input.product_image ?? null);

    return this.db
      .prepare('SELECT product_id, umkm_id, product_name, price, description, product_image, created_at FROM products WHERE product_id = ?')
      .get(Number(info.lastInsertRowid)) as Product;
  }

  async deleteProduct(productId: number): Promise<boolean> {
    const info = this.db.prepare('DELETE FROM products WHERE product_id = ?').run(productId);
    return info.changes > 0;
  }

  async createReview(umkmId: number, userId: number, input: CreateReviewInput): Promise<Review> {
    const info = this.db
      .prepare(
        `INSERT INTO reviews (umkm_id, user_id, rating, review_text)
         VALUES (?, ?, ?, ?)`
      )
      .run(umkmId, userId, input.rating, input.review_text ?? null);

    return this.db
      .prepare(
        `SELECT r.review_id, r.umkm_id, r.user_id, usr.full_name, r.rating, r.review_text, r.created_at
         FROM reviews AS r
         JOIN users AS usr ON usr.user_id = r.user_id
         WHERE r.review_id = ?`
      )
      .get(Number(info.lastInsertRowid)) as Review;
  }

  async deleteReview(reviewId: number, requestingUser: User): Promise<boolean> {
    if (requestingUser.role === 'admin') {
      const info = this.db.prepare('DELETE FROM reviews WHERE review_id = ?').run(reviewId);
      return info.changes > 0;
    }
    const info = this.db
      .prepare('DELETE FROM reviews WHERE review_id = ? AND user_id = ?')
      .run(reviewId, requestingUser.user_id);
    return info.changes > 0;
  }
}
