import { useState } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import type { User } from '../types';

interface LoginPageProps {
  onSuccess: (user: User) => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sign-in failed.');
      } else {
        onSuccess(data.user);
      }
    } catch {
      setError('Unable to reach Family Connect server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between bg-slate-900 p-8 text-white">
          <div>
            <div className="flex items-center gap-2.5 text-sm font-semibold text-blue-300">
              <ShieldCheck className="h-4 w-4" />
              <span>Private Family Workspace</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-balance">
              Family Connect — Learn, Play &amp; Stay Together
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              An invite-only home hub for coding lessons, sandboxed website building, multiplayer Grand Prix racing, live video calls, and private family messaging.
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-xl border border-slate-700">
            <img
              src="/src/assets/images/hero_family_workspace_1794844439982.jpg"
              alt="Family Connect Workspace"
              referrerPolicy="no-referrer"
              className="h-44 w-full object-cover"
            />
          </div>

          <p className="mt-6 text-xs text-slate-400">
            Public registration is disabled. Only family accounts authorized by the Parent Administrator can sign in.
          </p>
        </div>

        <div className="p-8 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-slate-900">
            <Lock className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold">Family Sign In</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Enter your family account email and password.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700">
                Family Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                placeholder="name@familyconnect.local"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 pr-10 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <span>Remember this device for 30 days</span>
              </label>
              <span className="text-xs text-slate-500">Password resets by Parent</span>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
