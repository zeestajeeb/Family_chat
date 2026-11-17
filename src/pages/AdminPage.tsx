import { useEffect, useState } from 'react';
import { Check, KeyRound, Plus, Server, Shield, Trophy } from 'lucide-react';
import type { CodingProject, User } from '../types';
import { SandboxedPreview } from '../components/SandboxedPreview';

interface AdminOverview {
  users: User[];
  courses: { id: number; slug: string; title: string; description: string; level: string; is_published: number }[];
  lessons: { id: number; course_id: number; course_title: string; title: string; summary: string; points: number; is_published: number }[];
  projects: (CodingProject & { author_name: string })[];
  challenges: { id: number; title: string; difficulty: string; points: number }[];
  quizAttempts: { id: number; student_name: string; lesson_title: string; score: number; passed: number; created_at: string }[];
  raceHistory: { id: number; room_code: string; track_id: string; player_name: string; position: number; race_time_ms: number; points_earned: number }[];
  activityLogs: { id: number; user_name: string | null; action: string; details: string; created_at: string }[];
  settings: { key: string; value: string }[];
}

export function AdminPage({ onPointsUpdated }: { onPointsUpdated?: () => void }) {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [tab, setTab] = useState<'accounts' | 'curriculum' | 'reviews' | 'telemetry' | 'security' | 'hostinger'>('accounts');
  const [notice, setNotice] = useState<string | null>(null);

  // Password reset state
  const [resetTargetId, setResetTargetId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  // Bonus reward state
  const [rewardUserId, setRewardUserId] = useState<number>(2);
  const [rewardAmount, setRewardAmount] = useState<number>(50);
  const [rewardReason, setRewardReason] = useState('Great coding focus today');

  // New Course / Lesson / Challenge forms
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [lessonCourseId, setLessonCourseId] = useState<number>(1);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonSummary, setLessonSummary] = useState('');
  const [lessonExplanation, setLessonExplanation] = useState('');
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDesc, setChallengeDesc] = useState('');
  const [challengePoints, setChallengePoints] = useState(60);

  // Project inspection
  const [inspectProject, setInspectProject] = useState<(CodingProject & { author_name: string }) | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewBonus, setReviewBonus] = useState(40);

  // Security settings map
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});

  const loadAdmin = async () => {
    const res = await fetch('/api/admin/overview');
    if (res.ok) {
      const json = (await res.json()) as AdminOverview;
      setData(json);
      if (json.courses[0]) setLessonCourseId((prev) => prev || json.courses[0].id);
      const child = json.users.find((u) => u.role === 'student');
      if (child) setRewardUserId((prev) => prev || child.id);
      const map: Record<string, string> = {};
      for (const s of json.settings) map[s.key] = s.value;
      setSettingsMap(map);
    }
  };

  useEffect(() => {
    loadAdmin();
  }, []);

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 3500);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetId) return;
    const res = await fetch(`/api/admin/users/${resetTargetId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: resetPassword }),
    });
    const json = await res.json();
    if (res.ok) {
      flash('Password updated and active sessions cleared.');
      setResetTargetId(null);
      setResetPassword('');
    } else {
      flash(json.error || 'Could not reset password.');
    }
  };

  const handleGrantReward = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/rewards/grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: rewardUserId, amount: rewardAmount, reason: rewardReason }),
    });
    if (res.ok) {
      flash(`Awarded +${rewardAmount} bonus points!`);
      await loadAdmin();
      onPointsUpdated?.();
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: courseTitle, description: courseDesc, level: 'Ages 9–12' }),
    });
    if (res.ok) {
      setCourseTitle('');
      setCourseDesc('');
      flash('New course created.');
      await loadAdmin();
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: lessonCourseId,
        title: lessonTitle,
        summary: lessonSummary,
        explanation: lessonExplanation,
      }),
    });
    if (res.ok) {
      setLessonTitle('');
      setLessonSummary('');
      setLessonExplanation('');
      flash('New lesson published with quiz!');
      await loadAdmin();
    }
  };

  const handleToggleLessonPublish = async (lessonId: number, currentPub: number) => {
    await fetch(`/api/admin/lessons/${lessonId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !currentPub }),
    });
    await loadAdmin();
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: challengeTitle, description: challengeDesc, points: challengePoints }),
    });
    if (res.ok) {
      setChallengeTitle('');
      setChallengeDesc('');
      flash('Custom coding assignment published to children!');
      await loadAdmin();
    }
  };

  const handleReviewProject = async (status: 'approved' | 'needs_revision') => {
    if (!inspectProject) return;
    const res = await fetch(`/api/admin/projects/${inspectProject.id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, feedback: reviewFeedback, bonusPoints: reviewBonus }),
    });
    if (res.ok) {
      flash(`Project marked as ${status}.`);
      setInspectProject(null);
      setReviewFeedback('');
      await loadAdmin();
      onPointsUpdated?.();
    }
  };

  const handleSaveSettings = async () => {
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: settingsMap }),
    });
    flash('Security and privacy policies saved.');
  };

  if (!data) {
    return <div className="h-56 rounded-xl border border-slate-200 bg-white animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Parent Administration</h1>
          <p className="text-sm text-slate-600">
            Manage family accounts, curriculum lessons, project reviews, rewards, security, and Hostinger deployment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(
            [
              ['accounts', 'Accounts & Rewards'],
              ['curriculum', 'Courses & Lessons'],
              ['reviews', `Submissions (${data.projects.length})`],
              ['telemetry', 'Quizzes & Races'],
              ['security', 'Security'],
              ['hostinger', 'Hostinger Guide'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                tab === id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
          {notice}
        </div>
      )}

      {/* TAB 1: ACCOUNTS & BONUS REWARDS */}
      {tab === 'accounts' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Authorized Family Accounts (Max 3)</h2>
            <div className="space-y-3">
              {data.users.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3.5">
                  <div className="flex items-center gap-3">
                    <img src={u.avatar_url} alt={u.name} className="h-10 w-10 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{u.name}</p>
                      <p className="text-xs text-slate-500">
                        {u.email} · {u.role === 'admin' ? 'Administrator' : `Student (Age ${u.age})`} ·{' '}
                        <span className="tabular-nums font-semibold">{u.points} pts</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResetTargetId(u.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>Reset Password</span>
                  </button>
                </div>
              ))}
            </div>

            {resetTargetId && (
              <form onSubmit={handlePasswordReset} className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-3">
                <p className="text-xs font-bold text-slate-900">
                  Set New Password for {data.users.find((u) => u.id === resetTargetId)?.name}
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  />
                  <button type="submit" className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white">
                    Update
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetTargetId(null)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          <form onSubmit={handleGrantReward} className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">Assign Bonus Points</h2>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Family Member</label>
              <select
                value={rewardUserId}
                onChange={(e) => setRewardUserId(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {data.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Points Amount</label>
              <input
                type="number"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
              <input
                type="text"
                value={rewardReason}
                onChange={(e) => setRewardReason(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <button type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">
              Grant Family Reward
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: COURSES, LESSONS & ASSIGNMENTS */}
      {tab === 'curriculum' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <form onSubmit={handleCreateCourse} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Create New Course</h2>
              <input
                type="text"
                required
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="Course title (e.g. JavaScript Basics)"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              />
              <textarea
                rows={3}
                value={courseDesc}
                onChange={(e) => setCourseDesc(e.target.value)}
                placeholder="Short description for kids"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              />
              <button type="submit" className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white">
                <Plus className="h-3.5 w-3.5" />
                <span>Create Course</span>
              </button>
            </form>

            <form onSubmit={handleCreateLesson} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Add Lesson to Course</h2>
              <select
                value={lessonCourseId}
                onChange={(e) => setLessonCourseId(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              >
                {data.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="Lesson title"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              />
              <input
                type="text"
                required
                value={lessonSummary}
                onChange={(e) => setLessonSummary(e.target.value)}
                placeholder="One-line summary"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              />
              <textarea
                rows={2}
                required
                value={lessonExplanation}
                onChange={(e) => setLessonExplanation(e.target.value)}
                placeholder="Kid-friendly explanation"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              />
              <button type="submit" className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white">
                <Plus className="h-3.5 w-3.5" />
                <span>Publish Lesson</span>
              </button>
            </form>

            <form onSubmit={handleCreateChallenge} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Assign Coding Challenge</h2>
              <input
                type="text"
                required
                value={challengeTitle}
                onChange={(e) => setChallengeTitle(e.target.value)}
                placeholder="Assignment title"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              />
              <textarea
                rows={3}
                required
                value={challengeDesc}
                onChange={(e) => setChallengeDesc(e.target.value)}
                placeholder="Instructions for Leo and Maya"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              />
              <input
                type="number"
                value={challengePoints}
                onChange={(e) => setChallengePoints(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs tabular-nums"
              />
              <button type="submit" className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white">
                <Plus className="h-3.5 w-3.5" />
                <span>Assign Challenge</span>
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900 mb-3">All Lessons ({data.lessons.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Course</th>
                    <th className="py-2 pr-4">Lesson</th>
                    <th className="py-2 pr-4">Points</th>
                    <th className="py-2">Visibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.lessons.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2.5 pr-4 text-slate-600">{l.course_title}</td>
                      <td className="py-2.5 pr-4 font-semibold text-slate-900">{l.title}</td>
                      <td className="py-2.5 pr-4 tabular-nums">{l.points}</td>
                      <td className="py-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleLessonPublish(l.id, l.is_published)}
                          className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold ${
                            l.is_published
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-100 text-slate-600'
                          }`}
                        >
                          {l.is_published ? 'Published' : 'Hidden'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CHILDREN'S WEBSITE PROJECT SUBMISSIONS */}
      {tab === 'reviews' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="text-base font-bold text-slate-900">Student Projects</h2>
            {data.projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setInspectProject(p)}
                className={`w-full rounded-lg border p-3.5 text-left transition-colors ${
                  inspectProject?.id === p.id ? 'border-blue-500 bg-blue-50/40' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{p.author_name} · {p.project_type}</span>
                  <span className="font-semibold text-slate-800">{p.status}</span>
                </div>
                <p className="mt-1 text-sm font-bold text-slate-900">{p.title}</p>
              </button>
            ))}
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            {!inspectProject ? (
              <p className="text-sm text-slate-500">Select a student project on the left to preview and review it safely.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">{inspectProject.title}</h2>
                  <span className="text-xs text-slate-500">By {inspectProject.author_name}</span>
                </div>
                <SandboxedPreview
                  html={inspectProject.html_code}
                  css={inspectProject.css_code}
                  js={inspectProject.js_code}
                  title={`Review: ${inspectProject.title}`}
                  heightClass="h-72"
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2">
                  <input
                    type="text"
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    placeholder="Encouraging parent feedback..."
                    className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                  <input
                    type="number"
                    value={reviewBonus}
                    onChange={(e) => setReviewBonus(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs tabular-nums"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleReviewProject('approved')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Approve &amp; Award Points</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReviewProject('needs_revision')}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Request Revision
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: QUIZ RESULTS, RACE HISTORY & ACTIVITY LOGS */}
      {tab === 'telemetry' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900 mb-3">Recent Quiz Attempts</h2>
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {data.quizAttempts.length === 0 ? (
                <p className="text-xs text-slate-500">No quiz attempts recorded yet.</p>
              ) : (
                data.quizAttempts.map((qa) => (
                  <div key={qa.id} className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{qa.student_name} · {qa.lesson_title}</p>
                      <p className="text-slate-400">{new Date(qa.created_at + 'Z').toLocaleString()}</p>
                    </div>
                    <span className={`font-bold tabular-nums ${qa.passed ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {qa.score}% ({qa.passed ? 'Passed' : 'Retry'})
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900 mb-3">Family Activity Audit Log</h2>
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {data.activityLogs.map((log) => (
                <div key={log.id} className="border-b border-slate-100 pb-2 text-xs">
                  <p className="font-semibold text-slate-800">{log.details}</p>
                  <p className="text-slate-400">
                    {log.action} · {new Date(log.created_at + 'Z').toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SECURITY & PRIVACY SETTINGS */}
      {tab === 'security' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 max-w-2xl">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Privacy &amp; Child Safety Controls</h2>
          </div>
          {[
            ['public_registration_enabled', 'Allow Public Registration (Keep OFF for Private Family Mode)'],
            ['sandbox_strict_isolation', 'Enforce Isolated No-Origin Iframe Sandbox for Student Code'],
            ['allow_image_sharing', 'Allow Authenticated Family Image Uploads in Messenger'],
            ['require_parent_project_review', 'Require Parent Review Before Marking Guided Projects Approved'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center justify-between rounded-lg border border-slate-200 p-3.5 text-xs font-medium text-slate-800 cursor-pointer">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={settingsMap[key] === 'true'}
                onChange={(e) => setSettingsMap((prev) => ({ ...prev, [key]: e.target.checked ? 'true' : 'false' }))}
                className="h-4 w-4 text-blue-600"
              />
            </label>
          ))}
          <button
            type="button"
            onClick={handleSaveSettings}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Save Security Policies
          </button>
        </div>
      )}

      {/* TAB 6: HOSTINGER CLOUD & LARAVEL DEPLOYMENT BLUEPRINT */}
      {tab === 'hostinger' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-slate-700" />
            <h2 className="text-base font-bold text-slate-900">Hostinger Cloud Hosting &amp; Subdomain Deployment Guide</h2>
          </div>
          <p className="text-sm text-slate-600">
            This live preview runs on Node.js + Express + WebSockets + SQLite in the cloud sandbox. When deploying your Laravel + MySQL production stack to Hostinger Cloud Hosting, use the following subdomain topology:
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-xs">
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="font-bold text-slate-900">1. Main App (app.yourdomain.com)</h3>
              <p className="mt-1 text-slate-600">
                Laravel 11 + PHP 8.2+ with document root pointed strictly to <code>/public</code>. Keep <code>.env</code>, <code>app/</code>, and <code>storage/</code> outside the public web root.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="font-bold text-slate-900">2. Real-Time Node (ws.yourdomain.com)</h3>
              <p className="mt-1 text-slate-600">
                Host the authoritative Colyseus/WebSocket multiplayer game &amp; signaling service behind SSL proxy or managed VPS/Railway/Fly.io if shared PHP workers limit persistent sockets.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="font-bold text-slate-900">3. LiveKit &amp; Cron Backups</h3>
              <p className="mt-1 text-slate-600">
                Set <code>LIVEKIT_URL</code>, <code>LIVEKIT_API_KEY</code>, and <code>LIVEKIT_API_SECRET</code> in <code>.env</code>. Schedule daily <code>mysqldump</code> backups and Laravel queue worker cron checks.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
