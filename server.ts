import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { AccessToken } from 'livekit-server-sdk';
import {
  awardPoints,
  checkAndGrantAchievement,
  createSession,
  db,
  getUserBySession,
  logActivity,
  notifyFamily,
  seedDatabase,
} from './server/db.ts';
import { GUIDED_PROJECT_TEMPLATES } from './server/seedData.ts';
import { attachWebSocketServer, TRACKS } from './server/ws.ts';

seedDatabase();

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

interface AuthedUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'student';
  age: number | null;
  avatar_url: string;
  bio: string;
  points: number;
  streak_days: number;
  is_online: number;
  last_active_at: string;
}

interface AuthedRequest extends Request {
  user?: AuthedUser;
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function rateLimitLogin(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || 'local';
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (entry && entry.resetAt > now && entry.count >= 25) {
    res.status(429).json({ error: 'Too many login attempts. Please wait a minute and try again.' });
    return;
  }
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
  } else {
    entry.count += 1;
  }
  next();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.fc_session;
  const user = getUserBySession(sessionId);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized. Please sign in with a family account.' });
    return;
  }
  req.user = user;
  db.prepare(`UPDATE users SET last_active_at = datetime('now') WHERE id = ?`).run(user.id);
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden. Parent Administrator permissions required.' });
    return;
  }
  next();
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '4mb' }));
app.use(cookieParser());

// ================= AUTHENTICATION (PRIVATE FAMILY ONLY) =================
app.post('/api/auth/login', rateLimitLogin, (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const rememberMe = Boolean(req.body?.rememberMe);

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = db
    .prepare('SELECT * FROM users WHERE lower(email) = ?')
    .get(email) as (AuthedUser & { password_hash: string }) | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid family email or password.' });
    return;
  }

  const sessionToken = createSession(user.id, rememberMe);
  db.prepare(`UPDATE users SET is_online = 1, last_active_at = datetime('now') WHERE id = ?`).run(user.id);
  logActivity(user.id, 'Signed In', `${user.name} signed into Family Connect`);

  res.cookie('fc_session', sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && req.protocol === 'https',
    maxAge: (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000,
    path: '/',
  });

  const { password_hash: _ph, ...safeUser } = user;
  res.json({ user: safeUser });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const sessionId = req.cookies?.fc_session;
  if (sessionId) {
    const user = getUserBySession(sessionId);
    if (user) {
      db.prepare(`UPDATE users SET is_online = 0, last_active_at = datetime('now') WHERE id = ?`).run(user.id);
    }
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  }
  res.clearCookie('fc_session', { path: '/' });
  res.json({ ok: true });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = getUserBySession(req.cookies?.fc_session);
  if (!user) {
    res.status(401).json({ user: null });
    return;
  }
  res.json({ user });
});

app.post('/api/auth/profile', requireAuth, (req: AuthedRequest, res: Response) => {
  const name = String(req.body?.name || '').trim();
  const bio = String(req.body?.bio || '').trim().slice(0, 200);
  if (!name) {
    res.status(400).json({ error: 'Display name is required.' });
    return;
  }
  db.prepare(`UPDATE users SET name = ?, bio = ?, updated_at = datetime('now') WHERE id = ?`).run(
    name,
    bio,
    req.user!.id
  );
  const updated = db
    .prepare('SELECT id, name, email, role, age, avatar_url, bio, points, streak_days, is_online, last_active_at FROM users WHERE id = ?')
    .get(req.user!.id);
  res.json({ user: updated });
});

