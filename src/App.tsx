import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, MapPin, Search, Star } from 'lucide-react';
import { AdminWorkspace } from './components/AdminWorkspace';
import { AuthModal } from './components/AuthModal';
import { DirectoryView } from './components/DirectoryView';
import { Navbar, type ActiveTab } from './components/Navbar';
import { UmkmDetailDrawer } from './components/UmkmDetailDrawer';
import { UmkmMap } from './components/UmkmMap';
import { api, ApiError } from './lib/api';
import type { Category, DatabaseHealth, UmkmDetail, UmkmSummary, User } from './types';

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [umkmList, setUmkmList] = useState<UmkmSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [health, setHealth] = useState<DatabaseHealth | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'reviews'>('name');

  const [selectedUmkmId, setSelectedUmkmId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<UmkmDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [toast, setToast] = useState<ToastState | null>(null);

  const notify = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToast({ id, message, type });
    window.setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 3500);
  }, []);

  const loadCategoriesAndHealth = useCallback(async () => {
    try {
      const [catRes, healthRes, meUser] = await Promise.all([
        api.listCategories(),
        api.health(),
        api.me(),
      ]);
      setCategories(catRes.categories);
      setHealth(healthRes);
      setUser(meUser);
    } catch (err) {
      console.error('[Init Error]', err);
    }
  }, []);

  const loadUmkmList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await api.listUmkm({
        q: searchQuery.trim() || undefined,
        categoryId: selectedCategoryId,
        sort: sortBy,
      });
      setUmkmList(res.umkm);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Gagal memuat daftar UMKM.', 'error');
    } finally {
      setLoadingList(false);
    }
  }, [searchQuery, selectedCategoryId, sortBy, notify]);

  useEffect(() => {
    void loadCategoriesAndHealth();
  }, [loadCategoriesAndHealth]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUmkmList();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [loadUmkmList]);

  const handleSelectUmkm = useCallback(
    async (umkmId: number) => {
      setSelectedUmkmId(umkmId);
      setLoadingDetail(true);
      try {
        const res = await api.getUmkm(umkmId);
        setSelectedDetail(res.umkm);
      } catch (err) {
        notify(err instanceof ApiError ? err.message : 'Gagal memuat detail UMKM.', 'error');
        setSelectedUmkmId(null);
      } finally {
        setLoadingDetail(false);
      }
    },
    [notify]
  );

  const handleRefreshDetail = useCallback(
    async (umkmId: number) => {
      const [detailRes] = await Promise.all([api.getUmkm(umkmId), loadUmkmList()]);
      setSelectedDetail(detailRes.umkm);
    },
    [loadUmkmList]
  );

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
      if (activeTab === 'admin') {
        setActiveTab('map');
      }
      notify('Anda telah keluar dari akun.');
    } catch {
      notify('Gagal keluar dari sesi.', 'error');
    }
  };

  const handleAuthSuccess = (loggedUser: User, mode: 'login' | 'register') => {
    setUser(loggedUser);
    setAuthModalOpen(false);
    notify(
      mode === 'register'
        ? `Selamat datang, ${loggedUser.full_name}! Akun berhasil dibuat.`
        : `Berhasil masuk sebagai ${loggedUser.full_name}.`
    );
  };

  const handleViewOnMap = (umkmId: number) => {
    setActiveTab('map');
    void handleSelectUmkm(umkmId);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F6FB] text-slate-900">
      <Navbar
        activeTab={activeTab}
        onChangeTab={(tab) => {
          if (tab === 'admin' && user?.role !== 'admin') return;
          setActiveTab(tab);
        }}
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {activeTab === 'map' && (
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[390px_1fr] lg:h-[calc(100vh-4rem)] lg:overflow-hidden">
          {/* Left Panel: Search, Category Filters, List */}
          <aside className="bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col lg:h-full overflow-hidden order-2 lg:order-1">
            <div className="p-4 border-b border-slate-200 space-y-3 shrink-0">
              <div>
                <h1 className="font-display text-base font-bold text-slate-900">
                  Peta UMKM Kuliner Kota Pangkalpinang
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih titik di peta atau telusuri daftar usaha di bawah ini.
                </p>
              </div>

              <div className="relative">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama UMKM, jalan, atau menu..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#163B65] focus:bg-white"
                />
              </div>

              {/* Category Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(null)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCategoryId === null
                      ? 'bg-[#163B65] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Semua
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.category_id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.category_id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedCategoryId === cat.category_id
                        ? 'bg-[#163B65] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat.category_name}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                <span className="tabular-nums">
                  {umkmList.length} lokasi ditemukan
                </span>
                <select
                  aria-label="Urutkan daftar UMKM"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'rating' | 'reviews')}
                  className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="name">Nama A-Z</option>
                  <option value="rating">Rating Tertinggi</option>
                  <option value="reviews">Ulasan Terbanyak</option>
                </select>
              </div>
            </div>

            {/* Scrollable UMKM List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loadingList ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : umkmList.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-semibold text-slate-800">Tidak ada lokasi ditemukan</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Coba kata kunci atau kategori lain.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategoryId(null);
                    }}
                    className="mt-3 px-3 py-1.5 text-xs font-medium text-white bg-[#163B65] rounded-md cursor-pointer"
                  >
                    Reset Filter
                  </button>
                </div>
              ) : (
                umkmList.map((item) => {
                  const isSelected = item.umkm_id === selectedUmkmId;
                  return (
                    <button
                      key={item.umkm_id}
                      type="button"
                      onClick={() => void handleSelectUmkm(item.umkm_id)}
                      className={`w-full text-left p-4 transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <span className="font-medium text-[#163B65]">{item.category_name}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-700">
                          <Star
                            className="w-3 h-3 fill-[#D97706] text-[#D97706]"
                            aria-hidden="true"
                          />
                          {item.average_rating !== null ? item.average_rating.toFixed(1) : 'Baru'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{item.product_count} produk</span>
                      </div>

                      <div className="font-display text-sm font-bold text-slate-900 leading-snug">
                        {item.business_name}
                      </div>

                      <div className="mt-1 flex items-start gap-1.5 text-xs text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="line-clamp-2">{item.address}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Right Panel: Main Web GIS Map */}
          <main className="relative h-[52vh] lg:h-full w-full order-1 lg:order-2">
            <UmkmMap
              umkmList={umkmList}
              categories={categories}
              selectedId={selectedUmkmId}
              onSelectUmkm={(id) => void handleSelectUmkm(id)}
            />
          </main>
        </div>
      )}

      {activeTab === 'directory' && (
        <DirectoryView
          umkmList={umkmList}
          categories={categories}
          loading={loadingList}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={setSelectedCategoryId}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onSelectUmkm={(id) => void handleSelectUmkm(id)}
          onViewOnMap={handleViewOnMap}
        />
      )}

      {activeTab === 'admin' && user?.role === 'admin' && (
        <AdminWorkspace
          umkmList={umkmList}
          categories={categories}
          health={health}
          onDataChanged={loadUmkmList}
          onNotify={notify}
        />
      )}

      <UmkmDetailDrawer
        detail={selectedDetail}
        loading={loadingDetail}
        user={user}
        onClose={() => {
          setSelectedUmkmId(null);
          setSelectedDetail(null);
        }}
        onOpenAuth={() => setAuthModalOpen(true)}
        onRefreshDetail={handleRefreshDetail}
        onNotify={notify}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-opacity ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-white text-slate-900 border-slate-200'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
