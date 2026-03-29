import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Upload, FileSpreadsheet } from 'lucide-react';
import type { Player, Position } from '../types/player';
import { buildManualParticipantExcel } from '../utils/participantRowMapping';
import { playersFromUploadedTournamentWorkbook } from '../utils/loadParticipantsFromXlsx';
import { useSport } from '../context/SportContext';

interface AddPlayerPageProps {
  onAddPlayers: (players: Omit<Player, 'id'>[]) => void;
}

const MEVKI_ROWS: { pos: Position; raw: string }[] = [
  { pos: 'GK', raw: 'Kaleci' },
  { pos: 'DEF', raw: 'Defans' },
  { pos: 'MID', raw: 'Orta Saha' },
  { pos: 'FWD', raw: 'Forvet' },
];

const FOOT_OPTIONS = ['Sağ Ayak', 'Sol Ayak', 'İki ayak'];

function dateInputToTr(iso: string): string {
  if (!iso.trim()) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('tr-TR');
}

function parseParticipantNoInput(raw: string): string | number {
  const t = raw.trim();
  if (!t) return `M-${Date.now()}`;
  const n = Number(t);
  if (Number.isFinite(n) && String(n) === t) return n;
  return t;
}

export default function AddPlayerPage({ onAddPlayers }: AddPlayerPageProps) {
  const navigate = useNavigate();
  const { selectedSport, availableSports, setSelectedSport } = useSport();
  const [sport, setSport] = useState(selectedSport);

  useEffect(() => {
    setSport(selectedSport);
  }, [selectedSport]);

  const [participantNo, setParticipantNo] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState(50);
  const [birthIso, setBirthIso] = useState('');
  const [statu, setStatu] = useState('');
  const [lokasyon, setLokasyon] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [boyCm, setBoyCm] = useState('');
  const [kiloKg, setKiloKg] = useState('');
  const [position, setPosition] = useState<Position>('MID');
  const [mevkiRaw, setMevkiRaw] = useState('Orta Saha');
  const [baskinAyak, setBaskinAyak] = useState('Sağ Ayak');
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');

  const applyMevki = (pos: Position, raw: string) => {
    setPosition(pos);
    setMevkiRaw(raw);
  };

  const resetForm = () => {
    setParticipantNo('');
    setName('');
    setEmail('');
    setRating(50);
    setBirthIso('');
    setStatu('');
    setLokasyon('');
    setGender('male');
    setBoyCm('');
    setKiloKg('');
    setPosition('MID');
    setMevkiRaw('Orta Saha');
    setBaskinAyak('Sağ Ayak');
  };

  const getRatingColor = (r: number) => {
    if (r >= 80) return 'text-emerald-400';
    if (r >= 65) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const pNo = parseParticipantNoInput(participantNo);
    const excel = buildManualParticipantExcel({
      participantNo: pNo,
      email: email.trim(),
      puanlamaRaw: rating,
      dogumTarihi: dateInputToTr(birthIso),
      statu: statu.trim(),
      lokasyon: lokasyon.trim(),
      cinsiyetRaw: gender === 'male' ? 'Erkek' : 'Kadın',
      boyCm:
        boyCm.trim() === '' || !Number.isFinite(Number(boyCm)) ? null : Number(boyCm),
      kiloKg:
        kiloKg.trim() === '' || !Number.isFinite(Number(kiloKg)) ? null : Number(kiloKg),
      mevkiRaw,
      baskinAyak,
    });

    onAddPlayers([
      {
        name: name.trim(),
        gender,
        position,
        rating,
        is_favorite: false,
        sport,
        excel,
      },
    ]);

    setShowSuccess(true);
    resetForm();
    setTimeout(() => setShowSuccess(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buf = event.target?.result as ArrayBuffer;
        const imported = playersFromUploadedTournamentWorkbook(buf);
        if (imported.length === 0) {
          alert('Dosyada geçerli satır bulunamadı. Turnuva Excel şablonu ile aynı sütun düzenini kullanın.');
          return;
        }
        const list: Omit<Player, 'id'>[] = imported.map(({ id: _id, ...rest }) => rest);
        onAddPlayers(list);
        setUploadSuccess(`${imported.length} katılımcı eklendi.`);
        setTimeout(() => setUploadSuccess(''), 4000);
      } catch {
        alert('Excel dosyası okunamadı. Şablonla aynı sütun sırasını kullanın.');
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen">
      <div className="safe-x safe-b mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 animate-fadeIn">
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Yeni oyuncu
          </h1>
          <p className="text-sm text-zinc-400">
            Turnuva Excel’indeki alanlarla uyumlu bilgi girin veya aynı formatta dosya yükleyin.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-4 sm:p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <div className="rounded-xl bg-emerald-500/20 p-3">
              <FileSpreadsheet className="h-6 w-6 text-emerald-400" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h3 className="mb-2 text-sm font-medium text-white">Excel’den toplu ekle</h3>
              <p className="mb-4 text-xs leading-relaxed text-zinc-400">
                <span className="text-emerald-400/90">
                  Turnuva dosyasındaki tüm branş sekmeleri (Futbol, Voleybol, …) okunur; Pivot sayfası
                  atlanır. Sütunlar branşa göre değişebilir; ilk satır başlık kabul edilir.
                </span>
              </p>
              <label className="btn-primary w-full cursor-pointer justify-center px-4 py-2.5 text-sm sm:w-auto">
                <Upload className="h-4 w-4" strokeWidth={1.5} />
                Excel yükle
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {uploadSuccess && (
          <div className="mb-6 flex animate-fadeIn items-center space-x-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="rounded-full bg-emerald-500/20 p-1.5">
              <Check className="h-4 w-4 text-emerald-400" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-medium text-emerald-400">{uploadSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="surface-panel rounded-2xl p-4 sm:p-6">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Branş
            </h3>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                Bu kayıt hangi branş için? <span className="text-red-400">*</span>
              </label>
              <select
                value={sport}
                onChange={(e) => {
                  const v = e.target.value;
                  setSport(v);
                  setSelectedSport(v);
                }}
                className="input-modern min-h-[2.75rem] w-full cursor-pointer"
                required
              >
                {availableSports.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] text-zinc-500">
                Üst menüdeki branş seçimiyle aynı; değişince uygulama genelinde o branşa geçilir.
              </p>
            </div>
          </div>

          <div className="surface-panel rounded-2xl p-4 sm:p-6">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Kimlik ve iletişim
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Katılımcı numarası <span className="text-zinc-500">(isteğe bağlı)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={participantNo}
                  onChange={(e) => setParticipantNo(e.target.value)}
                  placeholder="Boş bırakılırsa otomatik no"
                  className="input-modern"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Ad soyad <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ad ve soyad"
                  className="input-modern"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">E-posta</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@email.com"
                  className="input-modern"
                  autoComplete="email"
                />
              </div>
            </div>
          </div>

          <div className="surface-panel rounded-2xl p-4 sm:p-6">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Turnuva bilgileri
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Puanlama (1–100)</label>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className={`text-2xl font-semibold tabular-nums ${getRatingColor(rating)}`}>
                    {rating}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={rating}
                  onChange={(e) => setRating(parseInt(e.target.value, 10))}
                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Doğum tarihi</label>
                <input
                  type="date"
                  value={birthIso}
                  onChange={(e) => setBirthIso(e.target.value)}
                  className="input-modern"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Statü</label>
                <input
                  type="text"
                  value={statu}
                  onChange={(e) => setStatu(e.target.value)}
                  placeholder="Örn: 009 Memur"
                  className="input-modern"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Lokasyon</label>
                <input
                  type="text"
                  value={lokasyon}
                  onChange={(e) => setLokasyon(e.target.value)}
                  placeholder="Örn: Hoşdere"
                  className="input-modern"
                />
              </div>
            </div>
          </div>

          <div className="surface-panel rounded-2xl p-4 sm:p-6">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Fiziksel ve oyun
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-3 block text-sm font-medium text-zinc-300">Cinsiyet</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`touch-target rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                      gender === 'male'
                        ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                        : 'border border-transparent bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    Erkek
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`touch-target rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                      gender === 'female'
                        ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                        : 'border border-transparent bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    Kadın
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-300">Boy (cm)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={100}
                    max={250}
                    value={boyCm}
                    onChange={(e) => setBoyCm(e.target.value)}
                    placeholder="178"
                    className="input-modern"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-300">Kilo (kg)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={30}
                    max={200}
                    value={kiloKg}
                    onChange={(e) => setKiloKg(e.target.value)}
                    placeholder="78"
                    className="input-modern"
                  />
                </div>
              </div>
              <div>
                <label className="mb-3 block text-sm font-medium text-zinc-300">Mevkiiler (form)</label>
                <div className="grid grid-cols-2 gap-2">
                  {MEVKI_ROWS.map(({ pos, raw }) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => applyMevki(pos, raw)}
                      className={`touch-target rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                        position === pos
                          ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                          : 'border border-transparent bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {raw}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-3 block text-sm font-medium text-zinc-300">
                  Futbolda baskın ayağınız
                </label>
                <div className="flex flex-wrap gap-2">
                  {FOOT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setBaskinAyak(opt)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                        baskinAyak === opt
                          ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                          : 'border border-transparent bg-white/5 text-zinc-400 hover:bg-white/10'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {showSuccess && (
            <div className="flex animate-fadeIn items-center space-x-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="rounded-full bg-emerald-500/20 p-1.5">
                <Check className="h-4 w-4 text-emerald-400" strokeWidth={1.5} />
              </div>
              <span className="text-sm font-medium text-emerald-400">Oyuncu kadroya eklendi</span>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button type="submit" className="btn-primary min-h-[2.75rem] w-full flex-1 py-3.5 text-sm sm:w-auto">
              Kadroya ekle
            </button>
            <button
              type="button"
              onClick={() => navigate('/players')}
              className="min-h-[2.75rem] w-full rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/10 hover:text-white sm:w-auto"
            >
              İptal
            </button>
          </div>
        </form>

        <div className="surface-panel mt-6 rounded-2xl p-4 sm:p-6">
          <h3 className="mb-3 text-sm font-medium text-zinc-300">Bilgi</h3>
          <p className="mb-3 text-xs leading-relaxed text-zinc-500">
            Manuel eklenen oyuncular da tabloda Excel sütunlarıyla görünür. Takım filtreleri ve kadro
            listesi bu alanları kullanır.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <h4 className="mb-1 text-[11px] font-medium text-zinc-400">Toplu yükleme</h4>
              <p className="text-[10px] text-zinc-500">
                Ana listedeki <code className="text-zinc-400">public</code> Excel’i ile aynı sütun
                düzenini kullanın.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <h4 className="mb-1 text-[11px] font-medium text-zinc-400">Puanlama</h4>
              <p className="text-[10px] text-zinc-500">
                Excel’deki Puanlama sütununa karşılık gelir; takım dengesinde kullanılır.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