// ================= DASHBOARD =================
app.get('/api/dashboard', requireAuth, (req: AuthedRequest, res: Response) => {
  const userId = req.user!.id;
  const familyMembers = db
    .prepare('SELECT id, name, email, role, age, avatar_url, bio, points, streak_days, is_online, last_active_at FROM users ORDER BY id ASC')
    .all();

  const courses = db
    .prepare(
      `
    SELECT c.id, c.slug, c.title, c.description, c.level,
      (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.is_published = 1) as total_lessons,
      (SELECT COUNT(*) FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
       WHERE l.course_id = c.id AND lp.user_id = ? AND lp.completed = 1) as completed_lessons
    FROM courses c
    WHERE c.is_published = 1
    ORDER BY c.id ASC
  `
    )
    .all(userId);

  const nextLesson = db
    .prepare(
      `
    SELECT l.id, l.title, l.summary, c.title as course_title, c.slug as course_slug
    FROM lessons l
    JOIN courses c ON c.id = l.course_id
    LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = ?
    WHERE l.is_published = 1 AND COALESCE(lp.completed, 0) = 0
    ORDER BY c.id ASC, l.order_index ASC
    LIMIT 1
  `
    )
    .get(userId);

  const recentActivities = db
    .prepare(
      `
    SELECT a.id, a.action, a.details, a.created_at, u.name as user_name, u.avatar_url
    FROM activity_logs a
    LEFT JOIN users u ON u.id = a.user_id
    ORDER BY a.id DESC
    LIMIT 10
  `
    )
    .all();

  const notifications = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 12')
    .all(userId);

  const achievements = db
    .prepare(
      `
    SELECT a.*, ua.earned_at, u.name as earner_name, u.avatar_url as earner_avatar
    FROM user_achievements ua
    JOIN achievements a ON a.id = ua.achievement_id
    JOIN users u ON u.id = ua.user_id
    ORDER BY ua.id DESC
    LIMIT 8
  `
    )
    .all();

  const completedChallenges = db
    .prepare(
      `
    SELECT cs.id, cs.status, cs.created_at, cc.title, cc.points
    FROM challenge_submissions cs
    JOIN coding_challenges cc ON cc.id = cs.challenge_id
    WHERE cs.user_id = ?
    ORDER BY cs.id DESC
  `
    )
    .all(userId);

  const activeMeetings = db
    .prepare('SELECT * FROM video_meetings WHERE is_active = 1 ORDER BY id DESC LIMIT 3')
    .all();

  res.json({
    familyMembers,
    courses,
    nextLesson,
    recentActivities,
    notifications,
    achievements,
    completedChallenges,
    activeMeetings,
  });
});

app.post('/api/notifications/read-all', requireAuth, (req: AuthedRequest, res: Response) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user!.id);
  res.json({ ok: true });
});

// ================= CODING ACADEMY =================
app.get('/api/courses', requireAuth, (req: AuthedRequest, res: Response) => {
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';
  const courses = db
    .prepare(
      isAdmin
        ? 'SELECT * FROM courses ORDER BY id ASC'
        : 'SELECT * FROM courses WHERE is_published = 1 ORDER BY id ASC'
    )
    .all() as { id: number; slug: string; title: string; description: string; level: string; is_published: number }[];

  const result = courses.map((course) => {
    const modules = db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY order_index ASC').all(course.id);
    const lessons = db
      .prepare(
        `
      SELECT l.*,
        COALESCE(lp.completed, 0) as completed,
        lp.practice_html,
        lp.practice_css,
        lp.completed_at,
        q.id as quiz_id,
        q.title as quiz_title,
        q.pass_score
      FROM lessons l
      LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = ?
      LEFT JOIN quizzes q ON q.lesson_id = l.id
      WHERE l.course_id = ? ${isAdmin ? '' : 'AND l.is_published = 1'}
      ORDER BY l.order_index ASC
    `
      )
      .all(userId, course.id) as Record<string, unknown>[];

    const enrichedLessons = lessons.map((lesson) => {
      const questions = lesson.quiz_id
        ? (
            db
              .prepare('SELECT id, question_text, options_json FROM questions WHERE quiz_id = ? ORDER BY id ASC')
              .all(Number(lesson.quiz_id)) as { id: number; question_text: string; options_json: string }[]
          ).map((q) => ({
            id: q.id,
            question_text: q.question_text,
            options: JSON.parse(q.options_json) as string[],
          }))
        : [];
      return { ...lesson, quiz_questions: questions };
    });

    return { ...course, modules, lessons: enrichedLessons };
  });

  res.json({ courses: result });
});

app.post('/api/lessons/:id/practice', requireAuth, (req: AuthedRequest, res: Response) => {
  const lessonId = Number(req.params.id);
  const html = String(req.body?.html || '');
  const css = String(req.body?.css || '');
  db.prepare(
    `
    INSERT INTO lesson_progress (user_id, lesson_id, practice_html, practice_css)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, lesson_id) DO UPDATE SET practice_html = excluded.practice_html, practice_css = excluded.practice_css
  `
  ).run(req.user!.id, lessonId, html, css);
  res.json({ ok: true });
});

