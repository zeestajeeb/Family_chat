import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { GUIDED_PROJECT_TEMPLATES, SEED_LESSONS } from './seedData.ts';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new DatabaseSync(path.join(dataDir, 'family_connect.sqlite'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'student')),
    age INTEGER,
    avatar_url TEXT NOT NULL,
    bio TEXT DEFAULT '',
    points INTEGER NOT NULL DEFAULT 0,
    streak_days INTEGER NOT NULL DEFAULT 1,
    is_online INTEGER NOT NULL DEFAULT 0,
    last_active_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    remember_me INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    level TEXT NOT NULL,
    is_published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    explanation TEXT NOT NULL,
    example_code TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    exercise_prompt TEXT NOT NULL,
    starter_html TEXT NOT NULL,
    starter_css TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 25,
    is_published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lesson_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    completed INTEGER NOT NULL DEFAULT 0,
    practice_html TEXT,
    practice_css TEXT,
    completed_at TEXT,
    UNIQUE(user_id, lesson_id)
  );

  CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    pass_score INTEGER NOT NULL DEFAULT 70
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options_json TEXT NOT NULL,
    correct_index INTEGER NOT NULL,
    explanation TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    passed INTEGER NOT NULL,
    answers_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS coding_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_slug TEXT,
    title TEXT NOT NULL,
    project_type TEXT NOT NULL CHECK(project_type IN ('playground', 'guided')),
    difficulty TEXT DEFAULT 'Beginner',
    html_code TEXT NOT NULL,
    css_code TEXT NOT NULL,
    js_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'approved', 'needs_revision')),
    parent_feedback TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS coding_challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 50,
    starter_html TEXT NOT NULL,
    starter_css TEXT NOT NULL,
    starter_js TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS challenge_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id INTEGER NOT NULL REFERENCES coding_challenges(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    html_code TEXT NOT NULL,
    css_code TEXT NOT NULL,
    js_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted', 'approved', 'needs_revision')),
    feedback TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('learning', 'coding', 'racing', 'family')),
    points_bonus INTEGER NOT NULL DEFAULT 50,
    icon_name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    awarded_by INTEGER REFERENCES users(id),
    earned_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, achievement_id)
  );

  CREATE TABLE IF NOT EXISTS reward_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    awarded_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS racing_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invite_code TEXT NOT NULL UNIQUE,
    host_user_id INTEGER NOT NULL REFERENCES users(id),
    track_id TEXT NOT NULL DEFAULT 'emerald-circuit',
    laps INTEGER NOT NULL DEFAULT 3,
    status TEXT NOT NULL DEFAULT 'lobby' CHECK(status IN ('lobby', 'countdown', 'racing', 'finished')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS racing_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code TEXT NOT NULL,
    track_id TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    car_model TEXT NOT NULL,
    car_color TEXT NOT NULL,
    position INTEGER NOT NULL,
    race_time_ms INTEGER NOT NULL,
    points_earned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('group', 'direct')),
    title TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversation_members (
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (conversation_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    attachment_url TEXT,
    reactions_json TEXT NOT NULL DEFAULT '{}',
    read_by_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS video_meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    host_user_id INTEGER NOT NULL REFERENCES users(id),
    is_active INTEGER NOT NULL DEFAULT 1,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'system',
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export function seedDatabase(): void {
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount === 0) {
    const fatherHash = bcrypt.hashSync('FatherPass123!', 10);
    const leoHash = bcrypt.hashSync('LeoCode123!', 10);
    const mayaHash = bcrypt.hashSync('MayaCode123!', 10);

    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, age, avatar_url, bio, points, streak_days)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      'David (Dad)',
      'father@familyconnect.local',
      fatherHash,
      'admin',
      39,
      '/src/assets/images/avatar_father_1794844438894.jpg',
      'Family Administrator & Coding Mentor',
      250,
      7
    );
    insertUser.run(
      'Leo',
      'leo@familyconnect.local',
      leoHash,
      'student',
      12,
      '/src/assets/images/avatar_child_one_1794844439270.jpg',
      'Aspiring Web Creator & Turbo GT Driver',
      180,
      5
    );
    insertUser.run(
      'Maya',
      'maya@familyconnect.local',
      mayaHash,
      'student',
      9,
      '/src/assets/images/avatar_child_two_1794844439585.jpg',
      'CSS Color Artist & Track Champion',
      165,
      4
    );
  }

  const courseCount = (db.prepare('SELECT COUNT(*) as c FROM courses').get() as { c: number }).c;
  if (courseCount === 0) {
    const insertCourse = db.prepare(`
      INSERT INTO courses (slug, title, description, level) VALUES (?, ?, ?, ?)
    `);
    const htmlCourseId = Number(
      insertCourse.run(
        'html-fundamentals',
        'HTML5 Foundations',
        'Build web page structure with tags, headings, links, lists, tables, forms, and semantic HTML.',
        'Ages 9–12 · Beginner'
      ).lastInsertRowid
    );
    const cssCourseId = Number(
      insertCourse.run(
        'css-mastery',
        'CSS3 Styling & Layout',
        'Design colorful, responsive websites using selectors, colors, box model, Flexbox, Grid, and animations.',
        'Ages 9–12 · Beginner to Intermediate'
      ).lastInsertRowid
    );

    const courseIdMap: Record<string, number> = {
      'html-fundamentals': htmlCourseId,
      'css-mastery': cssCourseId,
    };
    const moduleIdMap = new Map<string, number>();

    const insertModule = db.prepare(`INSERT INTO modules (course_id, title, order_index) VALUES (?, ?, ?)`);
    const insertLesson = db.prepare(`
      INSERT INTO lessons (
        course_id, module_id, order_index, title, summary, explanation,
        example_code, expected_output, exercise_prompt, starter_html, starter_css, points
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertQuiz = db.prepare(`INSERT INTO quizzes (lesson_id, title, pass_score) VALUES (?, ?, 70)`);
    const insertQuestion = db.prepare(`
      INSERT INTO questions (quiz_id, question_text, options_json, correct_index, explanation)
      VALUES (?, ?, ?, ?, ?)
    `);

    let moduleCounter = 0;
    for (const lesson of SEED_LESSONS) {
      const courseId = courseIdMap[lesson.courseSlug];
      const modKey = `${lesson.courseSlug}:${lesson.moduleTitle}`;
      let moduleId = moduleIdMap.get(modKey);
      if (!moduleId) {
        moduleCounter += 1;
        moduleId = Number(insertModule.run(courseId, lesson.moduleTitle, moduleCounter).lastInsertRowid);
        moduleIdMap.set(modKey, moduleId);
      }

      const lessonId = Number(
        insertLesson.run(
          courseId,
          moduleId,
          lesson.orderIndex,
          lesson.title,
          lesson.summary,
          lesson.explanation,
          lesson.exampleCode,
          lesson.expectedOutput,
          lesson.exercisePrompt,
          lesson.starterHtml,
          lesson.starterCss,
          lesson.points
        ).lastInsertRowid
      );

      const quizId = Number(insertQuiz.run(lessonId, `${lesson.title} Quick Check`).lastInsertRowid);
      for (const q of lesson.quiz) {
        insertQuestion.run(quizId, q.question, JSON.stringify(q.options), q.correctIndex, q.explanation);
      }
    }
  }

  const achCount = (db.prepare('SELECT COUNT(*) as c FROM achievements').get() as { c: number }).c;
  if (achCount === 0) {
    const insertAch = db.prepare(`
      INSERT INTO achievements (slug, title, description, category, points_bonus, icon_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertAch.run('first-tag', 'First HTML Tag', 'Completed your very first HTML lesson and quiz.', 'learning', 40, 'Code2');
    insertAch.run('html-graduate', 'HTML5 Graduate', 'Finished all 11 HTML5 Foundations lessons.', 'learning', 150, 'GraduationCap');
    insertAch.run('css-artist', 'CSS Color Artist', 'Mastered CSS styling and passed 5 CSS quizzes.', 'learning', 100, 'Palette');
    insertAch.run('site-builder', 'Junior Web Architect', 'Submitted a guided website project for parent review.', 'coding', 80, 'LayoutTemplate');
    insertAch.run('sandbox-tinkerer', 'Playground Explorer', 'Saved your first custom creation in the Coding Playground.', 'coding', 50, 'Terminal');
    insertAch.run('grand-prix-winner', 'Family Grand Prix Winner', 'Finished 1st place in a live 3-player Family Racing race!', 'racing', 100, 'Trophy');
    insertAch.run('clean-lap', 'Track Challenger', 'Completed a multiplayer family race from start to finish.', 'racing', 40, 'Flag');
    insertAch.run('team-communicator', 'Family Connector', 'Joined a live family video call and shared progress.', 'family', 50, 'HeartHandshake');

    // Award initial starter badges to Leo & Maya
    const leo = db.prepare('SELECT id FROM users WHERE email = ?').get('leo@familyconnect.local') as { id: number } | undefined;
    const maya = db.prepare('SELECT id FROM users WHERE email = ?').get('maya@familyconnect.local') as { id: number } | undefined;
    const firstTag = db.prepare('SELECT id FROM achievements WHERE slug = ?').get('first-tag') as { id: number } | undefined;
    if (leo && firstTag) {
      db.prepare('INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)').run(leo.id, firstTag.id);
    }
    if (maya && firstTag) {
      db.prepare('INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)').run(maya.id, firstTag.id);
    }
  }

  const challengeCount = (db.prepare('SELECT COUNT(*) as c FROM coding_challenges').get() as { c: number }).c;
  if (challengeCount === 0) {
    const dad = db.prepare('SELECT id FROM users WHERE role = ?').get('admin') as { id: number };
    const insertChallenge = db.prepare(`
      INSERT INTO coding_challenges (created_by, title, description, difficulty, points, starter_html, starter_css, starter_js)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertChallenge.run(
      dad.id,
      'Weekend Weather Card',
      'Build a neat weather forecast card showing today’s temperature, sky icon, and 3-day forecast using Flexbox!',
      'Beginner',
      60,
      `<div class="weather-card">\n  <h2>Saturday Forecast</h2>\n  <p class="temp">24°C · Sunny</p>\n  <div class="days">\n    <div>Sat: 24°</div>\n    <div>Sun: 22°</div>\n    <div>Mon: 25°</div>\n  </div>\n</div>`,
      `body { font-family: sans-serif; padding: 24px; background: #f8fafc; }\n.weather-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; max-width: 320px; }\n.temp { font-size: 28px; font-weight: 700; color: #2563eb; }\n.days { display: flex; gap: 10px; margin-top: 12px; }\n.days div { flex: 1; background: #f1f5f9; padding: 8px; border-radius: 8px; text-align: center; }`,
      `console.log('Weather card ready');`
    );
    insertChallenge.run(
      dad.id,
      'Interactive Quiz Button',
      'Create a fun trivia question with 3 answer buttons that show whether the user clicked the right answer!',
      'Intermediate',
      80,
      `<div class="quiz-box">\n  <h2>Space Trivia</h2>\n  <p>Which planet is known as the Red Planet?</p>\n  <button onclick="check('Venus')">Venus</button>\n  <button onclick="check('Mars')">Mars</button>\n  <button onclick="check('Jupiter')">Jupiter</button>\n  <p id="result"></p>\n</div>`,
      `body { font-family: sans-serif; padding: 24px; }\nbutton { padding: 8px 14px; margin-right: 8px; border-radius: 6px; border: 1px solid #cbd5e1; background: white; cursor: pointer; }`,
      `window.check = (ans) => {\n  const r = document.getElementById('result');\n  r.textContent = ans === 'Mars' ? 'Correct! Mars is the Red Planet.' : 'Try again!';\n};`
    );
  }

  // Seed default guided coding projects for Leo if empty
  const projCount = (db.prepare('SELECT COUNT(*) as c FROM coding_projects').get() as { c: number }).c;
  if (projCount === 0) {
    const leo = db.prepare('SELECT id FROM users WHERE email = ?').get('leo@familyconnect.local') as { id: number } | undefined;
    const tpl = GUIDED_PROJECT_TEMPLATES[0];
    if (leo && tpl) {
      db.prepare(`
        INSERT INTO coding_projects (user_id, template_slug, title, project_type, difficulty, html_code, css_code, js_code, status)
        VALUES (?, ?, ?, 'guided', ?, ?, ?, ?, 'draft')
      `).run(leo.id, tpl.slug, `${tpl.title} — Leo`, tpl.difficulty, tpl.starterHtml, tpl.starterCss, tpl.starterJs);
    }
  }

  // Seed private conversations: 1 Family Group + 1-to-1 channels
  const convCount = (db.prepare('SELECT COUNT(*) as c FROM conversations').get() as { c: number }).c;
  if (convCount === 0) {
    const allUsers = db.prepare('SELECT id, name FROM users ORDER BY id ASC').all() as { id: number; name: string }[];
    const insertConv = db.prepare(`INSERT INTO conversations (type, title) VALUES (?, ?)`);
    const insertMember = db.prepare(`INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)`);

    const groupConvId = Number(insertConv.run('group', 'Family Lounge').lastInsertRowid);
    for (const u of allUsers) {
      insertMember.run(groupConvId, u.id);
    }

    // 1-to-1 private conversations between every pair of the 3 family members
    for (let i = 0; i < allUsers.length; i++) {
      for (let j = i + 1; j < allUsers.length; j++) {
        const pairTitle = `${allUsers[i].name} & ${allUsers[j].name}`;
        const cid = Number(insertConv.run('direct', pairTitle).lastInsertRowid);
        insertMember.run(cid, allUsers[i].id);
        insertMember.run(cid, allUsers[j].id);
      }
    }

    if (allUsers[0]) {
      db.prepare(`
        INSERT INTO messages (conversation_id, sender_id, body, read_by_json)
        VALUES (?, ?, ?, ?)
      `).run(
        groupConvId,
        allUsers[0].id,
        'Welcome to our private Family Connect hub! Ready for HTML lessons and tonight’s Grand Prix race?',
        JSON.stringify([allUsers[0].id])
      );
    }
  }

  // Seed default video room
  const meetingCount = (db.prepare('SELECT COUNT(*) as c FROM video_meetings').get() as { c: number }).c;
  if (meetingCount === 0) {
    const dad = db.prepare('SELECT id FROM users WHERE role = ?').get('admin') as { id: number };
    db.prepare(`INSERT INTO video_meetings (room_code, title, host_user_id, is_active) VALUES (?, ?, ?, 1)`).run(
      'FAMILY-HOME-ROOM',
      'Family Living Room Call',
      dad.id
    );
  }

  // Seed default privacy & security settings
  const settingsCount = (db.prepare('SELECT COUNT(*) as c FROM system_settings').get() as { c: number }).c;
  if (settingsCount === 0) {
    const insertSetting = db.prepare(`INSERT INTO system_settings (key, value) VALUES (?, ?)`);
    insertSetting.run('public_registration_enabled', 'false');
    insertSetting.run('max_family_accounts', '3');
    insertSetting.run('sandbox_strict_isolation', 'true');
    insertSetting.run('allow_image_sharing', 'true');
    insertSetting.run('require_parent_project_review', 'true');
  }

  // Seed initial activity logs
  const actCount = (db.prepare('SELECT COUNT(*) as c FROM activity_logs').get() as { c: number }).c;
  if (actCount === 0) {
    const users = db.prepare('SELECT id, name FROM users ORDER BY id ASC').all() as { id: number; name: string }[];
    const insertLog = db.prepare(`INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)`);
    if (users[1]) {
      insertLog.run(users[1].id, 'Badge Earned', 'Leo unlocked the "First HTML Tag" badge (+40 pts)');
    }
    if (users[2]) {
      insertLog.run(users[2].id, 'Badge Earned', 'Maya unlocked the "First HTML Tag" badge (+40 pts)');
    }
    if (users[0]) {
      insertLog.run(users[0].id, 'Challenge Published', 'Dad published "Weekend Weather Card" coding challenge');
    }
  }
}

export function createSession(userId: number, rememberMe: boolean): string {
  const token = crypto.randomBytes(32).toString('hex');
  const days = rememberMe ? 30 : 1;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`INSERT INTO sessions (id, user_id, remember_me, expires_at) VALUES (?, ?, ?, ?)`).run(
    token,
    userId,
    rememberMe ? 1 : 0,
    expiresAt
  );
  return token;
}

export function getUserBySession(sessionId: string | undefined) {
  if (!sessionId) return null;
  const row = db
    .prepare(
      `
    SELECT u.id, u.name, u.email, u.role, u.age, u.avatar_url, u.bio, u.points, u.streak_days, u.is_online, u.last_active_at, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
  `
    )
    .get(sessionId) as
    | {
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
        expires_at: string;
      }
    | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    return null;
  }
  return row;
}

