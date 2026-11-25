export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateId(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatCoords(lat: number, lon: number): string {
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Makanan Berat': '#163B65',
  'Makanan Ringan': '#2563EB',
  Minuman: '#0284C7',
  'Kue dan Roti': '#4F46E5',
  Seafood: '#0F766E',
};

export function getCategoryColor(categoryName: string): string {
  return CATEGORY_COLORS[categoryName] ?? '#475569';
}
