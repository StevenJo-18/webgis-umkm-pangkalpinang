export type UserRole = 'admin' | 'user';

export interface User {
  user_id: number;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Category {
  category_id: number;
  category_name: string;
  description: string | null;
}

export interface UmkmSummary {
  umkm_id: number;
  category_id: number;
  category_name: string;
  business_name: string;
  owner_name: string | null;
  address: string;
  longitude: number;
  latitude: number;
  phone_number: string | null;
  opening_hours: string | null;
  description: string | null;
  average_rating: number | null;
  total_reviews: number;
  product_count: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  product_id: number;
  umkm_id: number;
  product_name: string;
  price: number;
  description: string | null;
  product_image: string | null;
  created_at: string;
}

export interface Review {
  review_id: number;
  umkm_id: number;
  user_id: number;
  full_name: string;
  rating: number;
  review_text: string | null;
  created_at: string;
}

export interface UmkmDetail extends UmkmSummary {
  products: Product[];
  reviews: Review[];
}

export interface DatabaseHealth {
  ok: boolean;
  driver: 'mysql' | 'sqlite';
  database: string;
  message: string;
}
