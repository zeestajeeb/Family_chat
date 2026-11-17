import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Play, RotateCcw } from 'lucide-react';
import type { Course, Lesson } from '../types';
import { SandboxedPreview } from '../components/SandboxedPreview';

interface AcademyPageProps {
  initialLessonId?: number;
  initialCourseSlug?: string;
  onPointsUpdated?: () => void;
}

export function AcademyPage({ initialLessonId, initialCourseSlug, onPointsUpdated }: AcademyPageProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [practiceHtml, setPracticeHtml] = useState('');
  const [practiceCss, setPracticeCss] = useState('');
  const [runHtml, setRunHtml] = useState('');
  const [runCss, setRunCss] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<{
    score: number;
    passed: boolean;
    pointsEarned: number;
    unlockedBadges: string[];
    feedback: { questionId: number; isCorrect: boolean; explanation: string }[];
  } | null>(null);
  const [savingPractice, setSavingPractice] = useState(false);

  const loadCourses = async (preserveLessonId?: number) => {
    const res = await fetch('/api/courses');
    if (!res.ok) return;
    const data = (await res.json()) as { courses: Course[] };
    setCourses(data.courses);

    const targetCourse =
      data.courses.find((c) => c.slug === initialCourseSlug) ||
      data.courses.find((c) => c.id === selectedCourseId) ||
      data.courses[0];
    if (targetCourse) {
      setSelectedCourseId(targetCourse.id);
      const targetLesson =
        targetCourse.lessons.find((l) => l.id === (preserveLessonId || initialLessonId)) ||
        targetCourse.lessons[0];
      if (targetLesson) {
        selectLesson(targetLesson);
      }
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const selectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    const html = lesson.practice_html ?? lesson.starter_html;
    const css = lesson.practice_css ?? lesson.starter_css;
    setPracticeHtml(html);
    setPracticeCss(css);
    setRunHtml(html);
    setRunCss(css);
    setQuizAnswers({});
    setQuizResult(null);
  };

  const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];

  const handleRunPractice = async () => {
    setRunHtml(practiceHtml);
    setRunCss(practiceCss);
    if (!selectedLesson) return;
    setSavingPractice(true);
    try {
      await fetch(`/api/lessons/${selectedLesson.id}/practice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: practiceHtml, css: practiceCss }),
      });
    } finally {
      setSavingPractice(false);
    }
  };

  const handleResetPractice = () => {
    if (!selectedLesson) return;
    setPracticeHtml(selectedLesson.starter_html);
    setPracticeCss(selectedLesson.starter_css);
    setRunHtml(selectedLesson.starter_html);
    setRunCss(selectedLesson.starter_css);
  };

  const submitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLesson) return;
    const res = await fetch(`/api/lessons/${selectedLesson.id}/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: quizAnswers }),
    });
    if (res.ok) {
      const result = await res.json();
      setQuizResult(result);
      if (result.passed) {
        await loadCourses(selectedLesson.id);
        onPointsUpdated?.();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Course Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Coding Academy</h1>
          <p className="text-sm text-slate-600">
            Interactive HTML5 and CSS3 lessons written clearly for ages 9 and 12.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {courses.map((course) => {
            const done = course.lessons.filter((l) => l.completed).length;
            const active = course.id === activeCourse?.id;
            return (
              <button
                key={course.id}
                type="button"
                onClick={() => {
                  setSelectedCourseId(course.id);
                  if (course.lessons[0]) selectLesson(course.lessons[0]);
                }}
                className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {course.title} ({done}/{course.lessons.length})
              </button>
            );
          })}
        </div>
      </div>

      {/* Lesson Curriculum + Interactive Stage */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Sidebar: Lesson List */}
        <aside className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-4 max-h-[820px] overflow-y-auto">
          <h2 className="text-sm font-bold text-slate-900 px-2 mb-3">
            {activeCourse?.title} · Lessons
          </h2>
          <div className="space-y-1">
            {activeCourse?.lessons.map((lesson) => {
              const isSelected = selectedLesson?.id === lesson.id;
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => selectLesson(lesson)}
                  className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isSelected ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {lesson.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-slate-300 shrink-0" />
                    )}
                    <span className="truncate text-xs font-semibold">{lesson.title}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 tabular-nums shrink-0">+{lesson.points}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Main Lesson Content */}
        {selectedLesson && (
          <div className="lg:col-span-8 space-y-6">
            {/* Explanation & Example */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-bold text-slate-900">{selectedLesson.title}</h2>
                <span className="text-xs font-semibold text-slate-500 tabular-nums">
                  {selectedLesson.completed ? 'Completed' : 'In Progress'} · {selectedLesson.points} pts
                </span>
              </div>
              <p className="text-sm leading-relaxed text-slate-700">{selectedLesson.explanation}</p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 pt-2">
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 mb-1.5">Example Code</h3>
                  <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-900 p-3.5 text-xs font-mono text-slate-100 leading-relaxed">
                    {selectedLesson.example_code}
                  </pre>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 mb-1.5">Expected Output</h3>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-700 h-full">
                    {selectedLesson.expected_output}
                  </div>
                </div>
              </div>
            </div>

            {/* Practice Exercise + Live Sandboxed Preview */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Practice Exercise</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{selectedLesson.exercise_prompt}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetPractice}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRunPractice}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>{savingPractice ? 'Saving...' : 'Run & Save'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">HTML</label>
                    <textarea
                      value={practiceHtml}
                      onChange={(e) => setPracticeHtml(e.target.value)}
                      rows={6}
                      spellCheck={false}
                      className="w-full rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">CSS</label>
                    <textarea
                      value={practiceCss}
                      onChange={(e) => setPracticeCss(e.target.value)}
                      rows={5}
                      spellCheck={false}
                      className="w-full rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <SandboxedPreview
                  html={runHtml}
                  css={runCss}
                  title="Practice Output"
                  heightClass="h-[260px]"
                />
              </div>
            </div>

            {/* Lesson Quick Quiz */}
            {selectedLesson.quiz_questions.length > 0 && (
              <form onSubmit={submitQuiz} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedLesson.quiz_title || 'Lesson Quiz'}
                  </h3>
                  <span className="text-xs text-slate-500">Pass score: {selectedLesson.pass_score ?? 70}%</span>
                </div>

                <div className="space-y-5">
                  {selectedLesson.quiz_questions.map((q, idx) => (
                    <div key={q.id} className="space-y-2 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {idx + 1}. {q.question_text}
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {q.options.map((opt, optIdx) => (
                          <label
                            key={optIdx}
                            className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-xs cursor-pointer transition-colors ${
                              quizAnswers[q.id] === optIdx
                                ? 'border-blue-500 bg-blue-50/70 text-blue-900 font-semibold'
                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              checked={quizAnswers[q.id] === optIdx}
                              onChange={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                              className="text-blue-600"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {quizResult && (
                  <div
                    className={`rounded-lg border p-4 text-xs ${
                      quizResult.passed
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-amber-200 bg-amber-50 text-amber-900'
                    }`}
                  >
                    <p className="font-bold">
                      Score: {quizResult.score}% · {quizResult.passed ? 'Passed!' : 'Try Again'}
                      {quizResult.pointsEarned > 0 && ` (+${quizResult.pointsEarned} Family Points)`}
                    </p>
                    {quizResult.unlockedBadges.length > 0 && (
                      <p className="mt-1 font-semibold">
                        Unlocked Badge: {quizResult.unlockedBadges.join(', ')}
                      </p>
                    )}
                    <ul className="mt-2 space-y-1">
                      {quizResult.feedback.map((f) => (
                        <li key={f.questionId}>
                          {f.isCorrect ? 'Correct:' : 'Review:'} {f.explanation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  Check Quiz Answers
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
