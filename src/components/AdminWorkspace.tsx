import { useState, type FormEvent } from 'react';
import { Edit3, Package, Plus, Trash2, X } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { formatCoords, formatRupiah } from '../lib/format';
import type { Category, DatabaseHealth, UmkmDetail, UmkmSummary } from '../types';
import { PANGKALPINANG_CENTER, UmkmMap } from './UmkmMap';

interface AdminWorkspaceProps {
  umkmList: UmkmSummary[];
  categories: Category[];
  health: DatabaseHealth | null;
  onDataChanged: () => Promise<void>;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

interface UmkmFormState {
  umkm_id: number | null;
  category_id: number;
  business_name: string;
  owner_name: string;
  address: string;
  latitude: string;
  longitude: string;
  phone_number: string;
  opening_hours: string;
  description: string;
}

export function AdminWorkspace({
  umkmList,
  categories,
  health,
  onDataChanged,
  onNotify,
}: AdminWorkspaceProps) {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [savingUmkm, setSavingUmkm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [form, setForm] = useState<UmkmFormState>({
    umkm_id: null,
    category_id: categories[0]?.category_id ?? 1,
    business_name: '',
    owner_name: '',
    address: '',
    latitude: String(PANGKALPINANG_CENTER[0]),
    longitude: String(PANGKALPINANG_CENTER[1]),
    phone_number: '',
    opening_hours: '',
    description: '',
  });

  // Product modal state
  const [productTarget, setProductTarget] = useState<UmkmDetail | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);

  const filtered = umkmList.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.business_name.toLowerCase().includes(q) ||
      item.address.toLowerCase().includes(q) ||
      item.category_name.toLowerCase().includes(q)
    );
  });

  const avgCityRating = (() => {
    const rated = umkmList.filter((u) => u.average_rating !== null);
    if (rated.length === 0) return '-';
    const sum = rated.reduce((acc, u) => acc + (u.average_rating ?? 0), 0);
    return (sum / rated.length).toFixed(2);
  })();

  const openCreateForm = () => {
    setForm({
      umkm_id: null,
      category_id: categories[0]?.category_id ?? 1,
      business_name: '',
      owner_name: '',
      address: '',
      latitude: String(PANGKALPINANG_CENTER[0]),
      longitude: String(PANGKALPINANG_CENTER[1]),
      phone_number: '',
      opening_hours: '',
      description: '',
    });
    setFormOpen(true);
  };

  const openEditForm = (item: UmkmSummary) => {
    setForm({
      umkm_id: item.umkm_id,
      category_id: item.category_id,
      business_name: item.business_name,
      owner_name: item.owner_name ?? '',
      address: item.address,
      latitude: String(item.latitude),
      longitude: String(item.longitude),
      phone_number: item.phone_number ?? '',
      opening_hours: item.opening_hours ?? '',
      description: item.description ?? '',
    });
    setFormOpen(true);
  };

  const handleSaveUmkm = async (e: FormEvent) => {
    e.preventDefault();
    const lat = Number(form.latitude);
    const lon = Number(form.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      onNotify('Koordinat latitude dan longitude harus berupa angka valid.', 'error');
      return;
    }

    setSavingUmkm(true);
    try {
      const payload = {
        category_id: Number(form.category_id),
        business_name: form.business_name.trim(),
        owner_name: form.owner_name.trim() || null,
        address: form.address.trim(),
        latitude: lat,
        longitude: lon,
        phone_number: form.phone_number.trim() || null,
        opening_hours: form.opening_hours.trim() || null,
        description: form.description.trim() || null,
      };

      if (form.umkm_id === null) {
        await api.createUmkm(payload);
        onNotify('UMKM baru berhasil ditambahkan.');
      } else {
        await api.updateUmkm(form.umkm_id, payload);
        onNotify('Data UMKM berhasil diperbarui.');
      }

      setFormOpen(false);
      await onDataChanged();
    } catch (err) {
      onNotify(err instanceof ApiError ? err.message : 'Gagal menyimpan data UMKM.', 'error');
    } finally {
      setSavingUmkm(false);
    }
  };

  const handleConfirmDeleteUmkm = async (umkmId: number) => {
    try {
      await api.deleteUmkm(umkmId);
      setDeletingId(null);
      await onDataChanged();
      onNotify('Data UMKM berhasil dihapus.');
    } catch (err) {
      onNotify(err instanceof ApiError ? err.message : 'Gagal menghapus UMKM.', 'error');
    }
  };

  const openProductModal = async (umkmId: number) => {
    setLoadingProducts(true);
    setProdName('');
    setProdPrice('');
    setProdDesc('');
    try {
      const res = await api.getUmkm(umkmId);
      setProductTarget(res.umkm);
    } catch (err) {
      onNotify(err instanceof ApiError ? err.message : 'Gagal memuat produk.', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleAddProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!productTarget) return;
    setSavingProduct(true);
    try {
      await api.createProduct(productTarget.umkm_id, {
        product_name: prodName.trim(),
        price: Number(prodPrice),
        description: prodDesc.trim() || null,
      });
      setProdName('');
      setProdPrice('');
      setProdDesc('');
      const refreshed = await api.getUmkm(productTarget.umkm_id);
      setProductTarget(refreshed.umkm);
      await onDataChanged();
      onNotify('Produk ditambahkan.');
    } catch (err) {
      onNotify(err instanceof ApiError ? err.message : 'Gagal menambahkan produk.', 'error');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!productTarget) return;
    try {
      await api.deleteProduct(productId);
      const refreshed = await api.getUmkm(productTarget.umkm_id);
      setProductTarget(refreshed.umkm);
      await onDataChanged();
      onNotify('Produk dihapus.');
    } catch (err) {
      onNotify(err instanceof ApiError ? err.message : 'Gagal menghapus produk.', 'error');
    }
  };

  const parsedLat = Number(form.latitude);
  const parsedLon = Number(form.longitude);
  const pickerCoords =
    !Number.isNaN(parsedLat) && !Number.isNaN(parsedLon)
      ? { latitude: parsedLat, longitude: parsedLon }
      : { latitude: PANGKALPINANG_CENTER[0], longitude: PANGKALPINANG_CENTER[1] };

  return (
    <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Manajemen Data UMKM Pangkalpinang
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Tambah, ubah titik koordinat peta, dan kelola katalog produk UMKM pada database.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#163B65] hover:bg-[#0F2E52] rounded-lg transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Tambah UMKM</span>
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Total Lokasi UMKM</div>
          <div className="mt-1 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {umkmList.length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Kategori Kuliner</div>
          <div className="mt-1 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {categories.length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Rata-Rata Rating</div>
          <div className="mt-1 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {avgCityRating}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Driver Database Aktif</div>
          <div className="mt-1 font-mono text-sm font-semibold text-slate-900 uppercase">
            {health ? `${health.driver} (${health.ok ? 'Terhubung' : 'Gangguan'})` : 'Memeriksa...'}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold text-slate-900">Daftar Usaha Terdaftar</h2>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter nama usaha atau alamat..."
            className="w-full sm:w-72 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#163B65]"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Nama Usaha</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Koordinat (Lat, Lon)</th>
                <th className="py-3 px-4 text-right">Produk</th>
                <th className="py-3 px-4 text-right">Rating</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Tidak ada data UMKM yang ditemukan.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.umkm_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.business_name}</div>
                      <div className="text-xs text-slate-500 truncate max-w-xs">{item.address}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{item.category_name}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {formatCoords(item.latitude, item.longitude)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {item.product_count}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {item.average_rating !== null ? item.average_rating.toFixed(1) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {deletingId === item.umkm_id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleConfirmDeleteUmkm(item.umkm_id)}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded cursor-pointer"
                          >
                            Ya, Hapus
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openProductModal(item.umkm_id)}
                            title="Kelola Produk"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
                          >
                            <Package className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Produk</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditForm(item)}
                            title="Ubah UMKM"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Ubah</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(item.umkm_id)}
                            title="Hapus UMKM"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit UMKM dengan Pemilih Koordinat Peta */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-display text-lg font-bold text-slate-900">
                {form.umkm_id === null ? 'Tambah Lokasi UMKM Baru' : 'Ubah Data UMKM'}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Tutup form UMKM"
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUmkm} className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Usaha *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.business_name}
                    onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                    placeholder="Contoh: Warung Lempah Kuning ..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#163B65]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Kategori *
                    </label>
                    <select
                      value={form.category_id}
                      onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#163B65]"
                    >
                      {categories.map((cat) => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nama Pemilik
                    </label>
                    <input
                      type="text"
                      value={form.owner_name}
                      onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                      placeholder="Opsional"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#163B65]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Alamat Lengkap *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Jalan, Kelurahan, Kecamatan, Kota Pangkalpinang"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#163B65]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nomor Telepon
                    </label>
                    <input
                      type="text"
                      value={form.phone_number}
                      onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                      placeholder="08xxxxxxxxxx"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#163B65]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Jam Operasional
                    </label>
                    <input
                      type="text"
                      value={form.opening_hours}
                      onChange={(e) => setForm({ ...form, opening_hours: e.target.value })}
                      placeholder="08.00 - 21.00 WIB"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#163B65]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Deskripsi Usaha
                  </label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Deskripsi singkat menu unggulan atau ciri khas usaha..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#163B65]"
                  />
                </div>
              </div>

              {/* Right Column: Map Coordinate Picker */}
              <div className="flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">
                      Pilih Titik Lokasi di Peta Pangkalpinang
                    </span>
                    <span className="text-[11px] text-slate-500">Klik peta atau geser pin</span>
                  </div>
                  <div className="h-64 rounded-lg border border-slate-200 overflow-hidden">
                    <UmkmMap
                      pickerMode
                      pickerCoords={pickerCoords}
                      onPickLocation={(lat, lon) =>
                        setForm((prev) => ({
                          ...prev,
                          latitude: String(lat),
                          longitude: String(lon),
                        }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Latitude *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={form.latitude}
                        onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                        className="w-full px-3 py-2 font-mono text-xs border border-slate-300 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-[#163B65]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Longitude *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={form.longitude}
                        onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                        className="w-full px-3 py-2 font-mono text-xs border border-slate-300 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-[#163B65]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingUmkm}
                    className="px-4 py-2 text-sm font-semibold text-white bg-[#163B65] hover:bg-[#0F2E52] disabled:opacity-60 rounded-lg cursor-pointer"
                  >
                    {savingUmkm ? 'Menyimpan...' : 'Simpan Data UMKM'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kelola Produk */}
      {(productTarget || loadingProducts) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Kelola Produk UMKM
                </h2>
                {productTarget && (
                  <p className="text-xs text-slate-500 mt-0.5">{productTarget.business_name}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setProductTarget(null)}
                aria-label="Tutup modal produk"
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingProducts || !productTarget ? (
              <div className="p-6 text-sm text-slate-500">Memuat daftar produk...</div>
            ) : (
              <div className="p-6 space-y-5">
                <form onSubmit={handleAddProduct} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="text-xs font-semibold text-slate-700">Tambah Produk Baru</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      required
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="Nama produk / menu"
                      className="sm:col-span-2 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#163B65]"
                    />
                    <input
                      type="number"
                      min={0}
                      step={500}
                      required
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      placeholder="Harga (Rp)"
                      className="px-3 py-2 font-mono text-sm bg-white border border-slate-300 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-[#163B65]"
                    />
                  </div>
                  <input
                    type="text"
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    placeholder="Deskripsi singkat produk (opsional)"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#163B65]"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={savingProduct}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-[#163B65] hover:bg-[#0F2E52] disabled:opacity-60 rounded-lg cursor-pointer"
                    >
                      {savingProduct ? 'Menambah...' : 'Tambah Produk'}
                    </button>
                  </div>
                </form>

                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {productTarget.products.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">
                      Belum ada produk untuk UMKM ini.
                    </p>
                  ) : (
                    productTarget.products.map((prod) => (
                      <div key={prod.product_id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900">{prod.product_name}</div>
                          {prod.description && (
                            <div className="text-xs text-slate-500 truncate">{prod.description}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-xs font-semibold text-[#163B65] tabular-nums">
                            {formatRupiah(prod.price)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(prod.product_id)}
                            aria-label={`Hapus ${prod.product_name}`}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
