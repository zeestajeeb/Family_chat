import { useEffect, useState } from 'react';
import { Award, CheckCircle2, Flame, Printer, Trophy } from 'lucide-react';
import type { User } from '../types';

interface RewardsData {
  leaderboard: User[];
  allAchievements: { id: number; slug: string; title: string; description: string; category: string; points_bonus: number }[];
  earnedRows: { achievement_id: number; user_id: number; user_name: string; earned_at: string }[];
  transactions: { id: number; user_name: string; amount: number; reason: string; awarded_by_name: string | null; created_at: string }[];
  completedCourses: { id: number; title: string; slug: string; total_lessons: number; completed_lessons: number }[];
}

export function RewardsPage({ currentUser }: { currentUser: User }) {
  const [data, setData] = useState<RewardsData | null>(null);

  useEffect(() => {
    fetch('/api/rewards')
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return <div className="h-48 rounded-xl border border-slate-200 bg-white animate-pulse" />;
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Achievements, Certificates &amp; Rewards</h1>
        <p className="text-sm text-slate-600">
          Track family points, unlocked badges, learning streaks, and course completion certificates.
        </p>
      </div>

      {/* Family Points Leaderboard */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {data.leaderboard.map((member, index) => (
          <div key={member.id} className="rounded-xl border border-slate-200 bg-white p-5 flex items-center gap-4">
            <img src={member.avatar_url} alt={member.name} className="h-14 w-14 rounded-full object-cover border border-slate-200" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-600 tabular-nums">Rank #{index + 1}</span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 tabular-nums">
                  <Flame className="h-3.5 w-3.5" />
                  <span>{member.streak_days}d streak</span>
                </span>
              </div>
              <h2 className="mt-0.5 truncate text-base font-bold text-slate-900">{member.name}</h2>
              <p className="text-sm font-bold text-slate-800 tabular-nums">{member.points} pts</p>
            </div>
          </div>
        ))}
      </section>

      {/* Badges & Racing Trophies */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Family Badges &amp; Racing Trophies</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.allAchievements.map((ach) => {
            const earnedByMe = data.earnedRows.some((e) => e.achievement_id === ach.id && e.user_id === currentUser.id);
            const earners = data.earnedRows.filter((e) => e.achievement_id === ach.id).map((e) => e.user_name);
            return (
              <div
                key={ach.id}
                className={`rounded-xl border p-4 flex flex-col justify-between ${
                  earnedByMe ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${earnedByMe ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                      {ach.category === 'racing' ? <Trophy className="h-4 w-4" /> : <Award className="h-4 w-4" />}
                    </div>
                    <span className="text-xs font-bold text-slate-600 tabular-nums">+{ach.points_bonus} pts</span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900">{ach.title}</h3>
                  <p className="mt-1 text-xs text-slate-600">{ach.description}</p>
                </div>
                <p className="mt-3 text-[11px] font-medium text-slate-500">
                  {earners.length > 0 ? `Earned by: ${earners.join(', ')}` : 'Not unlocked yet'}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Course Certificates & Points Ledger */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Your Certificates</h2>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
          </div>
          {data.completedCourses.map((c) => {
            const complete = c.total_lessons > 0 && c.completed_lessons >= c.total_lessons;
            return (
              <div
                key={c.id}
                className={`rounded-xl border p-5 ${complete ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200 bg-slate-50/50'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Family Connect Academy</span>
                  {complete ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Earned</span>
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-500 tabular-nums">
                      {c.completed_lessons}/{c.total_lessons} lessons
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-base font-bold text-slate-900">
                  Certificate of Completion: {c.title}
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  {complete
                    ? `Proudly awarded to ${currentUser.name} for mastering all ${c.total_lessons} lessons and quizzes.`
                    : `Complete ${c.total_lessons - c.completed_lessons} remaining lessons to unlock this certificate.`}
                </p>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Points &amp; Bonus History</h2>
          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {data.transactions.length === 0 ? (
              <p className="text-sm text-slate-500">Complete lessons or races to earn your first reward points!</p>
            ) : (
              data.transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between border-b border-slate-100 pb-2.5 last:border-b-0">
                  <div className="min-w-0 pr-3">
                    <p className="truncate text-xs font-semibold text-slate-900">
                      {tx.user_name} · {tx.reason}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(tx.created_at + 'Z').toLocaleDateString()}
                      {tx.awarded_by_name ? ` · Awarded by ${tx.awarded_by_name}` : ''}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 tabular-nums whitespace-nowrap shrink-0">
                    +{tx.amount} pts
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
