import { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  Car,
  Code2,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  ShieldCheck,
  Video,
  X,
} from 'lucide-react';
import type { User } from './types';
import { wsClient } from './lib/wsClient';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage, type NavSection } from './pages/DashboardPage';
import { AcademyPage } from './pages/AcademyPage';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { RacingPage } from './pages/RacingPage';
import { VideoCallPage } from './pages/VideoCallPage';
import { MessengerPage } from './pages/MessengerPage';
import { RewardsPage } from './pages/RewardsPage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [section, setSection] = useState<NavSection>('dashboard');
  const [academyNavContext, setAcademyNavContext] = useState<{ lessonId?: number; courseSlug?: string }>({});
  const [liveMembers, setLiveMembers] = useState<User[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const refreshMe = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    refreshMe();
  }, []);

  useEffect(() => {
    if (!user) {
      wsClient.disconnect();
      return;
    }
    wsClient.connect();
    const unsubPresence = wsClient.on('presence:list', (data: { users: User[] }) => {
      setLiveMembers(data.users || []);
      const me = data.users?.find((u) => u.id === user.id);
      if (me) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                name: me.name,
                avatar_url: me.avatar_url,
                role: me.role,
                age: me.age,
                points: me.points,
                streak_days: me.streak_days,
              }
            : prev
        );
      }
    });
    return () => {
      unsubPresence();
    };
  }, [user?.id]);

  const handleNavigate = (next: NavSection, extra?: { lessonId?: number; courseSlug?: string }) => {
    if (next === 'admin' && user?.role !== 'admin') return;
    if (extra) setAcademyNavContext(extra);
    setSection(next);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    wsClient.disconnect();
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setSection('dashboard');
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm font-medium text-slate-500">Loading Family Connect...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onSuccess={(u) => setUser(u)} />;
  }

  const allNavItems: { id: NavSection; label: string; icon: typeof Home; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'academy', label: 'Coding Academy', icon: BookOpen },
    { id: 'playground', label: 'Coding Studio', icon: Code2 },
    { id: 'racing', label: 'Car Racing', icon: Car },
    { id: 'video', label: 'Video Calls', icon: Video },
    { id: 'messenger', label: 'Messenger', icon: MessageSquare },
    { id: 'rewards', label: 'Rewards', icon: Award },
    { id: 'admin', label: 'Parent Admin', icon: ShieldCheck, adminOnly: true },
  ];
  const navItems = allNavItems.filter((item) => !item.adminOnly || user.role === 'admin');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sticky top-0 z-30">
        <span className="font-display text-base font-bold text-slate-900 whitespace-nowrap shrink-0">
          Family Connect
        </span>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg border border-slate-200 p-2 text-slate-700"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? 'fixed inset-0 z-40 flex' : 'hidden'
        } lg:static lg:flex lg:w-64 lg:shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-5`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="font-display text-lg font-extrabold tracking-tight text-slate-900">
              Family Connect
            </span>
            {mobileMenuOpen && (
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-1 text-slate-500">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    active ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Account Footer */}
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <div className="flex items-center gap-3">
            <img src={user.avatar_url} alt={user.name} className="h-10 w-10 rounded-full object-cover border border-slate-200" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500 tabular-nums">
                {user.role === 'admin' ? 'Admin' : 'Student'} · {user.points} pts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 p-5 sm:p-8 max-w-7xl mx-auto w-full">
        {section === 'dashboard' && (
          <DashboardPage currentUser={user} liveMembers={liveMembers} onNavigate={handleNavigate} />
        )}
        {section === 'academy' && (
          <AcademyPage
            initialLessonId={academyNavContext.lessonId}
            initialCourseSlug={academyNavContext.courseSlug}
            onPointsUpdated={refreshMe}
          />
        )}
        {section === 'playground' && <PlaygroundPage onPointsUpdated={refreshMe} />}
        {section === 'racing' && <RacingPage currentUser={user} onPointsUpdated={refreshMe} />}
        {section === 'video' && <VideoCallPage currentUser={user} />}
        {section === 'messenger' && <MessengerPage currentUser={user} liveMembers={liveMembers} />}
        {section === 'rewards' && <RewardsPage currentUser={user} />}
        {section === 'admin' && user.role === 'admin' && <AdminPage currentUserId={user.id} onPointsUpdated={refreshMe} />}
      </main>
    </div>
  );
}
