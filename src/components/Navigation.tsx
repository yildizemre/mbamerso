import { Link, useLocation } from 'react-router-dom';
import { Users, UserPlus, Trophy, Moon, Sun, LayoutGrid, ClipboardList } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSport } from '../context/SportContext';

export default function Navigation() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { selectedSport, setSelectedSport, availableSports } = useSport();

  const navItems = [
    { path: '/', label: 'Takımlar', icon: Trophy },
    { path: '/league', label: 'Lig', icon: LayoutGrid },
    { path: '/reports', label: 'Raporlar', icon: ClipboardList },
    { path: '/players', label: 'Oyuncular', icon: Users },
    { path: '/add-player', label: 'Yeni Oyuncu', icon: UserPlus },
  ];

  return (
    <header className="sticky top-0 z-50 safe-x pt-3 pb-2 sm:pt-4">
      <nav className="surface-nav mx-auto flex max-w-7xl items-center justify-between gap-2 rounded-2xl px-2.5 py-2 sm:gap-3 sm:px-4 sm:py-2.5 md:px-5">
        <Link
          to="/"
          className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-xl py-1 pr-1 transition-opacity hover:opacity-95 sm:min-w-0 sm:max-w-[16rem] sm:flex-none sm:gap-3 sm:pr-2"
        >
          <div className="relative">
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-emerald-500/40 to-teal-600/20 opacity-0 blur-md transition-opacity group-hover:opacity-100" />
            <img
              src="/images.jpg"
              alt="MAB"
              className="relative h-8 w-8 rounded-xl object-cover ring-2 ring-white/10 transition-transform duration-300 group-hover:scale-[1.02] sm:h-9 sm:w-9"
            />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight text-white sm:text-[15px]">
              MAB Futbol
            </h1>
            <p className="hidden truncate text-[10px] font-medium text-zinc-500 sm:block">Takım oluşturucu</p>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-0.5 overflow-x-auto pb-0.5 sm:gap-1 md:gap-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <label className="sr-only" htmlFor="nav-sport">
            Branş
          </label>
          <select
            id="nav-sport"
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            className="touch-target mr-0.5 max-w-[9.5rem] shrink-0 cursor-pointer rounded-xl border border-white/10 bg-zinc-900/80 px-2 py-2 text-[11px] font-medium text-zinc-200 outline-none focus:border-emerald-500/40 sm:mr-1 sm:max-w-[11rem] sm:px-2.5 sm:text-xs"
            title="Branş"
          >
            {availableSports.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                className={`touch-target flex items-center justify-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-200 sm:px-3 ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/25'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-[1.125rem] w-[1.125rem] shrink-0 opacity-90 sm:h-4 sm:w-4" strokeWidth={1.5} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={toggleTheme}
            className="touch-target ml-0.5 flex items-center justify-center rounded-xl p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-amber-300 sm:ml-1"
            title={theme === 'dark' ? 'Açık mod' : 'Koyu mod'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <Moon className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </nav>
    </header>
  );
}
