import { MySQLRepository } from './mysqlRepository.js';
import type { DatabaseRepository } from './repository.js';
import { SQLiteRepository } from './sqliteRepository.js';

export async function createDatabaseRepository(): Promise<DatabaseRepository> {
  const driver = (process.env.DB_DRIVER ?? 'mysql').toLowerCase();

  if (driver === 'mysql') {
    const mysqlRepo = new MySQLRepository({
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'db_webgis_umkm_pangkalpinang',
    });

    try {
      await mysqlRepo.init();
      console.log('[DB] Terhubung ke MySQL 8.0:', process.env.DB_NAME ?? 'db_webgis_umkm_pangkalpinang');
      return mysqlRepo;
    } catch (error) {
      if (process.env.DB_STRICT !== 'false') {
        throw error;
      }
      console.warn(
        '[DB] Gagal terhubung ke MySQL, beralih otomatis ke SQLite lokal:',
        error instanceof Error ? error.message : error
      );
    }
  } else if (driver !== 'sqlite') {
    throw new Error(`DB_DRIVER tidak dikenal: "${driver}". Pilih "mysql" atau "sqlite".`);
  }

  const sqlitePath = process.env.SQLITE_PATH ?? './data/umkm_pangkalpinang.db';
  const sqliteRepo = new SQLiteRepository(sqlitePath);
  await sqliteRepo.init();
  console.log('[DB] Menggunakan SQLite lokal:', sqlitePath);
  return sqliteRepo;
}
