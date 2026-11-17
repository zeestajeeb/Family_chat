import { useEffect, useState } from 'react';
import { Award, Bell, BookOpen, Car, CheckCircle2, Code2, Video } from 'lucide-react';
import type { User } from '../types';

export type NavSection =
  | 'dashboard'
  | 'academy'
  | 'playground'
  | 'racing'
  | 'video'
  | 'messenger'
  | 'rewards'
  | 'admin';

interface DashboardData {
  familyMembers: User[];
  courses: {
    id: number;
    slug: string;
    title: string;
    description: string;
    level: string;
    total_lessons: number;
    completed_lessons: number;
  }[];
  nextLesson: { id: number; title: string; summary: string; course_title: string; course_slug: string } | null;
  recentActivities: { id: number; action: string; details: string; created_at: string; user_name: string | null; avatar_url: string | null }[];
  notifications: { id: number; title: string; message: string; category: string; is_read: number; created_at: string }[];
  achievements: { id: number; title: string; description: string; points_bonus: number; earner_name: string; earner_avatar: string }[];
  completedChallenges: { id: number; title: string; points: number; status: string; created_at: string }[];
}

interface DashboardPageProps {
  currentUser: User;
  liveMembers: User[];
  onNavigate: (section: NavSection, extra?: { lessonId?: number; courseSlug?: string }) => void;
}

export function DashboardPage({ currentUser, liveMembers, onNavigate }: DashboardPageProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const markNotificationsRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    loadDashboard();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-44 rounded-xl border border-slate-200 bg-white animate-pulse" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="h-28 rounded-xl border border-slate-200 bg-white animate-pulse" />
          <div className="h-28 rounded-xl border border-slate-200 bg-white animate-pulse" />
          <div className="h-28 rounded-xl border border-slate-200 bg-white animate-pulse" />
        </div>
      </div>
    );
  }

  const members = liveMembers.length > 0 ? liveMembers : data?.familyMembers || [];
  const unreadCount = data?.notifications.filter((n) => !n.is_read).length || 0;

  return (
    <div className="space-y-8">
      {/* Hero / Welcome Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="lg:col-span-7 p-6 lg:p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">
              {currentUser.role === 'admin' ? 'Parent Administrator' : `Student · Age ${currentUser.age ?? ''}`}
              <span className="mx-2" aria-hidden="true">·</span>
              <span className="tabular-nums">{currentUser.points} Family Points</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span className="tabular-nums">{currentUser.streak_days}-Day Streak</span>
            </p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
              Welcome back, {currentUser.name}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600 leading-relaxed">
              {data?.nextLesson
                ? `Next up in ${data.nextLesson.course_title}: "${data.nextLesson.title}". Jump back into your lesson or challenge the family on the track.`
                : 'You have completed all published lessons! Try building a custom site in the Playground or challenge the family to a race.'}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('academy', { lessonId: data?.nextLesson?.id, courseSlug: data?.nextLesson?.course_slug })}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              <BookOpen className="h-4 w-4" />
              <span>Continue Learning</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('racing')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Car className="h-4 w-4 text-blue-600" />
              <span>Start Racing Game</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('video')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Video className="h-4 w-4 text-emerald-600" />
              <span>Start Video Call</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-100 min-h-[200px]">
          <img
            src="/src/assets/images/hero_family_workspace_1794844439982.jpg"
            alt="Family Connect study desk"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      {/* Family Profiles & Live Online Status */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Family Members</h2>
          <button
            type="button"
            onClick={() => onNavigate('messenger')}
            className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap shrink-0"
          >
            Open Family Messenger
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
              <img
                src={m.avatar_url}
                alt={m.name}
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-full object-cover border border-slate-200 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-bold text-slate-900">{m.name}</h3>
                  <span
                    className={`text-xs font-semibold whitespace-nowrap shrink-0 ${
                      m.is_online ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    {m.is_online ? 'Online' : 'Offline'}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-600">
                  {m.role === 'admin' ? 'Parent Admin' : `Student · Age ${m.age}`}
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span className="tabular-nums font-medium">{m.points} pts</span>
                </p>
                <p className="mt-1 truncate text-xs text-slate-400">
                  Active {new Date(m.last_active_at + 'Z').toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Course Progress & Quick Playground */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Coding Academy Progress</h2>
            <button
              type="button"
              onClick={() => onNavigate('academy')}
              className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap shrink-0"
            >
              View All Lessons
            </button>
          </div>
          <div className="space-y-5">
            {data?.courses.map((c) => {
              const pct = c.total_lessons > 0 ? Math.round((c.completed_lessons / c.total_lessons) * 100) : 0;
              return (
                <div key={c.id} className="space-y-2 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{c.title}</h3>
                      <p className="text-xs text-slate-500">{c.level}</p>
                    </div>
                    <span className="text-sm font-bold text-slate-900 tabular-nums whitespace-nowrap shrink-0">
                      {c.completed_lessons}/{c.total_lessons} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markNotificationsRead}
                  className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap shrink-0"
                >
                  Mark all read ({unreadCount})
                </button>
              )}
            </div>
            <div className="space-y-3 max-h-56 overflow-y-auto">
              {data?.notifications.length === 0 ? (
                <p className="text-sm text-slate-500">All caught up! No new notifications.</p>
              ) : (
                data?.notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 ${
                      n.is_read ? 'border-slate-100 bg-slate-50/50' : 'border-blue-200 bg-blue-50/40'
                    }`}
                  >
                    <Bell className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                      <p className="mt-0.5 text-xs text-slate-600">{n.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Ready to build a project?</span>
            <button
              type="button"
              onClick={() => onNavigate('playground')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>Open Coding Studio</span>
            </button>
          </div>
        </div>
      </section>

      {/* Family Achievements, Completed Challenges & Recent Activity */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Family Achievements</h2>
            <button
              type="button"
              onClick={() => onNavigate('rewards')}
              className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap shrink-0"
            >
              Leaderboard
            </button>
          </div>
          <div className="space-y-3">
            {data?.achievements.map((a, idx) => (
              <div key={`${a.id}-${idx}`} className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 shrink-0">
                  <Award className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-900">{a.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    {a.earner_name} · +{a.points_bonus} pts
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Your Challenges</h2>
            <button
              type="button"
              onClick={() => onNavigate('playground')}
              className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap shrink-0"
            >
              Solve More
            </button>
          </div>
          {data?.completedChallenges.length === 0 ? (
            <p className="text-sm text-slate-500">
              No challenges submitted yet. Visit Coding Studio to tackle Dad’s weekly challenges!
            </p>
          ) : (
            <div className="space-y-3">
              {data?.completedChallenges.map((ch) => (
                <div key={ch.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="truncate text-xs font-semibold text-slate-900">{ch.title}</span>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap shrink-0">+{ch.points} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4">Recent Family Activity</h2>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {data?.recentActivities.map((act) => (
              <div key={act.id} className="flex items-start gap-2.5 border-b border-slate-100 pb-2.5 last:border-b-0 last:pb-0">
                {act.avatar_url && (
                  <img src={act.avatar_url} alt={act.user_name || 'User'} className="h-6 w-6 rounded-full object-cover mt-0.5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-800">{act.details}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {act.action} · {new Date(act.created_at + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
