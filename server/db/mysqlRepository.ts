import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
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

export interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export class MySQLRepository implements DatabaseRepository {
  readonly driver = 'mysql' as const;
  readonly databaseName: string;
  private pool: Pool;

  constructor(private readonly config: MySQLConfig) {
    this.databaseName = config.database;
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: false,
    });
  }

  async init(): Promise<void> {
    const conn = await this.pool.getConnection();
    try {
      await conn.ping();
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT TABLE_NAME AS table_name,
                COLUMN_NAME AS column_name,
                DATA_TYPE AS data_type
         FROM information_schema.columns
         WHERE table_schema = ?
           AND table_name IN ('users', 'categories', 'umkm', 'products', 'reviews')`,
        [this.config.database]
      );
      const required: Record<string, string[]> = {
        users: ['user_id', 'full_name', 'email', 'password_hash', 'role', 'created_at'],
        categories: ['category_id', 'category_name', 'description'],
        umkm: [
          'umkm_id',
          'category_id',
          'business_name',
          'owner_name',
          'address',
          'location',
          'phone_number',
          'opening_hours',
          'description',
          'created_at',
          'updated_at',
        ],
        products: [
          'product_id',
          'umkm_id',
          'product_name',
          'price',
          'description',
          'product_image',
          'created_at',
        ],
        reviews: ['review_id', 'umkm_id', 'user_id', 'rating', 'review_text', 'created_at'],
      };
      const found = new Map<string, Set<string>>();
      for (const row of rows) {
        const tableName = String(row.table_name);
        const columns = found.get(tableName) ?? new Set<string>();
        columns.add(String(row.column_name));
        found.set(tableName, columns);
      }
      const missing = Object.entries(required).flatMap(([table, columns]) =>
        columns
          .filter((column) => !found.get(table)?.has(column))
          .map((column) => `${table}.${column}`)
      );
      if (rows.some((row) => row.table_name === 'umkm' && row.column_name === 'location' && row.data_type !== 'point')) {
        missing.push('umkm.location (harus bertipe POINT)');
      }
      if (missing.length > 0) {
        throw new Error(
          `Skema database belum sesuai. Kolom/tabel yang tidak ditemukan atau tidak kompatibel: ${missing.join(', ')}. Periksa/import SQL database WebGIS UMKM terlebih dahulu.`
        );
      }
    } finally {
      conn.release();
    }
  }

  async healthCheck() {
    try {
      await this.pool.query('SELECT 1');
      return {
        ok: true,
        driver: this.driver,
        database: this.databaseName,
        message: `Terhubung ke MySQL (${this.config.host}:${this.config.port}/${this.databaseName})`,
      };
    } catch (err) {
      return {
        ok: false,
        driver: this.driver,
        database: this.databaseName,
        message: err instanceof Error ? err.message : 'Koneksi MySQL gagal',
      };
    }
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT user_id, full_name, email, password_hash, role, created_at
       FROM users
       WHERE LOWER(email) = LOWER(?)
       LIMIT 1`,
      [email]
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      user_id: Number(row.user_id),
      full_name: String(row.full_name),
      email: String(row.email),
      password_hash: String(row.password_hash),
      role: row.role === 'admin' ? 'admin' : 'user',
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  async findUserById(userId: number): Promise<User | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT user_id, full_name, email, role, created_at
       FROM users
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      user_id: Number(row.user_id),
      full_name: String(row.full_name),
      email: String(row.email),
      role: row.role === 'admin' ? 'admin' : 'user',
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const role = input.role ?? 'user';
    const [result] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES (?, ?, ?, ?)`,
      [input.full_name, input.email, input.password_hash, role]
    );
    const created = await this.findUserById(result.insertId);
    if (!created) throw new Error('Gagal membaca pengguna yang baru dibuat');
    return created;
  }

  async listCategories(): Promise<Category[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT category_id, category_name, description
       FROM categories
       ORDER BY category_id ASC`
    );
    return rows.map((row) => ({
      category_id: Number(row.category_id),
      category_name: String(row.category_name),
      description: row.description ? String(row.description) : null,
    }));
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
      orderClause = 'ORDER BY average_rating DESC, total_reviews DESC, u.business_name ASC';
    } else if (filters.sort === 'reviews') {
      orderClause = 'ORDER BY total_reviews DESC, average_rating DESC, u.business_name ASC';
    }

    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT
        u.umkm_id,
        u.category_id,
        c.category_name,
        u.business_name,
        u.owner_name,
        u.address,
        ST_Longitude(u.location) AS longitude,
        ST_Latitude(u.location) AS latitude,
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
       GROUP BY u.umkm_id, u.category_id, c.category_name, u.business_name, u.owner_name,
                u.address, u.location, u.phone_number, u.opening_hours, u.description,
                u.created_at, u.updated_at
       ${orderClause}`,
      params
    );

    return rows.map((row) => ({
      umkm_id: Number(row.umkm_id),
      category_id: Number(row.category_id),
      category_name: String(row.category_name),
      business_name: String(row.business_name),
      owner_name: row.owner_name ? String(row.owner_name) : null,
      address: String(row.address),
      longitude: Number(row.longitude),
      latitude: Number(row.latitude),
      phone_number: row.phone_number ? String(row.phone_number) : null,
      opening_hours: row.opening_hours ? String(row.opening_hours) : null,
      description: row.description ? String(row.description) : null,
      average_rating: row.average_rating !== null ? Number(row.average_rating) : null,
      total_reviews: Number(row.total_reviews ?? 0),
      product_count: Number(row.product_count ?? 0),
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    }));
  }

  async getUmkmById(umkmId: number): Promise<UmkmDetail | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT
        u.umkm_id,
        u.category_id,
        c.category_name,
        u.business_name,
        u.owner_name,
        u.address,
        ST_Longitude(u.location) AS longitude,
        ST_Latitude(u.location) AS latitude,
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
       GROUP BY u.umkm_id, u.category_id, c.category_name, u.business_name, u.owner_name,
                u.address, u.location, u.phone_number, u.opening_hours, u.description,
                u.created_at, u.updated_at
       LIMIT 1`,
      [umkmId]
    );

    if (rows.length === 0) return null;
    const row = rows[0];

    const [productRows] = await this.pool.query<RowDataPacket[]>(
      `SELECT product_id, umkm_id, product_name, price, description, product_image, created_at
       FROM products
       WHERE umkm_id = ?
       ORDER BY created_at DESC, product_id DESC`,
      [umkmId]
    );

    const [reviewRows] = await this.pool.query<RowDataPacket[]>(
      `SELECT r.review_id, r.umkm_id, r.user_id, usr.full_name, r.rating, r.review_text, r.created_at
       FROM reviews AS r
       JOIN users AS usr ON usr.user_id = r.user_id
       WHERE r.umkm_id = ?
       ORDER BY r.created_at DESC, r.review_id DESC`,
      [umkmId]
    );

    const products: Product[] = productRows.map((p) => ({
      product_id: Number(p.product_id),
      umkm_id: Number(p.umkm_id),
      product_name: String(p.product_name),
      price: Number(p.price),
      description: p.description ? String(p.description) : null,
      product_image: p.product_image ? String(p.product_image) : null,
      created_at: new Date(p.created_at).toISOString(),
    }));

    const reviews: Review[] = reviewRows.map((r) => ({
      review_id: Number(r.review_id),
      umkm_id: Number(r.umkm_id),
      user_id: Number(r.user_id),
      full_name: String(r.full_name),
      rating: Number(r.rating),
      review_text: r.review_text ? String(r.review_text) : null,
      created_at: new Date(r.created_at).toISOString(),
    }));

    return {
      umkm_id: Number(row.umkm_id),
      category_id: Number(row.category_id),
      category_name: String(row.category_name),
      business_name: String(row.business_name),
      owner_name: row.owner_name ? String(row.owner_name) : null,
      address: String(row.address),
      longitude: Number(row.longitude),
      latitude: Number(row.latitude),
      phone_number: row.phone_number ? String(row.phone_number) : null,
      opening_hours: row.opening_hours ? String(row.opening_hours) : null,
      description: row.description ? String(row.description) : null,
      average_rating: row.average_rating !== null ? Number(row.average_rating) : null,
      total_reviews: Number(row.total_reviews ?? 0),
      product_count: Number(row.product_count ?? 0),
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
      products,
      reviews,
    };
  }

  async createUmkm(input: CreateUmkmInput): Promise<UmkmDetail> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO umkm
       (category_id, business_name, owner_name, address, location, phone_number, opening_hours, description)
       VALUES (?, ?, ?, ?, ST_SRID(POINT(?, ?), 4326), ?, ?, ?)`,
      [
        input.category_id,
        input.business_name,
        input.owner_name ?? null,
        input.address,
        input.longitude,
        input.latitude,
        input.phone_number ?? null,
        input.opening_hours ?? null,
        input.description ?? null,
      ]
    );
    const created = await this.getUmkmById(result.insertId);
    if (!created) throw new Error('Gagal membaca UMKM yang baru dibuat');
    return created;
  }

  async updateUmkm(umkmId: number, input: UpdateUmkmInput): Promise<UmkmDetail | null> {
    const existing = await this.getUmkmById(umkmId);
    if (!existing) return null;

    const category_id = input.category_id ?? existing.category_id;
    const business_name = input.business_name ?? existing.business_name;
    const owner_name = input.owner_name !== undefined ? input.owner_name : existing.owner_name;
    const address = input.address ?? existing.address;
    const longitude = input.longitude ?? existing.longitude;
    const latitude = input.latitude ?? existing.latitude;
    const phone_number = input.phone_number !== undefined ? input.phone_number : existing.phone_number;
    const opening_hours = input.opening_hours !== undefined ? input.opening_hours : existing.opening_hours;
    const description = input.description !== undefined ? input.description : existing.description;

    await this.pool.query(
      `UPDATE umkm
       SET category_id = ?,
           business_name = ?,
           owner_name = ?,
           address = ?,
           location = ST_SRID(POINT(?, ?), 4326),
           phone_number = ?,
           opening_hours = ?,
           description = ?
       WHERE umkm_id = ?`,
      [
        category_id,
        business_name,
        owner_name,
        address,
        longitude,
        latitude,
        phone_number,
        opening_hours,
        description,
        umkmId,
      ]
    );

    return this.getUmkmById(umkmId);
  }

  async deleteUmkm(umkmId: number): Promise<boolean> {
    const [result] = await this.pool.query<ResultSetHeader>('DELETE FROM umkm WHERE umkm_id = ?', [umkmId]);
    return result.affectedRows > 0;
  }

  async createProduct(umkmId: number, input: CreateProductInput): Promise<Product> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO products (umkm_id, product_name, price, description, product_image)
       VALUES (?, ?, ?, ?, ?)`,
      [umkmId, input.product_name, input.price, input.description ?? null, input.product_image ?? null]
    );
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT product_id, umkm_id, product_name, price, description, product_image, created_at
       FROM products
       WHERE product_id = ?`,
      [result.insertId]
    );
    const row = rows[0];
    return {
      product_id: Number(row.product_id),
      umkm_id: Number(row.umkm_id),
      product_name: String(row.product_name),
      price: Number(row.price),
      description: row.description ? String(row.description) : null,
      product_image: row.product_image ? String(row.product_image) : null,
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  async deleteProduct(productId: number): Promise<boolean> {
    const [result] = await this.pool.query<ResultSetHeader>('DELETE FROM products WHERE product_id = ?', [
      productId,
    ]);
    return result.affectedRows > 0;
  }

  async createReview(umkmId: number, userId: number, input: CreateReviewInput): Promise<Review> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `INSERT INTO reviews (umkm_id, user_id, rating, review_text)
       VALUES (?, ?, ?, ?)`,
      [umkmId, userId, input.rating, input.review_text ?? null]
    );
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT r.review_id, r.umkm_id, r.user_id, usr.full_name, r.rating, r.review_text, r.created_at
       FROM reviews AS r
       JOIN users AS usr ON usr.user_id = r.user_id
       WHERE r.review_id = ?`,
      [result.insertId]
    );
    const row = rows[0];
    return {
      review_id: Number(row.review_id),
      umkm_id: Number(row.umkm_id),
      user_id: Number(row.user_id),
      full_name: String(row.full_name),
      rating: Number(row.rating),
      review_text: row.review_text ? String(row.review_text) : null,
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  async deleteReview(reviewId: number, requestingUser: User): Promise<boolean> {
    if (requestingUser.role === 'admin') {
      const [result] = await this.pool.query<ResultSetHeader>('DELETE FROM reviews WHERE review_id = ?', [
        reviewId,
      ]);
      return result.affectedRows > 0;
    }
    const [result] = await this.pool.query<ResultSetHeader>(
      'DELETE FROM reviews WHERE review_id = ? AND user_id = ?',
      [reviewId, requestingUser.user_id]
    );
    return result.affectedRows > 0;
  }
}