export function awardPoints(userId: number, amount: number, reason: string, awardedBy?: number) {
  db.prepare('UPDATE users SET points = MAX(0, points + ?), updated_at = datetime(\'now\') WHERE id = ?').run(amount, userId);
  db.prepare('INSERT INTO reward_transactions (user_id, amount, reason, awarded_by) VALUES (?, ?, ?, ?)').run(
    userId,
    amount,
    reason,
    awardedBy ?? null
  );
}

export function logActivity(userId: number | null, action: string, details: string) {
  db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)').run(userId, action, details);
}

export function notifyFamily(excludeUserId: number | null, title: string, message: string, category = 'system') {
  const users = db.prepare('SELECT id FROM users').all() as { id: number }[];
  const stmt = db.prepare('INSERT INTO notifications (user_id, title, message, category) VALUES (?, ?, ?, ?)');
  for (const u of users) {
    if (excludeUserId && u.id === excludeUserId) continue;
    stmt.run(u.id, title, message, category);
  }
}

export function checkAndGrantAchievement(userId: number, slug: string) {
  const ach = db.prepare('SELECT id, title, points_bonus FROM achievements WHERE slug = ?').get(slug) as
    | { id: number; title: string; points_bonus: number }
    | undefined;
  if (!ach) return null;
  const exists = db
    .prepare('SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?')
    .get(userId, ach.id);
  if (exists) return null;
  db.prepare('INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)').run(userId, ach.id);
  awardPoints(userId, ach.points_bonus, `Unlocked achievement: ${ach.title}`);
  db.prepare('INSERT INTO notifications (user_id, title, message, category) VALUES (?, ?, ?, ?)').run(
    userId,
    `Badge Unlocked: ${ach.title}`,
    `You earned +${ach.points_bonus} bonus points!`,
    'achievement'
  );
  return ach;
}