app.post('/api/lessons/:id/quiz', requireAuth, (req: AuthedRequest, res: Response) => {
  const lessonId = Number(req.params.id);
  const answers = (req.body?.answers || {}) as Record<string, number>;
  const userId = req.user!.id;

  const lesson = db
    .prepare('SELECT l.*, c.slug as course_slug FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = ?')
    .get(lessonId) as { id: number; title: string; points: number; course_id: number; course_slug: string } | undefined;
  const quiz = db.prepare('SELECT * FROM quizzes WHERE lesson_id = ?').get(lessonId) as
    | { id: number; pass_score: number }
    | undefined;

  if (!lesson || !quiz) {
    res.status(404).json({ error: 'Lesson quiz not found.' });
    return;
  }

  const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY id ASC').all(quiz.id) as {
    id: number;
    correct_index: number;
    explanation: string;
  }[];

  let correctCount = 0;
  const feedback = questions.map((q) => {
    const selected = Number(answers[String(q.id)]);
    const isCorrect = selected === q.correct_index;
    if (isCorrect) correctCount += 1;
    return {
      questionId: q.id,
      isCorrect,
      correctIndex: q.correct_index,
      explanation: q.explanation,
    };
  });

  const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 100;
  const passed = score >= quiz.pass_score ? 1 : 0;

  db.prepare('INSERT INTO quiz_attempts (user_id, quiz_id, score, passed, answers_json) VALUES (?, ?, ?, ?, ?)').run(
    userId,
    quiz.id,
    score,
    passed,
    JSON.stringify(answers)
  );

  const alreadyCompleted = db
    .prepare('SELECT completed FROM lesson_progress WHERE user_id = ? AND lesson_id = ?')
    .get(userId, lessonId) as { completed: number } | undefined;

  let pointsEarned = 0;
  const unlockedBadges: string[] = [];

  if (passed) {
    db.prepare(
      `
      INSERT INTO lesson_progress (user_id, lesson_id, completed, completed_at)
      VALUES (?, ?, 1, datetime('now'))
      ON CONFLICT(user_id, lesson_id) DO UPDATE SET completed = 1, completed_at = COALESCE(completed_at, datetime('now'))
    `
    ).run(userId, lessonId);

    if (!alreadyCompleted?.completed) {
      pointsEarned = lesson.points;
      awardPoints(userId, pointsEarned, `Completed lesson: ${lesson.title}`);
      logActivity(userId, 'Lesson Completed', `${req.user!.name} completed "${lesson.title}" (+${pointsEarned} pts)`);

      const b1 = checkAndGrantAchievement(userId, 'first-tag');
      if (b1) unlockedBadges.push(b1.title);

      const htmlCompleted = (
        db
          .prepare(
            `SELECT COUNT(*) as c FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id JOIN courses co ON co.id = l.course_id
             WHERE lp.user_id = ? AND lp.completed = 1 AND co.slug = 'html-fundamentals'`
          )
          .get(userId) as { c: number }
      ).c;
      if (htmlCompleted >= 11) {
        const b2 = checkAndGrantAchievement(userId, 'html-graduate');
        if (b2) unlockedBadges.push(b2.title);
      }

      const cssCompleted = (
        db
          .prepare(
            `SELECT COUNT(*) as c FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id JOIN courses co ON co.id = l.course_id
             WHERE lp.user_id = ? AND lp.completed = 1 AND co.slug = 'css-mastery'`
          )
          .get(userId) as { c: number }
      ).c;
      if (cssCompleted >= 5) {
        const b3 = checkAndGrantAchievement(userId, 'css-artist');
        if (b3) unlockedBadges.push(b3.title);
      }
    }
  }

  res.json({
    score,
    passed: Boolean(passed),
    pointsEarned,
    unlockedBadges,
    feedback,
  });
});

// ================= PLAYGROUND & GUIDED WEBSITE BUILDER =================
app.get('/api/projects', requireAuth, (req: AuthedRequest, res: Response) => {
  const projects = db
    .prepare('SELECT * FROM coding_projects WHERE user_id = ? ORDER BY updated_at DESC, id DESC')
    .all(req.user!.id);
  const challenges = db
    .prepare(
      `
    SELECT cc.*,
      (SELECT status FROM challenge_submissions cs WHERE cs.challenge_id = cc.id AND cs.user_id = ? ORDER BY cs.id DESC LIMIT 1) as my_status,
      (SELECT feedback FROM challenge_submissions cs WHERE cs.challenge_id = cc.id AND cs.user_id = ? ORDER BY cs.id DESC LIMIT 1) as my_feedback
    FROM coding_challenges cc
    WHERE cc.is_active = 1
    ORDER BY cc.id DESC
  `
    )
    .all(req.user!.id, req.user!.id);
  res.json({
    projects,
    guidedTemplates: GUIDED_PROJECT_TEMPLATES,
    challenges,
  });
});

