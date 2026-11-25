import { Router } from 'express';
import type { DatabaseRepository } from '../db/repository.js';
import type { AuthenticatedRequest, createAuthMiddleware } from '../middleware/auth.js';

export function createUmkmRouter(
  repo: DatabaseRepository,
  guards: ReturnType<typeof createAuthMiddleware>
): Router {
  const router = Router();

  router.get('/categories', async (_req, res) => {
    try {
      const categories = await repo.listCategories();
      return res.json({ categories });
    } catch (error) {
      console.error('[Categories List Error]', error);
      return res.status(500).json({ error: 'Gagal memuat data kategori.' });
    }
  });

  router.get('/umkm', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const categoryIdRaw = req.query.categoryId ? Number(req.query.categoryId) : undefined;
      const categoryId = categoryIdRaw && !Number.isNaN(categoryIdRaw) ? categoryIdRaw : undefined;
      const sortRaw = typeof req.query.sort === 'string' ? req.query.sort : 'name';
      const sort = sortRaw === 'rating' || sortRaw === 'reviews' ? sortRaw : 'name';

      const umkm = await repo.listUmkm({ q, categoryId, sort });
      return res.json({ umkm });
    } catch (error) {
      console.error('[UMKM List Error]', error);
      return res.status(500).json({ error: 'Gagal memuat daftar UMKM.' });
    }
  });

  router.get('/umkm/:id', async (req, res) => {
    try {
      const umkmId = Number(req.params.id);
      if (!Number.isInteger(umkmId) || umkmId <= 0) {
        return res.status(400).json({ error: 'ID UMKM tidak valid.' });
      }
      const detail = await repo.getUmkmById(umkmId);
      if (!detail) {
        return res.status(404).json({ error: 'Data UMKM tidak ditemukan.' });
      }
      return res.json({ umkm: detail });
    } catch (error) {
      console.error('[UMKM Detail Error]', error);
      return res.status(500).json({ error: 'Gagal memuat detail UMKM.' });
    }
  });

  router.post('/umkm', guards.requireAdmin, async (req, res) => {
    try {
      const category_id = Number(req.body?.category_id);
      const business_name = typeof req.body?.business_name === 'string' ? req.body.business_name.trim() : '';
      const address = typeof req.body?.address === 'string' ? req.body.address.trim() : '';
      const longitude = Number(req.body?.longitude);
      const latitude = Number(req.body?.latitude);

      if (!Number.isInteger(category_id) || category_id <= 0) {
        return res.status(400).json({ error: 'Kategori usaha wajib dipilih.' });
      }
      if (business_name.length < 2 || business_name.length > 150) {
        return res.status(400).json({ error: 'Nama usaha harus 2 hingga 150 karakter.' });
      }
      if (address.length < 5) {
        return res.status(400).json({ error: 'Alamat lengkap wajib diisi.' });
      }
      if (
        Number.isNaN(longitude) ||
        Number.isNaN(latitude) ||
        longitude < -180 ||
        longitude > 180 ||
        latitude < -90 ||
        latitude > 90
      ) {
        return res.status(400).json({ error: 'Koordinat longitude dan latitude tidak valid.' });
      }

      const created = await repo.createUmkm({
        category_id,
        business_name,
        owner_name: typeof req.body?.owner_name === 'string' ? req.body.owner_name.trim() || null : null,
        address,
        longitude,
        latitude,
        phone_number: typeof req.body?.phone_number === 'string' ? req.body.phone_number.trim() || null : null,
        opening_hours: typeof req.body?.opening_hours === 'string' ? req.body.opening_hours.trim() || null : null,
        description: typeof req.body?.description === 'string' ? req.body.description.trim() || null : null,
      });

      return res.status(201).json({ umkm: created });
    } catch (error) {
      console.error('[UMKM Create Error]', error);
      return res.status(500).json({ error: 'Gagal menambahkan data UMKM.' });
    }
  });

  router.put('/umkm/:id', guards.requireAdmin, async (req, res) => {
    try {
      const umkmId = Number(req.params.id);
      if (!Number.isInteger(umkmId) || umkmId <= 0) {
        return res.status(400).json({ error: 'ID UMKM tidak valid.' });
      }

      const longitude = req.body?.longitude !== undefined ? Number(req.body.longitude) : undefined;
      const latitude = req.body?.latitude !== undefined ? Number(req.body.latitude) : undefined;

      if (
        (longitude !== undefined && (Number.isNaN(longitude) || longitude < -180 || longitude > 180)) ||
        (latitude !== undefined && (Number.isNaN(latitude) || latitude < -90 || latitude > 90))
      ) {
        return res.status(400).json({ error: 'Koordinat longitude atau latitude tidak valid.' });
      }

      const updated = await repo.updateUmkm(umkmId, {
        category_id: req.body?.category_id !== undefined ? Number(req.body.category_id) : undefined,
        business_name:
          typeof req.body?.business_name === 'string' ? req.body.business_name.trim() : undefined,
        owner_name:
          req.body?.owner_name !== undefined
            ? typeof req.body.owner_name === 'string'
              ? req.body.owner_name.trim() || null
              : null
            : undefined,
        address: typeof req.body?.address === 'string' ? req.body.address.trim() : undefined,
        longitude,
        latitude,
        phone_number:
          req.body?.phone_number !== undefined
            ? typeof req.body.phone_number === 'string'
              ? req.body.phone_number.trim() || null
              : null
            : undefined,
        opening_hours:
          req.body?.opening_hours !== undefined
            ? typeof req.body.opening_hours === 'string'
              ? req.body.opening_hours.trim() || null
              : null
            : undefined,
        description:
          req.body?.description !== undefined
            ? typeof req.body.description === 'string'
              ? req.body.description.trim() || null
              : null
            : undefined,
      });

      if (!updated) {
        return res.status(404).json({ error: 'Data UMKM tidak ditemukan.' });
      }
      return res.json({ umkm: updated });
    } catch (error) {
      console.error('[UMKM Update Error]', error);
      return res.status(500).json({ error: 'Gagal memperbarui data UMKM.' });
    }
  });

  router.delete('/umkm/:id', guards.requireAdmin, async (req, res) => {
    try {
      const umkmId = Number(req.params.id);
      if (!Number.isInteger(umkmId) || umkmId <= 0) {
        return res.status(400).json({ error: 'ID UMKM tidak valid.' });
      }
      const deleted = await repo.deleteUmkm(umkmId);
      if (!deleted) {
        return res.status(404).json({ error: 'Data UMKM tidak ditemukan.' });
      }
      return res.json({ ok: true });
    } catch (error) {
      console.error('[UMKM Delete Error]', error);
      return res.status(500).json({ error: 'Gagal menghapus data UMKM.' });
    }
  });

  router.post('/umkm/:id/products', guards.requireAdmin, async (req, res) => {
    try {
      const umkmId = Number(req.params.id);
      if (!Number.isInteger(umkmId) || umkmId <= 0) {
        return res.status(400).json({ error: 'ID UMKM tidak valid.' });
      }

      const product_name = typeof req.body?.product_name === 'string' ? req.body.product_name.trim() : '';
      const price = Number(req.body?.price ?? 0);

      if (product_name.length < 2 || product_name.length > 150) {
        return res.status(400).json({ error: 'Nama produk harus 2 hingga 150 karakter.' });
      }
      if (Number.isNaN(price) || price < 0) {
        return res.status(400).json({ error: 'Harga produk tidak boleh negatif.' });
      }

      const existingUmkm = await repo.getUmkmById(umkmId);
      if (!existingUmkm) {
        return res.status(404).json({ error: 'Data UMKM tidak ditemukan.' });
      }

      const product = await repo.createProduct(umkmId, {
        product_name,
        price,
        description: typeof req.body?.description === 'string' ? req.body.description.trim() || null : null,
        product_image:
          typeof req.body?.product_image === 'string' ? req.body.product_image.trim() || null : null,
      });

      return res.status(201).json({ product });
    } catch (error) {
      console.error('[Product Create Error]', error);
      return res.status(500).json({ error: 'Gagal menambahkan produk.' });
    }
  });

  router.delete('/products/:productId', guards.requireAdmin, async (req, res) => {
    try {
      const productId = Number(req.params.productId);
      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ error: 'ID produk tidak valid.' });
      }
      const deleted = await repo.deleteProduct(productId);
      if (!deleted) {
        return res.status(404).json({ error: 'Produk tidak ditemukan.' });
      }
      return res.json({ ok: true });
    } catch (error) {
      console.error('[Product Delete Error]', error);
      return res.status(500).json({ error: 'Gagal menghapus produk.' });
    }
  });

  router.post('/umkm/:id/reviews', guards.requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const umkmId = Number(req.params.id);
      if (!Number.isInteger(umkmId) || umkmId <= 0) {
        return res.status(400).json({ error: 'ID UMKM tidak valid.' });
      }
      const rating = Number(req.body?.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating harus berupa angka 1 hingga 5.' });
      }

      const existingUmkm = await repo.getUmkmById(umkmId);
      if (!existingUmkm) {
        return res.status(404).json({ error: 'Data UMKM tidak ditemukan.' });
      }

      const review = await repo.createReview(umkmId, req.user!.user_id, {
        rating,
        review_text: typeof req.body?.review_text === 'string' ? req.body.review_text.trim() || null : null,
      });

      return res.status(201).json({ review });
    } catch (error) {
      console.error('[Review Create Error]', error);
      return res.status(500).json({ error: 'Gagal mengirim ulasan.' });
    }
  });

  router.delete('/reviews/:reviewId', guards.requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const reviewId = Number(req.params.reviewId);
      if (!Number.isInteger(reviewId) || reviewId <= 0) {
        return res.status(400).json({ error: 'ID ulasan tidak valid.' });
      }
      const deleted = await repo.deleteReview(reviewId, req.user!);
      if (!deleted) {
        return res.status(404).json({ error: 'Ulasan tidak ditemukan atau Anda tidak berhak menghapusnya.' });
      }
      return res.json({ ok: true });
    } catch (error) {
      console.error('[Review Delete Error]', error);
      return res.status(500).json({ error: 'Gagal menghapus ulasan.' });
    }
  });

  return router;
}