export function ensureUserConversations(userId: number, userName: string) {
  let groupConv = db
    .prepare(`SELECT id FROM conversations WHERE type = 'group' ORDER BY id ASC LIMIT 1`)
    .get() as { id: number } | undefined;

  if (!groupConv) {
    const info = db.prepare(`INSERT INTO conversations (type, title) VALUES ('group', 'Family Lounge')`).run();
    groupConv = { id: Number(info.lastInsertRowid) };
  }

  db.prepare(`INSERT OR IGNORE INTO conversation_members (conversation_id, user_id) VALUES (?, ?)`).run(
    groupConv.id,
    userId
  );

  const others = db.prepare('SELECT id, name FROM users WHERE id != ? ORDER BY id ASC').all(userId) as {
    id: number;
    name: string;
  }[];

  const findDirect = db.prepare(`
    SELECT c.id FROM conversations c
    JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = ?
    JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = ?
    WHERE c.type = 'direct'
    LIMIT 1
  `);
  const insertConv = db.prepare(`INSERT INTO conversations (type, title) VALUES ('direct', ?)`);
  const insertMember = db.prepare(`INSERT OR IGNORE INTO conversation_members (conversation_id, user_id) VALUES (?, ?)`);

  for (const other of others) {
    const existing = findDirect.get(userId, other.id) as { id: number } | undefined;
    if (!existing) {
      const cid = Number(insertConv.run(`${userName} & ${other.name}`).lastInsertRowid);
      insertMember.run(cid, userId);
      insertMember.run(cid, other.id);
    }
  }
}

