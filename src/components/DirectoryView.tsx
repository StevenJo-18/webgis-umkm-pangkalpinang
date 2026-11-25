import { MapPin, Search, Star } from 'lucide-react';
import { formatCoords } from '../lib/format';
import type { Category, UmkmSummary } from '../types';

interface DirectoryViewProps {
  umkmList: UmkmSummary[];
  categories: Category[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategoryId: number | null;
  onCategoryChange: (categoryId: number | null) => void;
  sortBy: 'name' | 'rating' | 'reviews';
  onSortChange: (sort: 'name' | 'rating' | 'reviews') => void;
  onSelectUmkm: (umkmId: number) => void;
  onViewOnMap: (umkmId: number) => void;
}

export function DirectoryView({
  umkmList,
  categories,
  loading,
  searchQuery,
  onSearchChange,
  selectedCategoryId,
  onCategoryChange,
  sortBy,
  onSortChange,
  onSelectUmkm,
  onViewOnMap,
}: DirectoryViewProps) {
  return (
    <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Direktori UMKM Kuliner Pangkalpinang
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Telusuri usaha kuliner terdaftar berdasarkan kategori, rating pengunjung, dan koordinat spasial Kota Pangkalpinang.
          </p>
        </div>
        <div className="text-sm text-slate-600 tabular-nums shrink-0">
          Menampilkan <span className="font-semibold text-slate-900">{umkmList.length}</span> lokasi
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <button
            type="button"
            onClick={() => onCategoryChange(null)}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategoryId === null
                ? 'bg-[#163B65] text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Semua Kategori
          </button>
          {categories.map((cat) => (
            <button
              key={cat.category_id}
              type="button"
              onClick={() => onCategoryChange(cat.category_id)}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategoryId === cat.category_id
                  ? 'bg-[#163B65] text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat.category_name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari nama usaha atau alamat..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#163B65]"
            />
          </div>

          <select
            aria-label="Urutkan UMKM"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as 'name' | 'rating' | 'reviews')}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#163B65]"
          >
            <option value="name">Urutkan: Nama A-Z</option>
            <option value="rating">Urutkan: Rating Tertinggi</option>
            <option value="reviews">Urutkan: Ulasan Terbanyak</option>
          </select>
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-44 bg-white border border-slate-200 rounded-xl p-5 animate-pulse" />
          ))}
        </div>
      ) : umkmList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-base font-semibold text-slate-900">Tidak ada UMKM yang cocok</p>
          <p className="mt-1 text-sm text-slate-500">
            Ubah kata kunci pencarian atau pilih kategori lain untuk melihat lokasi yang tersedia.
          </p>
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              onCategoryChange(null);
            }}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#163B65] hover:bg-[#0F2E52] rounded-lg transition-colors cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {umkmList.map((item) => (
            <article
              key={item.umkm_id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <span className="font-medium text-[#163B65]">{item.category_name}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-700">
                    <Star className="w-3.5 h-3.5 fill-[#D97706] text-[#D97706]" aria-hidden="true" />
                    {item.average_rating !== null ? item.average_rating.toFixed(1) : 'Baru'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{item.product_count} produk</span>
                </div>

                <h2 className="font-display text-base font-bold text-slate-900 leading-snug">
                  {item.business_name}
                </h2>
                <p className="mt-1.5 text-sm text-slate-600 line-clamp-2">{item.address}</p>
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                  {formatCoords(item.latitude, item.longitude)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onViewOnMap(item.umkm_id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Peta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectUmkm(item.umkm_id)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-white bg-[#163B65] hover:bg-[#0F2E52] rounded-md transition-colors cursor-pointer"
                  >
                    Detail
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