app.post('/api/projects', requireAuth, (req: AuthedRequest, res: Response) => {
  const title = String(req.body?.title || 'Untitled Creation').trim().slice(0, 120);
  const projectType = req.body?.projectType === 'guided' ? 'guided' : 'playground';
  const templateSlug = req.body?.templateSlug ? String(req.body.templateSlug) : null;
  const difficulty = String(req.body?.difficulty || 'Beginner');
  const htmlCode = String(req.body?.htmlCode || '');
  const cssCode = String(req.body?.cssCode || '');
  const jsCode = String(req.body?.jsCode || '');
  const status = req.body?.submit ? 'submitted' : 'draft';

  const info = db
    .prepare(
      `
    INSERT INTO coding_projects (user_id, template_slug, title, project_type, difficulty, html_code, css_code, js_code, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
    )
    .run(req.user!.id, templateSlug, title, projectType, difficulty, htmlCode, cssCode, jsCode, status);

  checkAndGrantAchievement(req.user!.id, 'sandbox-tinkerer');
  if (status === 'submitted') {
    checkAndGrantAchievement(req.user!.id, 'site-builder');
    logActivity(req.user!.id, 'Project Submitted', `${req.user!.name} submitted "${title}" for parent review`);
    notifyFamily(req.user!.id, 'New Project Submission', `${req.user!.name} submitted "${title}" for review.`, 'project');
  } else {
    logActivity(req.user!.id, 'Project Saved', `${req.user!.name} saved "${title}"`);
  }

  const created = db.prepare('SELECT * FROM coding_projects WHERE id = ?').get(Number(info.lastInsertRowid));
  res.json({ project: created });
});

app.put('/api/projects/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM coding_projects WHERE id = ? AND user_id = ?').get(id, req.user!.id) as
    | { id: number; title: string; status: string }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const title = String(req.body?.title || existing.title).trim().slice(0, 120);
  const htmlCode = String(req.body?.htmlCode ?? '');
  const cssCode = String(req.body?.cssCode ?? '');
  const jsCode = String(req.body?.jsCode ?? '');
  const nextStatus = req.body?.submit ? 'submitted' : existing.status === 'approved' ? 'approved' : 'draft';

  db.prepare(
    `
    UPDATE coding_projects
    SET title = ?, html_code = ?, css_code = ?, js_code = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `
  ).run(title, htmlCode, cssCode, jsCode, nextStatus, id);

  if (req.body?.submit) {
    checkAndGrantAchievement(req.user!.id, 'site-builder');
    logActivity(req.user!.id, 'Project Submitted', `${req.user!.name} submitted "${title}" for parent review`);
    notifyFamily(req.user!.id, 'Project Ready for Review', `${req.user!.name} submitted "${title}".`, 'project');
  }

  const updated = db.prepare('SELECT * FROM coding_projects WHERE id = ?').get(id);
  res.json({ project: updated });
});

app.delete('/api/projects/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM coding_projects WHERE id = ? AND user_id = ?').run(id, req.user!.id);
  res.json({ ok: true });
});

app.post('/api/challenges/:id/submit', requireAuth, (req: AuthedRequest, res: Response) => {
  const challengeId = Number(req.params.id);
  const htmlCode = String(req.body?.htmlCode || '');
  const cssCode = String(req.body?.cssCode || '');
  const jsCode = String(req.body?.jsCode || '');
  const challenge = db.prepare('SELECT * FROM coding_challenges WHERE id = ?').get(challengeId) as
    | { id: number; title: string; points: number }
    | undefined;
  if (!challenge) {
    res.status(404).json({ error: 'Challenge not found.' });
    return;
  }

  db.prepare(
    `INSERT INTO challenge_submissions (challenge_id, user_id, html_code, css_code, js_code, status) VALUES (?, ?, ?, ?, ?, 'submitted')`
  ).run(challengeId, req.user!.id, htmlCode, cssCode, jsCode);
  awardPoints(req.user!.id, 20, `Submitted challenge: ${challenge.title}`);
  logActivity(req.user!.id, 'Challenge Submitted', `${req.user!.name} submitted "${challenge.title}"`);
  notifyFamily(req.user!.id, 'Challenge Completed', `${req.user!.name} submitted "${challenge.title}".`, 'challenge');
  res.json({ ok: true });
});

// ================= FAMILY MESSENGER & PRIVATE FILE STORAGE =================
app.get('/api/conversations', requireAuth, (req: AuthedRequest, res: Response) => {
  const userId = req.user!.id;
  const rows = db
    .prepare(
      `
    SELECT c.id, c.type, c.title,
      (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) as last_message_at
    FROM conversations c
    JOIN conversation_members cm ON cm.conversation_id = c.id
    WHERE cm.user_id = ?
    ORDER BY c.type ASC, c.id ASC
  `
    )
    .all(userId) as { id: number; type: string; title: string; last_message: string | null; last_message_at: string | null }[];

  const enriched = rows.map((conv) => {
    const members = db
      .prepare(
        `SELECT u.id, u.name, u.avatar_url, u.is_online, u.role
         FROM conversation_members cm JOIN users u ON u.id = cm.user_id
         WHERE cm.conversation_id = ?`
      )
      .all(conv.id) as { id: number; name: string; avatar_url: string; is_online: number; role: string }[];
    const displayTitle =
      conv.type === 'direct' ? members.find((m) => m.id !== userId)?.name || conv.title : conv.title;
    return { ...conv, displayTitle, members };
  });

  res.json({ conversations: enriched });
});

app.get('/api/conversations/:id/messages', requireAuth, (req: AuthedRequest, res: Response) => {
  const convId = Number(req.params.id);
  const member = db
    .prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?')
    .get(convId, req.user!.id);
  if (!member) {
    res.status(403).json({ error: 'You are not a member of this private family conversation.' });
    return;
  }

  const messages = db
    .prepare(
      `
    SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = ?
    ORDER BY m.id ASC
    LIMIT 200
  `
    )
    .all(convId);

  res.json({ messages });
});

app.post('/api/uploads/image', requireAuth, (req: AuthedRequest, res: Response) => {
  const dataUrl = String(req.body?.dataUrl || '');
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    res.status(400).json({ error: 'Only PNG, JPEG, or WebP images are permitted.' });
    return;
  }
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 2 * 1024 * 1024) {
    res.status(400).json({ error: 'Image must be smaller than 2 MB.' });
    return;
  }
  const filename = `fc_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);
  res.json({ url: `/api/uploads/${filename}` });
});

