import { useState, useMemo } from 'react';
import { Search, Users as MaleIcon, UserCircle2 as FemaleIcon, Filter, Star, Trash2 } from 'lucide-react';
import { Player } from '../types/player';
import { useSport } from '../context/SportContext';

interface PlayersPageProps {
  players: Player[];
  onToggleFavorite: (playerId: string) => void;
  onDeletePlayer: (playerId: string) => void;
}

type FilterType = 'all' | 'male' | 'female';
type PositionFilter = 'all' | 'GK' | 'DEF' | 'MID' | 'FWD';

const positionNames: Record<string, string> = {
  GK: 'Kaleci',
  DEF: 'Defans',
  MID: 'Orta Saha',
  FWD: 'Forvet',
};

export default function PlayersPage({ players, onToggleFavorite, onDeletePlayer }: PlayersPageProps) {
  const { selectedSport } = useSport();

  const pool = useMemo(
    () => players.filter((p) => p.sport === selectedSport),
    [players, selectedSport]
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<FilterType>('all');
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('all');
  const [showFavorites, setShowFavorites] = useState(false);

  const filteredPlayers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return pool.filter((player) => {
      const ex = player.excel;
      const matchesSearch =
        term === '' ||
        player.name.toLowerCase().includes(term) ||
        String(ex?.participantNo ?? '').includes(term) ||
        (ex?.lokasyon && ex.lokasyon.toLowerCase().includes(term)) ||
        (ex?.statu && ex.statu.toLowerCase().includes(term)) ||
        (ex?.mevkiRaw && ex.mevkiRaw.toLowerCase().includes(term));
      const matchesGender = genderFilter === 'all' || player.gender === genderFilter;
      const matchesPosition = positionFilter === 'all' || player.position === positionFilter;
      const matchesFavorite = !showFavorites || player.is_favorite;
      return matchesSearch && matchesGender && matchesPosition && matchesFavorite;
    });
  }, [pool, searchTerm, genderFilter, positionFilter, showFavorites]);

  const stats = useMemo(() => {
    return {
      total: pool.length,
      male: pool.filter((p) => p.gender === 'male').length,
      female: pool.filter((p) => p.gender === 'female').length,
      favorites: pool.filter((p) => p.is_favorite).length,
    };
  }, [pool]);

  const getRatingColor = (rating: number) => {
    if (rating >= 80) return 'text-emerald-400 bg-emerald-500/10';
    if (rating >= 65) return 'text-yellow-400 bg-yellow-500/10';
    return 'text-orange-400 bg-orange-500/10';
  };

  return (
    <div className="min-h-screen">
      <div className="safe-x safe-b mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-6 animate-fadeIn sm:mb-8">
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">
            Oyuncu kadrosu
          </h1>
          <p className="text-sm text-zinc-400">
            {selectedSport} · {stats.total} oyuncu · {stats.male} erkek · {stats.female} kadın
          </p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 sm:left-4"
              strokeWidth={1.5}
            />
            <input
              type="search"
              enterKeyHint="search"
              placeholder="İsim, katılımcı no, lokasyon, statü…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-modern min-h-[2.75rem] pl-10 sm:pl-11"
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                <span className="text-xs font-medium text-zinc-500">Cinsiyet</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'male', 'female'] as FilterType[]).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setGenderFilter(filter)}
                    className={`touch-target rounded-lg px-3 py-2 text-xs font-medium transition-all sm:py-1.5 ${
                      genderFilter === filter
                        ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                        : 'border border-transparent bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {filter === 'all' ? 'Tümü' : filter === 'male' ? 'Erkek' : 'Kadın'}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-500">Pozisyon</span>
              </div>
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
                {(['all', 'GK', 'DEF', 'MID', 'FWD'] as PositionFilter[]).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setPositionFilter(filter)}
                    className={`shrink-0 touch-target rounded-lg px-3 py-2 text-xs font-medium transition-all whitespace-nowrap sm:py-1.5 ${
                      positionFilter === filter
                        ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                        : 'border border-transparent bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {filter === 'all' ? 'Tümü' : positionNames[filter]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowFavorites(!showFavorites)}
                className={`touch-target flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-all sm:inline-flex sm:w-auto sm:justify-start sm:py-1.5 ${
                  showFavorites
                    ? 'border border-yellow-500/20 bg-yellow-500/10 text-yellow-400'
                    : 'border border-transparent bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Star className={`h-3.5 w-3.5 ${showFavorites ? 'fill-yellow-400' : ''}`} strokeWidth={1.5} />
                <span>Favoriler ({stats.favorites})</span>
              </button>
            </div>
          </div>
        </div>

        {filteredPlayers.length === 0 ? (
          <div className="surface-panel rounded-2xl py-16 text-center">
            <p className="text-sm text-zinc-500">Oyuncu bulunamadı</p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-zinc-500">
                <span className="font-medium tabular-nums text-white">{filteredPlayers.length}</span> oyuncu
                gösteriliyor
              </p>
              <p className="text-[11px] text-zinc-600 md:hidden">Tabloyu yatay kaydırın</p>
            </div>
            <div className="surface-panel overflow-hidden rounded-2xl">
              <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
                <table className="w-full min-w-[72rem] text-left">
                  <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm">
                    <tr className="border-b border-white/10">
                      <th className="px-2 py-3 text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:px-3 sm:text-[11px] whitespace-nowrap">
                        #
                      </th>
                      <th className="px-2 py-3 text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:px-3 sm:text-[11px] whitespace-nowrap">
                        Kat. No
                      </th>
                      <th className="px-2 py-3 text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:px-3 sm:text-[11px] whitespace-nowrap">
                        Ad
                      </th>
                      <th className="px-2 py-3 text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:px-3 sm:text-[11px] whitespace-nowrap">
                        Doğum
                      </th>
                      <th className="px-2 py-3 text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:px-3 sm:text-[11px] whitespace-nowrap">
                        Statü
                      </th>
                      <th className="px-2 py-3 text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:px-3 sm:text-[11px] whitespace-nowrap">
                        Lokasyon
                      </th>
                      <th className="px-2 py-3 text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:px-3 sm:text-[11px] whitespace-nowrap">
                        Boy
                      </th>
                      <th className="px-2 py-3 text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:px-3 sm:text-[11px] whitespace-nowrap">
                        Kilo
                      </th>
                      <th className="px-2 py-3 text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:px-3 sm:text-[11px] whitespace-nowrap">
                        Mevki (form)
                      </th>
                      <th className="px-2 py-3 text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:px-3 sm:text-[11px] whitespace-nowrap">
                        Ayak
                      </th>
                      <th className="px-2 py-3 text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:px-3 sm:text-[11px] whitespace-nowrap">
                        Pozisyon
                      </th>
                      <th className="px-2 py-3 text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:px-3 sm:text-[11px] whitespace-nowrap">
                        Rating
                      </th>
                      <th className="px-2 py-3 text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:px-3 sm:text-[11px] whitespace-nowrap">
                        Cinsiyet
                      </th>
                      <th className="px-2 py-3 text-center text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:px-3 sm:text-[11px] whitespace-nowrap">
                        Favori
                      </th>
                      <th className="px-2 py-3 text-center text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:px-3 sm:text-[11px] whitespace-nowrap">
                        Sil
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredPlayers.map((player, idx) => {
                      const ex = player.excel;
                      const dash = '—';
                      return (
                        <tr key={player.id} className="transition-colors hover:bg-white/5">
                          <td className="px-2 py-3 text-xs tabular-nums text-zinc-500 sm:px-3 whitespace-nowrap">
                            {idx + 1}
                          </td>
                          <td className="px-2 py-3 text-xs tabular-nums text-zinc-300 sm:px-3 whitespace-nowrap">
                            {ex ? String(ex.participantNo) : dash}
                          </td>
                          <td
                            className="max-w-[120px] truncate px-2 py-3 text-sm font-medium whitespace-nowrap text-white sm:max-w-[140px] sm:px-3"
                            title={player.name}
                          >
                            {player.name}
                          </td>
                          <td className="px-2 py-3 text-xs whitespace-nowrap text-zinc-400 sm:px-3">
                            {ex?.dogumTarihi || dash}
                          </td>
                          <td
                            className="max-w-[100px] truncate px-2 py-3 text-xs text-zinc-400 sm:max-w-[120px] sm:px-3"
                            title={ex?.statu}
                          >
                            {ex?.statu || dash}
                          </td>
                          <td
                            className="max-w-[88px] truncate px-2 py-3 text-xs text-zinc-400 sm:max-w-[100px] sm:px-3"
                            title={ex?.lokasyon}
                          >
                            {ex?.lokasyon || dash}
                          </td>
                          <td className="px-2 py-3 text-xs tabular-nums whitespace-nowrap text-zinc-400 sm:px-3">
                            {ex?.boyCm != null ? `${ex.boyCm}` : dash}
                          </td>
                          <td className="px-2 py-3 text-xs tabular-nums whitespace-nowrap text-zinc-400 sm:px-3">
                            {ex?.kiloKg != null ? `${ex.kiloKg}` : dash}
                          </td>
                          <td className="px-2 py-3 text-xs whitespace-nowrap text-zinc-400 sm:px-3">
                            {ex?.mevkiRaw || dash}
                          </td>
                          <td className="px-2 py-3 text-xs whitespace-nowrap text-zinc-400 sm:px-3">
                            {ex?.baskinAyak || dash}
                          </td>
                          <td className="px-2 py-3 sm:px-3">
                            <span className="inline-flex items-center rounded border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium whitespace-nowrap text-zinc-300">
                              {positionNames[player.position]}
                            </span>
                          </td>
                          <td className="px-2 py-3 sm:px-3">
                            <span
                              className={`inline-flex items-center rounded px-2 py-1 text-xs font-semibold tabular-nums ${getRatingColor(player.rating)}`}
                            >
                              {player.rating}
                            </span>
                          </td>
                          <td className="px-2 py-3 sm:px-3">
                            <div className="flex items-center space-x-1.5">
                              {player.gender === 'male' ? (
                                <>
                                  <MaleIcon className="h-3.5 w-3.5 shrink-0 text-zinc-500" strokeWidth={1.5} />
                                  <span className="text-xs text-zinc-400">Erkek</span>
                                </>
                              ) : (
                                <>
                                  <FemaleIcon className="h-3.5 w-3.5 shrink-0 text-zinc-500" strokeWidth={1.5} />
                                  <span className="text-xs text-zinc-400">Kadın</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-3 text-center sm:px-3">
                            <button
                              type="button"
                              onClick={() => onToggleFavorite(player.id)}
                              className="touch-target inline-flex items-center justify-center rounded-lg hover:bg-white/5"
                              aria-label="Favori"
                            >
                              <Star
                                className={`h-4 w-4 ${
                                  player.is_favorite
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-zinc-600 hover:text-yellow-400'
                                }`}
                                strokeWidth={1.5}
                              />
                            </button>
                          </td>
                          <td className="px-2 py-3 text-center sm:px-3">
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `${player.name} oyuncusunu silmek istediğinize emin misiniz?`
                                  )
                                ) {
                                  onDeletePlayer(player.id);
                                }
                              }}
                              className="touch-target inline-flex items-center justify-center rounded-lg hover:bg-red-500/10"
                              aria-label="Sil"
                            >
                              <Trash2
                                className="h-4 w-4 text-zinc-600 hover:text-red-400"
                                strokeWidth={1.5}
                              />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
