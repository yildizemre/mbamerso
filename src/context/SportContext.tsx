import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { Player } from '../types/player';
import { sortSportLabels, SPORT_SHEET_ORDER } from '../utils/sports';

interface SportContextValue {
  selectedSport: string;
  setSelectedSport: (s: string) => void;
  availableSports: string[];
}

const SportContext = createContext<SportContextValue | null>(null);

export function SportProvider({
  players,
  children,
}: {
  players: Player[];
  children: ReactNode;
}) {
  const availableSports = useMemo(() => {
    const fromData = [...new Set(players.map((p) => p.sport))];
    const merged = new Set<string>([...SPORT_SHEET_ORDER, ...fromData]);
    return sortSportLabels([...merged]);
  }, [players]);

  const [selectedSport, setSelectedSport] = useState<string>(SPORT_SHEET_ORDER[0]);

  useEffect(() => {
    if (availableSports.length === 0) return;
    if (!availableSports.includes(selectedSport)) {
      setSelectedSport(availableSports[0]);
    }
  }, [availableSports, selectedSport]);

  const value = useMemo(
    () => ({ selectedSport, setSelectedSport, availableSports }),
    [selectedSport, availableSports]
  );

  return <SportContext.Provider value={value}>{children}</SportContext.Provider>;
}

export function useSport(): SportContextValue {
  const ctx = useContext(SportContext);
  if (!ctx) throw new Error('useSport must be used within SportProvider');
  return ctx;
}
