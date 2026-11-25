import type {
  Category,
  Product,
  Review,
  UmkmDetail,
  UmkmSummary,
  User,
  UserRole,
} from '../../src/types/index.js';

export interface UserRecord extends User {
  password_hash: string;
}

export interface CreateUserInput {
  full_name: string;
  email: string;
  password_hash: string;
  role?: UserRole;
}

export interface UmkmFilterParams {
  q?: string;
  categoryId?: number;
  sort?: 'name' | 'rating' | 'reviews';
}

export interface CreateUmkmInput {
  category_id: number;
  business_name: string;
  owner_name?: string | null;
  address: string;
  longitude: number;
  latitude: number;
  phone_number?: string | null;
  opening_hours?: string | null;
  description?: string | null;
}

export type UpdateUmkmInput = Partial<CreateUmkmInput>;

export interface CreateProductInput {
  product_name: string;
  price: number;
  description?: string | null;
  product_image?: string | null;
}

export interface CreateReviewInput {
  rating: number;
  review_text?: string | null;
}

export interface DatabaseRepository {
  readonly driver: 'mysql' | 'sqlite';
  readonly databaseName: string;

  init(): Promise<void>;
  healthCheck(): Promise<{ ok: boolean; driver: 'mysql' | 'sqlite'; database: string; message: string }>;

  // Users & Auth
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(userId: number): Promise<User | null>;
  createUser(input: CreateUserInput): Promise<User>;

  // Categories
  listCategories(): Promise<Category[]>;

  // UMKM Spatial & Directory
  listUmkm(filters?: UmkmFilterParams): Promise<UmkmSummary[]>;
  getUmkmById(umkmId: number): Promise<UmkmDetail | null>;
  createUmkm(input: CreateUmkmInput): Promise<UmkmDetail>;
  updateUmkm(umkmId: number, input: UpdateUmkmInput): Promise<UmkmDetail | null>;
  deleteUmkm(umkmId: number): Promise<boolean>;

  // Products
  createProduct(umkmId: number, input: CreateProductInput): Promise<Product>;
  deleteProduct(productId: number): Promise<boolean>;

  // Reviews
  createReview(umkmId: number, userId: number, input: CreateReviewInput): Promise<Review>;
  deleteReview(reviewId: number, requestingUser: User): Promise<boolean>;
}
