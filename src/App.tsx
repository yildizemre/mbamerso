import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import TeamsPage from './pages/TeamsPage';
import PlayersPage from './pages/PlayersPage';
import AddPlayerPage from './pages/AddPlayerPage';
import LeaguePage from './pages/LeaguePage';
import ReportsPage from './pages/ReportsPage';
import LoginPage from './pages/LoginPage';
import { Player } from './types/player';
import { loadPlayersFromPublicXlsx } from './utils/loadParticipantsFromXlsx';
import { ThemeProvider } from './context/ThemeContext';
import { SportProvider } from './context/SportContext';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [playersError, setPlayersError] = useState<string | null>(null);

  const reloadPlayers = useCallback(() => {
    setPlayersLoading(true);
    setPlayersError(null);
    loadPlayersFromPublicXlsx()
      .then(setPlayers)
      .catch((e: unknown) => {
        setPlayersError(e instanceof Error ? e.message : 'Katılımcı listesi yüklenemedi');
      })
      .finally(() => setPlayersLoading(false));
  }, []);

  useEffect(() => {
    reloadPlayers();
  }, [reloadPlayers]);

  const addPlayers = useCallback((list: Omit<Player, 'id'>[]) => {
    const ts = Date.now();
    setPlayers((prev) => [
      ...prev,
      ...list.map((p, i) => ({
        ...p,
        id: `custom-${ts}-${i}`,
      })),
    ]);
  }, []);

  const toggleFavorite = (playerId: string) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, is_favorite: !p.is_favorite } : p))
    );
  };

  const deletePlayer = (playerId: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  };

  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <LoginPage onLogin={() => setIsAuthenticated(true)} />
      </ThemeProvider>
    );
  }

  if (playersLoading) {
    return (
      <ThemeProvider>
        <div className="app-shell safe-x safe-b flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-4">
          <div className="h-11 w-11 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-400 shadow-glow-sm" />
          <p className="text-sm font-medium text-zinc-400">Katılımcı listesi yükleniyor…</p>
        </div>
      </ThemeProvider>
    );
  }

  if (playersError) {
    return (
      <ThemeProvider>
        <div className="app-shell safe-x safe-b mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="font-medium text-white">Liste yüklenemedi</p>
          <p className="text-sm text-zinc-500">{playersError}</p>
          <button type="button" onClick={reloadPlayers} className="btn-primary">
            Tekrar dene
          </button>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <SportProvider players={players}>
          <div className="app-shell min-h-[100dvh]">
            <Navigation />
            <Routes>
              <Route path="/" element={<TeamsPage players={players} />} />
              <Route
                path="/players"
                element={
                  <PlayersPage
                    players={players}
                    onToggleFavorite={toggleFavorite}
                    onDeletePlayer={deletePlayer}
                  />
                }
              />
              <Route path="/add-player" element={<AddPlayerPage onAddPlayers={addPlayers} />} />
              <Route path="/league" element={<LeaguePage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </SportProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