app.get('/api/uploads/:filename', requireAuth, (req: AuthedRequest, res: Response) => {
  const safeName = path.basename(String(req.params.filename || ''));
  const filePath = path.join(uploadsDir, safeName);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found.' });
    return;
  }
  res.sendFile(filePath);
});

// ================= VIDEO CALLING & LIVEKIT TOKEN =================
app.get('/api/meetings', requireAuth, (_req: AuthedRequest, res: Response) => {
  const meetings = db
    .prepare(
      `SELECT m.*, u.name as host_name
       FROM video_meetings m JOIN users u ON u.id = m.host_user_id
       WHERE m.is_active = 1
       ORDER BY m.id DESC`
    )
    .all();
  res.json({
    meetings,
    livekitConfigured: Boolean(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET),
  });
});

app.post('/api/meetings', requireAuth, (req: AuthedRequest, res: Response) => {
  const title = String(req.body?.title || 'Family Call').trim().slice(0, 80);
  const roomCode = `FAM-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  const info = db
    .prepare('INSERT INTO video_meetings (room_code, title, host_user_id, is_active) VALUES (?, ?, ?, 1)')
    .run(roomCode, title, req.user!.id);
  const created = db.prepare('SELECT * FROM video_meetings WHERE id = ?').get(Number(info.lastInsertRowid));
  notifyFamily(req.user!.id, 'Family Video Call Started', `${req.user!.name} opened "${title}" (${roomCode}).`, 'meeting');
  logActivity(req.user!.id, 'Video Meeting Created', `${req.user!.name} opened room ${roomCode}`);
  res.json({ meeting: created });
});

app.post('/api/meetings/:roomCode/token', requireAuth, async (req: AuthedRequest, res: Response) => {
  const roomCode = String(req.params.roomCode || '').trim().toUpperCase();
  const meeting = db.prepare('SELECT * FROM video_meetings WHERE room_code = ? AND is_active = 1').get(roomCode);
  if (!meeting && !roomCode.startsWith('RACE-')) {
    res.status(404).json({ error: 'Private family meeting room not found.' });
    return;
  }

  const lkUrl = process.env.LIVEKIT_URL;
  const lkKey = process.env.LIVEKIT_API_KEY;
  const lkSecret = process.env.LIVEKIT_API_SECRET;

  if (lkUrl && lkKey && lkSecret) {
    const at = new AccessToken(lkKey, lkSecret, {
      identity: `family-user-${req.user!.id}`,
      name: req.user!.name,
      ttl: '2h',
    });
    at.addGrant({ roomJoin: true, room: roomCode, canPublish: true, canSubscribe: true });
    const token = await at.toJwt();
    res.json({ mode: 'livekit', url: lkUrl, token, roomCode });
    return;
  }

  res.json({
    mode: 'webrtc-mesh',
    roomCode,
    note: 'Authenticated peer-to-peer WebRTC signaling over private family WebSocket channel.',
  });
});

// ================= RACING SUMMARY & LEADERBOARD =================
app.get('/api/racing/summary', requireAuth, (_req: AuthedRequest, res: Response) => {
  const recentResults = db
    .prepare(
      `
    SELECT rr.*, u.name as player_name, u.avatar_url
    FROM racing_results rr
    JOIN users u ON u.id = rr.user_id
    ORDER BY rr.id DESC
    LIMIT 18
  `
    )
    .all();

  const leaderboard = db
    .prepare(
      `
    SELECT u.id, u.name, u.avatar_url,
      COUNT(rr.id) as races_played,
      SUM(CASE WHEN rr.position = 1 THEN 1 ELSE 0 END) as wins,
      MIN(rr.race_time_ms) as best_time_ms
    FROM users u
    LEFT JOIN racing_results rr ON rr.user_id = u.id
    GROUP BY u.id
    ORDER BY wins DESC, races_played DESC, u.id ASC
  `
    )
    .all();

  res.json({ tracks: Object.values(TRACKS), recentResults, leaderboard });
});

// ================= REWARDS & ACHIEVEMENTS =================
app.get('/api/rewards', requireAuth, (req: AuthedRequest, res: Response) => {
  const leaderboard = db
    .prepare('SELECT id, name, role, age, avatar_url, points, streak_days FROM users ORDER BY points DESC, id ASC')
    .all();
  const allAchievements = db.prepare('SELECT * FROM achievements ORDER BY id ASC').all();
  const earnedRows = db
    .prepare('SELECT ua.*, u.name as user_name FROM user_achievements ua JOIN users u ON u.id = ua.user_id')
    .all();
  const transactions = db
    .prepare(
      `
    SELECT rt.*, u.name as user_name, a.name as awarded_by_name
    FROM reward_transactions rt
    JOIN users u ON u.id = rt.user_id
    LEFT JOIN users a ON a.id = rt.awarded_by
    ORDER BY rt.id DESC
    LIMIT 30
  `
    )
    .all();

  const completedCourses = db
    .prepare(
      `
    SELECT c.id, c.title, c.slug,
      (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.is_published = 1) as total_lessons,
      (SELECT COUNT(*) FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
       WHERE l.course_id = c.id AND lp.user_id = ? AND lp.completed = 1) as completed_lessons
    FROM courses c
  `
    )
    .all(req.user!.id);

  res.json({
    leaderboard,
    allAchievements,
    earnedRows,
    transactions,
    completedCourses,
  });
});

// ================= PARENT ADMINISTRATION =================
app.get('/api/admin/overview', requireAuth, requireAdmin, (_req: AuthedRequest, res: Response) => {
  const users = db
    .prepare('SELECT id, name, email, role, age, avatar_url, bio, points, streak_days, is_online, last_active_at FROM users ORDER BY id ASC')
    .all();
  const courses = db.prepare('SELECT * FROM courses ORDER BY id ASC').all();
  const modules = db.prepare('SELECT * FROM modules ORDER BY id ASC').all();
  const lessons = db
    .prepare(
      `SELECT l.*, c.title as course_title FROM lessons l JOIN courses c ON c.id = l.course_id ORDER BY l.course_id ASC, l.order_index ASC`
    )
    .all();
  const projects = db
    .prepare(
      `SELECT p.*, u.name as author_name, u.avatar_url as author_avatar
       FROM coding_projects p JOIN users u ON u.id = p.user_id
       ORDER BY p.updated_at DESC`
    )
    .all();
  const challenges = db.prepare('SELECT * FROM coding_challenges ORDER BY id DESC').all();
  const quizAttempts = db
    .prepare(
      `SELECT qa.*, u.name as student_name, l.title as lesson_title
       FROM quiz_attempts qa
       JOIN users u ON u.id = qa.user_id
       JOIN quizzes q ON q.id = qa.quiz_id
       JOIN lessons l ON l.id = q.lesson_id
       ORDER BY qa.id DESC LIMIT 30`
    )
    .all();
  const raceHistory = db
    .prepare(
      `SELECT rr.*, u.name as player_name FROM racing_results rr JOIN users u ON u.id = rr.user_id ORDER BY rr.id DESC LIMIT 30`
    )
    .all();
  const activityLogs = db
    .prepare(
      `SELECT a.*, u.name as user_name FROM activity_logs a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 40`
    )
    .all();
  const settings = db.prepare('SELECT * FROM system_settings').all();
  const achievements = db.prepare('SELECT * FROM achievements ORDER BY id ASC').all();

  res.json({
    users,
    courses,
    modules,
    lessons,
    projects,
    challenges,
    quizAttempts,
    raceHistory,
    activityLogs,
    settings,
    achievements,
  });
});

app.post('/api/admin/users/:id/reset-password', requireAuth, requireAdmin, (req: AuthedRequest, res: Response) => {
  const targetId = Number(req.params.id);
  const newPassword = String(req.body?.newPassword || '');
  if (newPassword.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    return;
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(hash, targetId);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetId);
  logActivity(req.user!.id, 'Password Reset', `Administrator reset password for user #${targetId}`);
  res.json({ ok: true });
});

