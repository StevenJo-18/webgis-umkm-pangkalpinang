import type {
  Category,
  DatabaseHealth,
  Product,
  Review,
  UmkmDetail,
  UmkmSummary,
  User,
} from '../types';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      typeof data?.error === 'string' ? data.error : `Permintaan gagal (${res.status})`,
      res.status
    );
  }
  return data as T;
}

export const api = {
  health: () => request<DatabaseHealth>('/api/health'),

  // Auth
  me: async (): Promise<User | null> => {
    try {
      const data = await request<{ user: User | null }>('/api/auth/me');
      return data.user;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return null;
      }
      throw err;
    }
  },
  login: (payload: { email: string; password: string }) =>
    request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  register: (payload: { full_name: string; email: string; password: string }) =>
    request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () =>
    request<{ ok: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),

  // Categories
  listCategories: () => request<{ categories: Category[] }>('/api/categories'),

  // UMKM
  listUmkm: (params?: { q?: string; categoryId?: number | null; sort?: 'name' | 'rating' | 'reviews' }) => {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.categoryId) query.set('categoryId', String(params.categoryId));
    if (params?.sort) query.set('sort', params.sort);
    const qs = query.toString();
    return request<{ umkm: UmkmSummary[] }>(`/api/umkm${qs ? `?${qs}` : ''}`);
  },
  getUmkm: (id: number) => request<{ umkm: UmkmDetail }>(`/api/umkm/${id}`),
  createUmkm: (payload: {
    category_id: number;
    business_name: string;
    owner_name?: string | null;
    address: string;
    longitude: number;
    latitude: number;
    phone_number?: string | null;
    opening_hours?: string | null;
    description?: string | null;
  }) =>
    request<{ umkm: UmkmDetail }>('/api/umkm', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateUmkm: (
    id: number,
    payload: Partial<{
      category_id: number;
      business_name: string;
      owner_name: string | null;
      address: string;
      longitude: number;
      latitude: number;
      phone_number: string | null;
      opening_hours: string | null;
      description: string | null;
    }>
  ) =>
    request<{ umkm: UmkmDetail }>(`/api/umkm/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteUmkm: (id: number) =>
    request<{ ok: boolean }>(`/api/umkm/${id}`, {
      method: 'DELETE',
    }),

  // Products
  createProduct: (
    umkmId: number,
    payload: { product_name: string; price: number; description?: string | null }
  ) =>
    request<{ product: Product }>(`/api/umkm/${umkmId}/products`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteProduct: (productId: number) =>
    request<{ ok: boolean }>(`/api/products/${productId}`, {
      method: 'DELETE',
    }),

  // Reviews
  createReview: (umkmId: number, payload: { rating: number; review_text?: string | null }) =>
    request<{ review: Review }>(`/api/umkm/${umkmId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteReview: (reviewId: number) =>
    request<{ ok: boolean }>(`/api/reviews/${reviewId}`, {
      method: 'DELETE',
    }),
};
