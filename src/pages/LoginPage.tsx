import { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import type { User } from '../types';

interface LoginPageProps {
  onSuccess: (user: User) => void;
}

const FAMILY_TEST_ACCOUNTS = [
  { label: 'Father (Admin)', email: 'father@familyconnect.local', pass: 'FatherPass123!', avatar: '/src/assets/images/avatar_father_1794844438894.jpg' },
  { label: 'Leo (Age 12)', email: 'leo@familyconnect.local', pass: 'LeoCode123!', avatar: '/src/assets/images/avatar_child_one_1794844439270.jpg' },
  { label: 'Maya (Age 9)', email: 'maya@familyconnect.local', pass: 'MayaCode123!', avatar: '/src/assets/images/avatar_child_two_1794844439585.jpg' },
];

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('father@familyconnect.local');
  const [password, setPassword] = useState('');
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
              An invite-only home hub for coding lessons, sandboxed website building, 3-player Grand Prix racing, live video calls, and private family messaging.
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
            Public registration is disabled. Only the 3 authorized family accounts can sign in.
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
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                placeholder="Enter your password"
              />
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

          <div className="mt-7 border-t border-slate-200 pt-5">
            <p className="text-xs font-semibold text-slate-700">Quick-Fill Authorized Accounts</p>
            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {FAMILY_TEST_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(acc.pass);
                    setError(null);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-left hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                >
                  <img src={acc.avatar} alt={acc.label} className="h-7 w-7 rounded-full object-cover shrink-0" />
                  <span className="truncate text-xs font-medium text-slate-800">{acc.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