app.put('/api/admin/users/:id', requireAuth, requireAdmin, (req: AuthedRequest, res: Response) => {
  const targetId = Number(req.params.id);
  const name = String(req.body?.name || '').trim();
  const age = req.body?.age ? Number(req.body.age) : null;
  const bio = String(req.body?.bio || '').trim();
  if (!name) {
    res.status(400).json({ error: 'Name is required.' });
    return;
  }
  db.prepare(`UPDATE users SET name = ?, age = ?, bio = ?, updated_at = datetime('now') WHERE id = ?`).run(
    name,
    age,
    bio,
    targetId
  );
  res.json({ ok: true });
});

app.post('/api/admin/courses', requireAuth, requireAdmin, (req: AuthedRequest, res: Response) => {
  const title = String(req.body?.title || '').trim();
  const description = String(req.body?.description || '').trim();
  const level = String(req.body?.level || 'Beginner').trim();
  if (!title) {
    res.status(400).json({ error: 'Course title is required.' });
    return;
  }
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
  const info = db
    .prepare('INSERT INTO courses (slug, title, description, level) VALUES (?, ?, ?, ?)')
    .run(slug, title, description || 'Custom family course', level);
  db.prepare('INSERT INTO modules (course_id, title, order_index) VALUES (?, ?, 1)').run(
    Number(info.lastInsertRowid),
    'Module 1'
  );
  logActivity(req.user!.id, 'Course Created', `Dad created course "${title}"`);
  res.json({ ok: true, id: Number(info.lastInsertRowid) });
});

