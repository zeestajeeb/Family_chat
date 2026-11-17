export interface User {
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

export interface QuizQuestion {
  id: number;
  question_text: string;
  options: string[];
}

export interface Lesson {
  id: number;
  course_id: number;
  module_id: number;
  order_index: number;
  title: string;
  summary: string;
  explanation: string;
  example_code: string;
  expected_output: string;
  exercise_prompt: string;
  starter_html: string;
  starter_css: string;
  points: number;
  is_published: number;
  completed: number;
  practice_html: string | null;
  practice_css: string | null;
  completed_at: string | null;
  quiz_id: number | null;
  quiz_title: string | null;
  pass_score: number | null;
  quiz_questions: QuizQuestion[];
}

export interface Course {
  id: number;
  slug: string;
  title: string;
  description: string;
  level: string;
  is_published: number;
  modules: { id: number; course_id: number; title: string; order_index: number }[];
  lessons: Lesson[];
}

export interface CodingProject {
  id: number;
  user_id: number;
  template_slug: string | null;
  title: string;
  project_type: 'playground' | 'guided';
  difficulty: string;
  html_code: string;
  css_code: string;
  js_code: string;
  status: 'draft' | 'submitted' | 'approved' | 'needs_revision';
  parent_feedback: string;
  created_at: string;
  updated_at: string;
}

export interface GuidedTemplate {
  slug: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  objectives: string[];
  instructions: string;
  starterHtml: string;
  starterCss: string;
  starterJs: string;
}

export interface CodingChallenge {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  points: number;
  starter_html: string;
  starter_css: string;
  starter_js: string;
  my_status: string | null;
  my_feedback: string | null;
}

export interface Conversation {
  id: number;
  type: 'group' | 'direct';
  title: string;
  displayTitle: string;
  last_message: string | null;
  last_message_at: string | null;
  members: { id: number; name: string; avatar_url: string; is_online: number; role: string }[];
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  sender_avatar: string;
  body: string;
  attachment_url: string | null;
  reactions_json: string;
  read_by_json: string;
  created_at: string;
}

export interface TrackDefinition {
  id: 'emerald-circuit' | 'sunset-oval' | 'harbor-switchback';
  name: string;
  description: string;
  waypoints: { x: number; y: number }[];
  roadHalfWidth: number;
  bgColor: string;
  asphaltColor: string;
}

export interface RacePlayer {
  userId: number;
  name: string;
  avatarUrl: string;
  carModel: 'turbo-gt' | 'apex-rally' | 'volt-kart';
  carColor: string;
  ready: boolean;
  x: number;
  y: number;
  angle: number;
  speed: number;
  lap: number;
  nextWaypoint: number;
  position: number;
  finished: boolean;
  finishTimeMs: number | null;
}

export interface RaceRoom {
  code: string;
  hostUserId: number;
  trackId: 'emerald-circuit' | 'sunset-oval' | 'harbor-switchback';
  totalLaps: number;
  status: 'lobby' | 'countdown' | 'racing' | 'finished';
  countdownValue: number;
  elapsedMs: number;
  players: RacePlayer[];
}
