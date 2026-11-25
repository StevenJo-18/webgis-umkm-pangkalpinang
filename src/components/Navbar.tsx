import { LogOut, User as UserIcon } from 'lucide-react';
import type { User } from '../types';

export type ActiveTab = 'map' | 'directory' | 'admin';

interface NavbarProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export function Navbar({ activeTab, onChangeTab, user, onOpenAuth, onLogout }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
      {/* Zone 1: Single-line brand wordmark */}
      <button
        type="button"
        onClick={() => onChangeTab('map')}
        className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#163B65] rounded"
      >
        UMKM Pangkalpinang
      </button>

      {/* Zone 2: Concise single-line navigation links */}
      <nav aria-label="Navigasi utama" className="flex items-center gap-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => onChangeTab('map')}
          className={`py-1 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'map'
              ? 'text-[#163B65] border-[#163B65]'
              : 'text-slate-600 border-transparent hover:text-slate-900'
          }`}
        >
          Peta Lokasi
        </button>
        <button
          type="button"
          onClick={() => onChangeTab('directory')}
          className={`py-1 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'directory'
              ? 'text-[#163B65] border-[#163B65]'
              : 'text-slate-600 border-transparent hover:text-slate-900'
          }`}
        >
          Direktori
        </button>
        {user?.role === 'admin' && (
          <button
            type="button"
            onClick={() => onChangeTab('admin')}
            className={`py-1 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'admin'
                ? 'text-[#163B65] border-[#163B65]'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            Kelola Data
          </button>
        )}
      </nav>

      {/* Zone 3: Single primary action */}
      <div className="flex items-center gap-3 shrink-0">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-700 whitespace-nowrap">
              <UserIcon className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span className="font-medium max-w-[140px] truncate">{user.full_name}</span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="text-xs text-slate-500 capitalize">{user.role}</span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>Keluar</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#163B65] hover:bg-[#0F2E52] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#163B65]"
          >
            Masuk / Daftar
          </button>
        )}
      </div>
    </header>
  );
}