app.post('/api/admin/lessons', requireAuth, requireAdmin, (req: AuthedRequest, res: Response) => {
  const courseId = Number(req.body?.courseId);
  const title = String(req.body?.title || '').trim();
  const summary = String(req.body?.summary || '').trim();
  const explanation = String(req.body?.explanation || '').trim();
  const exampleCode = String(req.body?.exampleCode || '<h1>Hello!</h1>');
  const expectedOutput = String(req.body?.expectedOutput || 'Renders a heading.');
  const exercisePrompt = String(req.body?.exercisePrompt || 'Try editing the code!');
  const starterHtml = String(req.body?.starterHtml || '<h1>Practice Here</h1>');
  const starterCss = String(req.body?.starterCss || 'body { font-family: sans-serif; padding: 16px; }');
  const points = Math.max(10, Number(req.body?.points || 25));

  if (!courseId || !title) {
    res.status(400).json({ error: 'Course and lesson title are required.' });
    return;
  }

  let mod = db.prepare('SELECT id FROM modules WHERE course_id = ? ORDER BY order_index ASC LIMIT 1').get(courseId) as
    | { id: number }
    | undefined;
  if (!mod) {
    const mInfo = db.prepare('INSERT INTO modules (course_id, title, order_index) VALUES (?, ?, 1)').run(courseId, 'Core Lessons');
    mod = { id: Number(mInfo.lastInsertRowid) };
  }
  const maxOrder = (
    db.prepare('SELECT COALESCE(MAX(order_index), 0) as m FROM lessons WHERE course_id = ?').get(courseId) as { m: number }
  ).m;

  const info = db
    .prepare(
      `INSERT INTO lessons (course_id, module_id, order_index, title, summary, explanation, example_code, expected_output, exercise_prompt, starter_html, starter_css, points)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(courseId, mod.id, maxOrder + 1, title, summary, explanation, exampleCode, expectedOutput, exercisePrompt, starterHtml, starterCss, points);

  const lessonId = Number(info.lastInsertRowid);
  const qInfo = db.prepare('INSERT INTO quizzes (lesson_id, title, pass_score) VALUES (?, ?, 70)').run(lessonId, `${title} Quiz`);
  db.prepare(
    'INSERT INTO questions (quiz_id, question_text, options_json, correct_index, explanation) VALUES (?, ?, ?, ?, ?)'
  ).run(
    Number(qInfo.lastInsertRowid),
    `Ready to apply what you learned in "${title}"?`,
    JSON.stringify(['Yes, I practiced the example!', 'Not yet']),
    0,
    'Practicing in the live preview reinforces every HTML and CSS concept.'
  );

  logActivity(req.user!.id, 'Lesson Added', `Dad added lesson "${title}"`);
  res.json({ ok: true, id: lessonId });
});

app.put('/api/admin/lessons/:id', requireAuth, requireAdmin, (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM lessons WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Lesson not found.' });
    return;
  }
  db.prepare(
    `UPDATE lessons SET title = ?, summary = ?, explanation = ?, exercise_prompt = ?, points = ?, is_published = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    String(req.body?.title ?? existing.title),
    String(req.body?.summary ?? existing.summary),
    String(req.body?.explanation ?? existing.explanation),
    String(req.body?.exercisePrompt ?? existing.exercise_prompt),
    Number(req.body?.points ?? existing.points),
    req.body?.isPublished === undefined ? Number(existing.is_published) : req.body.isPublished ? 1 : 0,
    id
  );
  res.json({ ok: true });
});

