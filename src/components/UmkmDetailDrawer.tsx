import { useState, type FormEvent } from 'react';
import {
  Clock,
  Copy,
  ExternalLink,
  MapPin,
  Phone,
  Star,
  Trash2,
  User as UserIcon,
  Utensils,
  X,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { formatCoords, formatDateId, formatRupiah } from '../lib/format';
import type { UmkmDetail, User } from '../types';

interface UmkmDetailDrawerProps {
  detail: UmkmDetail | null;
  loading: boolean;
  user: User | null;
  onClose: () => void;
  onOpenAuth: () => void;
  onRefreshDetail: (umkmId: number) => Promise<void>;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export function UmkmDetailDrawer({
  detail,
  loading,
  user,
  onClose,
  onOpenAuth,
  onRefreshDetail,
  onNotify,
}: UmkmDetailDrawerProps) {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  if (!detail && !loading) return null;

  const handleCopyCoords = async () => {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(formatCoords(detail.latitude, detail.longitude));
      onNotify('Koordinat disalin ke papan klip.');
    } catch {
      onNotify('Gagal menyalin koordinat.', 'error');
    }
  };

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    setSubmittingReview(true);
    try {
      await api.createReview(detail.umkm_id, {
        rating,
        review_text: reviewText.trim() || null,
      });
      setReviewText('');
      setRating(5);
      await onRefreshDetail(detail.umkm_id);
      onNotify('Ulasan Anda berhasil dikirim.');
    } catch (err) {
      onNotify(err instanceof ApiError ? err.message : 'Gagal mengirim ulasan.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!detail) return;
    try {
      await api.deleteReview(reviewId);
      await onRefreshDetail(detail.umkm_id);
      onNotify('Ulasan dihapus.');
    } catch (err) {
      onNotify(err instanceof ApiError ? err.message : 'Gagal menghapus ulasan.', 'error');
    }
  };

  return (
    <aside
      aria-label="Detail UMKM"
      className="fixed inset-y-0 right-0 top-16 z-40 w-full sm:w-[440px] bg-white border-l border-slate-200 shadow-xl flex flex-col"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
        <span className="text-xs font-medium text-slate-500">Detail Lokasi UMKM</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup panel detail"
          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {loading || !detail ? (
        <div className="p-6 space-y-4">
          <div className="h-6 bg-slate-100 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse" />
          <div className="h-24 bg-slate-100 rounded animate-pulse" />
          <div className="h-32 bg-slate-100 rounded animate-pulse" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
          {/* Profil Utama */}
          <div className="p-5 space-y-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                <span className="font-medium text-[#163B65]">{detail.category_name}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-700">
                  <Star className="w-3.5 h-3.5 fill-[#D97706] text-[#D97706]" aria-hidden="true" />
                  {detail.average_rating !== null ? detail.average_rating.toFixed(1) : 'Baru'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{detail.total_reviews} ulasan</span>
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 leading-snug">
                {detail.business_name}
              </h2>
              {detail.description && (
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{detail.description}</p>
              )}
            </div>

            <dl className="space-y-2.5 text-sm">
              <div className="flex items-start gap-2.5 text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                <dd>{detail.address}</dd>
              </div>
              {detail.owner_name && (
                <div className="flex items-center gap-2.5 text-slate-700">
                  <UserIcon className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <dd>Pemilik: {detail.owner_name}</dd>
                </div>
              )}
              {detail.opening_hours && (
                <div className="flex items-center gap-2.5 text-slate-700">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <dd className="tabular-nums">{detail.opening_hours}</dd>
                </div>
              )}
              {detail.phone_number && (
                <div className="flex items-center gap-2.5 text-slate-700">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <dd className="font-mono tabular-nums">{detail.phone_number}</dd>
                </div>
              )}
            </dl>

            {/* Koordinat & Rute */}
            <div className="pt-2 flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
              <div>
                <div className="text-[11px] font-medium text-slate-500">Koordinat (Lat, Lon)</div>
                <div className="font-mono text-xs tabular-nums text-slate-800">
                  {formatCoords(detail.latitude, detail.longitude)}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyCoords}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Salin</span>
                </button>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${detail.latitude}&mlon=${detail.longitude}#map=17/${detail.latitude}/${detail.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-[#163B65] hover:bg-[#0F2E52] rounded-md transition-colors"
                >
                  <span>OSM</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          {/* Daftar Produk */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm font-bold text-slate-900">
                Produk & Menu ({detail.products.length})
              </h3>
            </div>

            {detail.products.length === 0 ? (
              <p className="text-sm text-slate-500 py-3">Belum ada produk yang dicatat untuk usaha ini.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {detail.products.map((product) => (
                  <li key={product.product_id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200/70 flex items-center justify-center shrink-0 text-[#163B65]">
                      <Utensils className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {product.product_name}
                        </span>
                        <span className="font-mono text-xs font-semibold tabular-nums text-[#163B65] shrink-0">
                          {formatRupiah(product.price)}
                        </span>
                      </div>
                      {product.description && (
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{product.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Ulasan Pengguna */}
          <div className="p-5 space-y-4">
            <h3 className="font-display text-sm font-bold text-slate-900">
              Ulasan Pengguna ({detail.reviews.length})
            </h3>

            {user ? (
              <form onSubmit={handleReviewSubmit} className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">Beri Rating</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        aria-label={`Beri ${star} bintang`}
                        className="p-1 cursor-pointer"
                      >
                        <Star
                          className={`w-4 h-4 transition-colors ${
                            star <= rating
                              ? 'fill-[#D97706] text-[#D97706]'
                              : 'text-slate-300 hover:text-slate-400'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Bagikan pengalaman kuliner Anda di lokasi ini..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#163B65]"
                />
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full py-2 px-3 text-xs font-semibold text-white bg-[#163B65] hover:bg-[#0F2E52] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                >
                  {submittingReview ? 'Mengirim...' : 'Kirim Ulasan'}
                </button>
              </form>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-600">Masuk akun untuk memberikan ulasan dan rating.</p>
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#163B65] hover:bg-[#0F2E52] rounded-md shrink-0 transition-colors cursor-pointer"
                >
                  Masuk
                </button>
              </div>
            )}

            {detail.reviews.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada ulasan. Jadilah yang pertama mengulas.</p>
            ) : (
              <ul className="space-y-3">
                {detail.reviews.map((rev) => {
                  const canDelete =
                    user && (user.role === 'admin' || user.user_id === rev.user_id);
                  return (
                    <li key={rev.review_id} className="pb-3 border-b border-slate-100 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-slate-900">{rev.full_name}</span>
                          <span className="text-slate-300" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-slate-500">{formatDateId(rev.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-slate-800 tabular-nums">
                            <Star className="w-3.5 h-3.5 fill-[#D97706] text-[#D97706]" aria-hidden="true" />
                            {rev.rating}
                          </span>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteReview(rev.review_id)}
                              title="Hapus ulasan"
                              aria-label="Hapus ulasan"
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      {rev.review_text && (
                        <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">{rev.review_text}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
