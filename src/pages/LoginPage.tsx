import { useState } from 'react';
import { Lock, User, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (username === 'admin' && password === 'emre1234') {
      setError('');
      onLogin();
    } else {
      setError('Kullanıcı adı veya şifre hatalı!');
    }
  };

  return (
    <div className="app-shell safe-x safe-b flex min-h-[100dvh] items-center justify-center px-4 py-10 sm:py-12">
      <div
        className="animate-fade-up w-full max-w-[420px]"
        style={{ animationDelay: '0.05s' }}
      >
        <div className="surface-panel relative overflow-hidden rounded-2xl p-5 sm:rounded-3xl sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-teal-500/10 blur-3xl" />

          <div className="relative mb-8 text-center">
            <div className="mx-auto mb-5 flex justify-center">
              <div className="relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-emerald-500/35 to-teal-600/20 opacity-80 blur-md" />
                <img
                  src="/images.jpg"
                  alt="MBA"
                  className="relative h-16 w-16 rounded-2xl object-cover ring-2 ring-white/15 shadow-lg shadow-black/40"
                />
              </div>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              MBA Takım Yönetimi
            </h1>
            <p className="mt-2 text-sm text-zinc-400">Devam etmek için giriş yapın</p>
          </div>

          <form onSubmit={handleSubmit} className="relative space-y-5">
            <div>
              <label htmlFor="username" className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Kullanıcı adı
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <User className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-modern pl-10"
                  placeholder="Kullanıcı adınızı girin"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Şifre
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Lock className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-modern pl-10"
                  placeholder="Şifrenizi girin"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary mt-2 w-full py-3.5">
              <span>Giriş yap</span>
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-[11px] text-zinc-600">© MBA Takım Yönetimi</p>
      </div>
    </div>
  );
}