app.post('/api/admin/challenges', requireAuth, requireAdmin, (req: AuthedRequest, res: Response) => {
  const title = String(req.body?.title || '').trim();
  const description = String(req.body?.description || '').trim();
  const difficulty = String(req.body?.difficulty || 'Beginner');
  const points = Math.max(10, Number(req.body?.points || 50));
  const starterHtml = String(req.body?.starterHtml || '<h1>Challenge Workspace</h1>');
  const starterCss = String(req.body?.starterCss || 'body { font-family: sans-serif; padding: 20px; }');
  const starterJs = String(req.body?.starterJs || '');

  if (!title || !description) {
    res.status(400).json({ error: 'Title and description are required.' });
    return;
  }

  db.prepare(
    `INSERT INTO coding_challenges (created_by, title, description, difficulty, points, starter_html, starter_css, starter_js)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(req.user!.id, title, description, difficulty, points, starterHtml, starterCss, starterJs);

  notifyFamily(req.user!.id, 'New Coding Assignment', `Dad created a new challenge: "${title}" (+${points} pts).`, 'challenge');
  logActivity(req.user!.id, 'Assignment Created', `Dad assigned "${title}"`);
  res.json({ ok: true });
});

app.post('/api/admin/projects/:id/review', requireAuth, requireAdmin, (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const status = req.body?.status === 'approved' ? 'approved' : 'needs_revision';
  const feedback = String(req.body?.feedback || '').trim();
  const bonusPoints = Math.max(0, Number(req.body?.bonusPoints || 0));

  const project = db.prepare('SELECT * FROM coding_projects WHERE id = ?').get(id) as
    | { id: number; user_id: number; title: string }
    | undefined;
  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  db.prepare(`UPDATE coding_projects SET status = ?, parent_feedback = ?, updated_at = datetime('now') WHERE id = ?`).run(
    status,
    feedback,
    id
  );
  if (status === 'approved' && bonusPoints > 0) {
    awardPoints(project.user_id, bonusPoints, `Parent approved project: ${project.title}`, req.user!.id);
  }
  db.prepare('INSERT INTO notifications (user_id, title, message, category) VALUES (?, ?, ?, ?)').run(
    project.user_id,
    `Project Reviewed: ${project.title}`,
    status === 'approved'
      ? `Approved by Dad! ${feedback}${bonusPoints ? ` (+${bonusPoints} pts)` : ''}`
      : `Feedback from Dad: ${feedback}`,
    'project'
  );
  logActivity(req.user!.id, 'Project Reviewed', `Dad marked "${project.title}" as ${status}`);
  res.json({ ok: true });
});

app.post('/api/admin/rewards/grant', requireAuth, requireAdmin, (req: AuthedRequest, res: Response) => {
  const userId = Number(req.body?.userId);
  const amount = Number(req.body?.amount || 0);
  const reason = String(req.body?.reason || 'Family Bonus Reward').trim();
  if (!userId || !amount) {
    res.status(400).json({ error: 'Target user and point amount are required.' });
    return;
  }
  awardPoints(userId, amount, reason, req.user!.id);
  db.prepare('INSERT INTO notifications (user_id, title, message, category) VALUES (?, ?, ?, ?)').run(
    userId,
    'Bonus Reward Earned!',
    `Dad awarded you +${amount} points: ${reason}`,
    'reward'
  );
  logActivity(req.user!.id, 'Reward Granted', `Dad granted +${amount} pts to user #${userId}: ${reason}`);
  res.json({ ok: true });
});

app.put('/api/admin/settings', requireAuth, requireAdmin, (req: AuthedRequest, res: Response) => {
  const updates = (req.body?.settings || {}) as Record<string, string>;
  const stmt = db.prepare(
    `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  );
  for (const [k, v] of Object.entries(updates)) {
    stmt.run(k, String(v));
  }
  logActivity(req.user!.id, 'Security Settings Updated', 'Administrator updated family privacy settings');
  res.json({ ok: true });
});

// ================= VITE / STATIC FRONTEND & WS SERVER =================
async function start() {
  const httpServer = http.createServer(app);
  attachWebSocketServer(httpServer);

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Family Connect server listening on http://0.0.0.0:${PORT}`);
  });
}

start();
