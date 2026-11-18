import type { Server as HttpServer, IncomingMessage } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'node:crypto';
import { awardPoints, checkAndGrantAchievement, db, getUserBySession, logActivity } from './db.ts';

export type TrackId = 'emerald-circuit' | 'sunset-oval' | 'harbor-switchback';
export type CarModel = 'turbo-gt' | 'apex-rally' | 'volt-kart';

export interface TrackDefinition {
  id: TrackId;
  name: string;
  description: string;
  waypoints: { x: number; y: number }[];
  roadHalfWidth: number;
  bgColor: string;
  asphaltColor: string;
}

export const TRACKS: Record<TrackId, TrackDefinition> = {
  'emerald-circuit': {
    id: 'emerald-circuit',
    name: 'Emerald Circuit',
    description: 'Balanced sweeping corners and a long straightaway for high-speed overtakes.',
    roadHalfWidth: 56,
    bgColor: '#15803d',
    asphaltColor: '#334155',
    waypoints: [
      { x: 480, y: 120 },
      { x: 760, y: 120 },
      { x: 860, y: 220 },
      { x: 830, y: 400 },
      { x: 640, y: 470 },
      { x: 460, y: 390 },
      { x: 260, y: 470 },
      { x: 130, y: 360 },
      { x: 140, y: 190 },
      { x: 280, y: 120 },
    ],
  },
  'sunset-oval': {
    id: 'sunset-oval',
    name: 'Sunset Speedway',
    description: 'Fast, wide stadium oval built for side-by-side family drafting battles.',
    roadHalfWidth: 64,
    bgColor: '#0f766e',
    asphaltColor: '#1e293b',
    waypoints: [
      { x: 480, y: 115 },
      { x: 760, y: 115 },
      { x: 870, y: 235 },
      { x: 870, y: 365 },
      { x: 760, y: 485 },
      { x: 480, y: 485 },
      { x: 200, y: 485 },
      { x: 110, y: 365 },
      { x: 110, y: 235 },
      { x: 200, y: 115 },
    ],
  },
  'harbor-switchback': {
    id: 'harbor-switchback',
    name: 'Harbor Switchback',
    description: 'Technical chicanes and tight hairpin turns that reward careful braking.',
    roadHalfWidth: 50,
    bgColor: '#0369a1',
    asphaltColor: '#334155',
    waypoints: [
      { x: 450, y: 110 },
      { x: 780, y: 110 },
      { x: 870, y: 200 },
      { x: 750, y: 300 },
      { x: 860, y: 420 },
      { x: 700, y: 500 },
      { x: 480, y: 430 },
      { x: 260, y: 500 },
      { x: 120, y: 380 },
      { x: 220, y: 260 },
      { x: 120, y: 160 },
      { x: 250, y: 110 },
    ],
  },
};

interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

interface RacePlayerState {
  userId: number;
  name: string;
  avatarUrl: string;
  carModel: CarModel;
  carColor: string;
  ready: boolean;
  x: number;
  y: number;
  angle: number;
  speed: number;
  lap: number;
  nextWaypoint: number;
  progressScore: number;
  position: number;
  finished: boolean;
  finishTimeMs: number | null;
  input: PlayerInput;
}

interface RaceRoomState {
  code: string;
  hostUserId: number;
  trackId: TrackId;
  totalLaps: number;
  status: 'lobby' | 'countdown' | 'racing' | 'finished';
  countdownValue: number;
  raceStartTime: number;
  elapsedMs: number;
  players: Map<number, RacePlayerState>;
  tickTimer?: NodeJS.Timeout;
  countdownTimer?: NodeJS.Timeout;
}

interface AuthedSocket extends WebSocket {
  userId?: number;
  userName?: string;
  userAvatar?: string;
  raceRoomCode?: string | null;
  rtcRoomCode?: string | null;
}

const userSockets = new Map<number, Set<AuthedSocket>>();
const raceRooms = new Map<string, RaceRoomState>();
const rtcRooms = new Map<string, Map<number, { userId: number; name: string; avatarUrl: string; micOn: boolean; camOn: boolean }>>();

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const k = part.slice(0, idx).trim();
      const v = decodeURIComponent(part.slice(idx + 1).trim());
      result[k] = v;
    }
  }
  return result;
}

function sendJson(ws: WebSocket, event: string, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event, payload }));
  }
}

export function broadcastToUser(userId: number, event: string, payload: unknown) {
  const set = userSockets.get(userId);
  if (!set) return;
  for (const sock of set) {
    sendJson(sock, event, payload);
  }
}

export function broadcastToAllFamily(event: string, payload: unknown) {
  for (const set of userSockets.values()) {
    for (const sock of set) {
      sendJson(sock, event, payload);
    }
  }
}

export function broadcastPresence() {
  const users = db
    .prepare('SELECT id, name, role, age, avatar_url, is_online, last_active_at, points, streak_days FROM users ORDER BY id ASC')
    .all();
  broadcastToAllFamily('presence:list', { users });
}

function serializeRoom(room: RaceRoomState) {
  return {
    code: room.code,
    hostUserId: room.hostUserId,
    trackId: room.trackId,
    totalLaps: room.totalLaps,
    status: room.status,
    countdownValue: room.countdownValue,
    elapsedMs: room.elapsedMs,
    players: Array.from(room.players.values()).map((p) => ({
      userId: p.userId,
      name: p.name,
      avatarUrl: p.avatarUrl,
      carModel: p.carModel,
      carColor: p.carColor,
      ready: p.ready,
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
      angle: Math.round(p.angle * 1000) / 1000,
      speed: Math.round(p.speed),
      lap: p.lap,
      nextWaypoint: p.nextWaypoint,
      position: p.position,
      finished: p.finished,
      finishTimeMs: p.finishTimeMs,
    })),
  };
}

function broadcastRoom(room: RaceRoomState, event = 'race:state') {
  const serialized = serializeRoom(room);
  for (const player of room.players.values()) {
    broadcastToUser(player.userId, event, serialized);
  }
}

function distPointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function isOnTrack(px: number, py: number, track: TrackDefinition): boolean {
  const pts = track.waypoints;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    if (distPointToSegment(px, py, a.x, a.y, b.x, b.y) <= track.roadHalfWidth) {
      return true;
    }
  }
  return false;
}

function positionCarsOnGrid(room: RaceRoomState) {
  const track = TRACKS[room.trackId];
  const start = track.waypoints[0];
  const next = track.waypoints[1];
  const startAngle = Math.atan2(next.y - start.y, next.x - start.x);
  const perpX = -Math.sin(startAngle);
  const perpY = Math.cos(startAngle);

  let idx = 0;
  for (const p of room.players.values()) {
    const rowOffset = -Math.floor(idx / 2) * 38;
    const laneOffset = idx % 2 === 0 ? -18 : 18;
    p.x = start.x + Math.cos(startAngle) * rowOffset + perpX * laneOffset;
    p.y = start.y + Math.sin(startAngle) * rowOffset + perpY * laneOffset;
    p.angle = startAngle;
    p.speed = 0;
    p.lap = 1;
    p.nextWaypoint = 1;
    p.progressScore = 0;
    p.position = idx + 1;
    p.finished = false;
    p.finishTimeMs = null;
    p.input = { up: false, down: false, left: false, right: false };
    idx += 1;
  }
}

function stepRacePhysics(room: RaceRoomState) {
  const track = TRACKS[room.trackId];
  const dt = 0.033;
  room.elapsedMs = Date.now() - room.raceStartTime;

  const modelStats: Record<CarModel, { maxSpeed: number; accel: number; turn: number }> = {
    'turbo-gt': { maxSpeed: 310, accel: 260, turn: 3.1 },
    'apex-rally': { maxSpeed: 295, accel: 290, turn: 3.5 },
    'volt-kart': { maxSpeed: 285, accel: 320, turn: 3.8 },
  };

  for (const p of room.players.values()) {
    if (p.finished) continue;
    const stats = modelStats[p.carModel] || modelStats['turbo-gt'];

    if (p.input.up) {
      p.speed += stats.accel * dt;
    } else if (p.input.down) {
      p.speed -= stats.accel * 1.15 * dt;
    } else {
      p.speed *= 0.96;
    }

    const onRoad = isOnTrack(p.x, p.y, track);
    const effectiveMax = onRoad ? stats.maxSpeed : stats.maxSpeed * 0.52;
    p.speed = Math.max(-90, Math.min(effectiveMax, p.speed));

    const steerFactor = Math.abs(p.speed) > 15 ? (p.speed >= 0 ? 1 : -1) : 0.3;
    if (p.input.left) p.angle -= stats.turn * steerFactor * dt;
    if (p.input.right) p.angle += stats.turn * steerFactor * dt;

    p.x = Math.max(30, Math.min(930, p.x + Math.cos(p.angle) * p.speed * dt));
    p.y = Math.max(30, Math.min(550, p.y + Math.sin(p.angle) * p.speed * dt));

    // Checkpoint / lap tracking
    const target = track.waypoints[p.nextWaypoint];
    const dist = Math.hypot(p.x - target.x, p.y - target.y);
    if (dist < 72) {
      if (p.nextWaypoint === 0) {
        if (p.lap >= room.totalLaps) {
          p.finished = true;
          p.finishTimeMs = room.elapsedMs;
          p.speed = 0;
        } else {
          p.lap += 1;
          p.nextWaypoint = 1;
        }
      } else {
        p.nextWaypoint = (p.nextWaypoint + 1) % track.waypoints.length;
      }
    }

    // Progress score for live ranking (higher = ahead)
    const wpCount = track.waypoints.length;
    const completedWps = p.finished
      ? room.totalLaps * wpCount + 1000000 - (p.finishTimeMs || 0)
      : (p.lap - 1) * wpCount + ((p.nextWaypoint === 0 ? wpCount : p.nextWaypoint) - 1);
    const nextWp = track.waypoints[p.nextWaypoint];
    const distToNext = Math.hypot(p.x - nextWp.x, p.y - nextWp.y);
    p.progressScore = p.finished ? completedWps : completedWps + Math.max(0, 1 - distToNext / 600);
  }

  // Update positions 1..3
  const sorted = Array.from(room.players.values()).sort((a, b) => b.progressScore - a.progressScore);
  sorted.forEach((p, i) => {
    p.position = i + 1;
  });

  // Check if all finished
  const allFinished = room.players.size > 0 && Array.from(room.players.values()).every((p) => p.finished);
  if (allFinished) {
    if (room.tickTimer) {
      clearInterval(room.tickTimer);
      room.tickTimer = undefined;
    }
    room.status = 'finished';
    db.prepare('UPDATE racing_rooms SET status = ? WHERE invite_code = ?').run('finished', room.code);

    const pointTable = [60, 40, 25, 20, 15, 10];
    for (const p of sorted) {
      const pts = pointTable[p.position - 1] ?? 10;
      db.prepare(`
        INSERT INTO racing_results (room_code, track_id, user_id, car_model, car_color, position, race_time_ms, points_earned)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(room.code, room.trackId, p.userId, p.carModel, p.carColor, p.position, p.finishTimeMs ?? room.elapsedMs, pts);
      awardPoints(p.userId, pts, `Finished #${p.position} in Family Grand Prix (${TRACKS[room.trackId].name})`);
      checkAndGrantAchievement(p.userId, 'clean-lap');
      if (p.position === 1) {
        checkAndGrantAchievement(p.userId, 'grand-prix-winner');
      }
    }
    logActivity(room.hostUserId, 'Race Completed', `Grand Prix ${room.code} finished on ${TRACKS[room.trackId].name}`);
  }

  broadcastRoom(room, 'race:state');
}

export function attachWebSocketServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: AuthedSocket, req: IncomingMessage) => {
    const cookies = parseCookies(req.headers.cookie);
    const user = getUserBySession(cookies.fc_session);
    if (!user) {
      sendJson(ws, 'error', { message: 'Authentication required' });
      ws.close(4001, 'Unauthorized');
      return;
    }

    ws.userId = user.id;
    ws.userName = user.name;
    ws.userAvatar = user.avatar_url;

    if (!userSockets.has(user.id)) {
      userSockets.set(user.id, new Set());
    }
    userSockets.get(user.id)!.add(ws);

    db.prepare(`UPDATE users SET is_online = 1, last_active_at = datetime('now') WHERE id = ?`).run(user.id);
    broadcastPresence();

    sendJson(ws, 'ws:ready', {
      userId: user.id,
      activeRooms: Array.from(raceRooms.values())
        .filter((r) => r.status === 'lobby' && r.players.size < 6)
        .map((r) => ({ code: r.code, trackId: r.trackId, playerCount: r.players.size })),
    });

    ws.on('message', (raw) => {
      let msg: { event: string; payload?: Record<string, unknown> };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      const event = msg.event;
      const payload = msg.payload || {};

      // ================= FAMILY MESSENGER =================
      if (event === 'chat:send') {
        const conversationId = Number(payload.conversationId);
        const body = String(payload.body || '').trim();
        const attachmentUrl = payload.attachmentUrl ? String(payload.attachmentUrl) : null;
        if (!conversationId || (!body && !attachmentUrl)) return;

        const member = db
          .prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?')
          .get(conversationId, user.id);
        if (!member) return;

        const info = db
          .prepare(`INSERT INTO messages (conversation_id, sender_id, body, attachment_url, read_by_json) VALUES (?, ?, ?, ?, ?)`)
          .run(conversationId, user.id, body, attachmentUrl, JSON.stringify([user.id]));
        const messageId = Number(info.lastInsertRowid);

        const created = db
          .prepare(
            `SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar
             FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?`
          )
          .get(messageId);

        const members = db
          .prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ?')
          .all(conversationId) as { user_id: number }[];
        for (const m of members) {
          broadcastToUser(m.user_id, 'chat:message', created);
        }
        return;
      }

      if (event === 'chat:typing') {
        const conversationId = Number(payload.conversationId);
        const isTyping = Boolean(payload.isTyping);
        const members = db
          .prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ?')
          .all(conversationId) as { user_id: number }[];
        for (const m of members) {
          if (m.user_id !== user.id) {
            broadcastToUser(m.user_id, 'chat:typing', { conversationId, userId: user.id, userName: user.name, isTyping });
          }
        }
        return;
      }

      if (event === 'chat:read') {
        const conversationId = Number(payload.conversationId);
        const unread = db
          .prepare('SELECT id, read_by_json FROM messages WHERE conversation_id = ?')
          .all(conversationId) as { id: number; read_by_json: string }[];
        const updateStmt = db.prepare('UPDATE messages SET read_by_json = ? WHERE id = ?');
        let changed = false;
        for (const m of unread) {
          const arr: number[] = JSON.parse(m.read_by_json || '[]');
          if (!arr.includes(user.id)) {
            arr.push(user.id);
            updateStmt.run(JSON.stringify(arr), m.id);
            changed = true;
          }
        }
        if (changed) {
          const members = db
            .prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ?')
            .all(conversationId) as { user_id: number }[];
          for (const m of members) {
            broadcastToUser(m.user_id, 'chat:read_receipt', { conversationId, userId: user.id });
          }
        }
        return;
      }

      if (event === 'chat:react') {
        const messageId = Number(payload.messageId);
        const emoji = String(payload.emoji || '');
        if (!messageId || !emoji) return;
        const row = db.prepare('SELECT conversation_id, reactions_json FROM messages WHERE id = ?').get(messageId) as
          | { conversation_id: number; reactions_json: string }
          | undefined;
        if (!row) return;
        const member = db
          .prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?')
          .get(row.conversation_id, user.id);
        if (!member) return;
        const reactions: Record<string, number[]> = JSON.parse(row.reactions_json || '{}');
        const list = reactions[emoji] || [];
        if (list.includes(user.id)) {
          reactions[emoji] = list.filter((id) => id !== user.id);
        } else {
          reactions[emoji] = [...list, user.id];
        }
        db.prepare('UPDATE messages SET reactions_json = ? WHERE id = ?').run(JSON.stringify(reactions), messageId);
        const members = db
          .prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ?')
          .all(row.conversation_id) as { user_id: number }[];
        for (const m of members) {
          broadcastToUser(m.user_id, 'chat:reaction', { messageId, conversationId: row.conversation_id, reactions });
        }
        return;
      }

      // ================= WEBRTC VIDEO & VOICE SIGNALING =================
      if (event === 'rtc:join') {
        const roomCode = String(payload.roomCode || 'FAMILY-HOME-ROOM').toUpperCase();
        ws.rtcRoomCode = roomCode;
        if (!rtcRooms.has(roomCode)) {
          rtcRooms.set(roomCode, new Map());
        }
        const roomPeers = rtcRooms.get(roomCode)!;
        const peerInfo = {
          userId: user.id,
          name: user.name,
          avatarUrl: user.avatar_url,
          micOn: Boolean(payload.micOn ?? true),
          camOn: Boolean(payload.camOn ?? true),
        };
        // Notify existing peers of new joiner
        for (const existing of roomPeers.values()) {
          if (existing.userId !== user.id) {
            broadcastToUser(existing.userId, 'rtc:peer-joined', peerInfo);
          }
        }
        roomPeers.set(user.id, peerInfo);
        sendJson(ws, 'rtc:peers', { roomCode, peers: Array.from(roomPeers.values()) });
        checkAndGrantAchievement(user.id, 'team-communicator');
        return;
      }

      if (event === 'rtc:leave') {
        const roomCode = String(payload.roomCode || ws.rtcRoomCode || '');
        if (roomCode && rtcRooms.has(roomCode)) {
          const roomPeers = rtcRooms.get(roomCode)!;
          roomPeers.delete(user.id);
          for (const p of roomPeers.values()) {
            broadcastToUser(p.userId, 'rtc:peer-left', { userId: user.id });
          }
        }
        ws.rtcRoomCode = null;
        return;
      }

      if (event === 'rtc:signal') {
        const targetUserId = Number(payload.targetUserId);
        if (!targetUserId) return;
        broadcastToUser(targetUserId, 'rtc:signal', {
          fromUserId: user.id,
          fromName: user.name,
          fromAvatar: user.avatar_url,
          roomCode: payload.roomCode,
          signal: payload.signal,
        });
        return;
      }

      if (event === 'rtc:media-state') {
        const roomCode = String(payload.roomCode || ws.rtcRoomCode || '');
        const roomPeers = rtcRooms.get(roomCode);
        if (!roomPeers) return;
        const p = roomPeers.get(user.id);
        if (p) {
          p.micOn = Boolean(payload.micOn);
          p.camOn = Boolean(payload.camOn);
          for (const peer of roomPeers.values()) {
            if (peer.userId !== user.id) {
              broadcastToUser(peer.userId, 'rtc:media-state', {
                userId: user.id,
                micOn: p.micOn,
                camOn: p.camOn,
              });
            }
          }
        }
        return;
      }

      if (event === 'rtc:chat') {
        const roomCode = String(payload.roomCode || ws.rtcRoomCode || '');
        const text = String(payload.text || '').trim();
        if (!roomCode || !text) return;
        const roomPeers = rtcRooms.get(roomCode);
        if (!roomPeers) return;
        const chatMsg = {
          id: crypto.randomUUID(),
          userId: user.id,
          name: user.name,
          text,
          timestamp: new Date().toISOString(),
        };
        for (const peer of roomPeers.values()) {
          broadcastToUser(peer.userId, 'rtc:chat', chatMsg);
        }
        return;
      }

      // ================= MULTIPLAYER CAR RACING ENGINE =================
      if (event === 'race:create') {
        const trackId = (TRACKS[payload.trackId as TrackId] ? payload.trackId : 'emerald-circuit') as TrackId;
        const code = crypto.randomBytes(3).toString('hex').toUpperCase();
        const defaultColors = ['#2563eb', '#dc2626', '#059669'];
        const room: RaceRoomState = {
          code,
          hostUserId: user.id,
          trackId,
          totalLaps: Math.min(5, Math.max(1, Number(payload.laps || 3))),
          status: 'lobby',
          countdownValue: 3,
          raceStartTime: 0,
          elapsedMs: 0,
          players: new Map(),
        };
        room.players.set(user.id, {
          userId: user.id,
          name: user.name,
          avatarUrl: user.avatar_url,
          carModel: (payload.carModel as CarModel) || 'turbo-gt',
          carColor: String(payload.carColor || defaultColors[0]),
          ready: true,
          x: 0,
          y: 0,
          angle: 0,
          speed: 0,
          lap: 1,
          nextWaypoint: 1,
          progressScore: 0,
          position: 1,
          finished: false,
          finishTimeMs: null,
          input: { up: false, down: false, left: false, right: false },
        });
        positionCarsOnGrid(room);
        raceRooms.set(code, room);
        ws.raceRoomCode = code;
        db.prepare(`INSERT INTO racing_rooms (invite_code, host_user_id, track_id, laps, status) VALUES (?, ?, ?, ?, 'lobby')`).run(
          code,
          user.id,
          trackId,
          room.totalLaps
        );
        broadcastRoom(room);
        return;
      }

      if (event === 'race:join') {
        const code = String(payload.code || '').trim().toUpperCase();
        const room = raceRooms.get(code);
        if (!room) {
          sendJson(ws, 'race:error', { message: `Race room ${code} was not found.` });
          return;
        }
        if (room.players.size >= 6 && !room.players.has(user.id)) {
          sendJson(ws, 'race:error', { message: 'This private family room already has 6 players.' });
          return;
        }
        if (!room.players.has(user.id)) {
          const palette = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#0891b2'];
          const models: CarModel[] = ['turbo-gt', 'apex-rally', 'volt-kart'];
          const idx = room.players.size;
          room.players.set(user.id, {
            userId: user.id,
            name: user.name,
            avatarUrl: user.avatar_url,
            carModel: models[idx % models.length],
            carColor: palette[idx % palette.length],
            ready: true,
            x: 0,
            y: 0,
            angle: 0,
            speed: 0,
            lap: 1,
            nextWaypoint: 1,
            progressScore: 0,
            position: idx + 1,
            finished: false,
            finishTimeMs: null,
            input: { up: false, down: false, left: false, right: false },
          });
          if (room.status === 'lobby') {
            positionCarsOnGrid(room);
          }
        }
        ws.raceRoomCode = code;
        broadcastRoom(room);
        return;
      }

      if (event === 'race:customize') {
        const code = String(payload.code || ws.raceRoomCode || '');
        const room = raceRooms.get(code);
        if (!room || room.status !== 'lobby') return;
        const p = room.players.get(user.id);
        if (!p) return;
        if (payload.carModel) p.carModel = payload.carModel as CarModel;
        if (payload.carColor) p.carColor = String(payload.carColor);
        if (typeof payload.ready === 'boolean') p.ready = payload.ready;
        if (payload.trackId && room.hostUserId === user.id && TRACKS[payload.trackId as TrackId]) {
          room.trackId = payload.trackId as TrackId;
          positionCarsOnGrid(room);
        }
        if (payload.laps && room.hostUserId === user.id) {
          room.totalLaps = Math.min(5, Math.max(1, Number(payload.laps)));
        }
        broadcastRoom(room);
        return;
      }

      if (event === 'race:start' || event === 'race:rematch') {
        const code = String(payload.code || ws.raceRoomCode || '');
        const room = raceRooms.get(code);
        if (!room || room.hostUserId !== user.id) return;
        if (room.tickTimer) clearInterval(room.tickTimer);
        if (room.countdownTimer) clearInterval(room.countdownTimer);

        positionCarsOnGrid(room);
        room.status = 'countdown';
        room.countdownValue = 3;
        room.elapsedMs = 0;
        broadcastRoom(room);

        room.countdownTimer = setInterval(() => {
          room.countdownValue -= 1;
          if (room.countdownValue <= 0) {
            clearInterval(room.countdownTimer);
            room.countdownTimer = undefined;
            room.status = 'racing';
            room.raceStartTime = Date.now();
            db.prepare('UPDATE racing_rooms SET status = ? WHERE invite_code = ?').run('racing', room.code);
            broadcastRoom(room);
            room.tickTimer = setInterval(() => stepRacePhysics(room), 33);
          } else {
            broadcastRoom(room);
          }
        }, 1000);
        return;
      }

      if (event === 'race:input') {
        const code = String(payload.code || ws.raceRoomCode || '');
        const room = raceRooms.get(code);
        if (!room || room.status !== 'racing') return;
        const p = room.players.get(user.id);
        if (!p) return;
        p.input = {
          up: Boolean(payload.up),
          down: Boolean(payload.down),
          left: Boolean(payload.left),
          right: Boolean(payload.right),
        };
        return;
      }

      if (event === 'race:emoji' || event === 'race:chat') {
        const code = String(payload.code || ws.raceRoomCode || '');
        const room = raceRooms.get(code);
        if (!room) return;
        for (const player of room.players.values()) {
          broadcastToUser(player.userId, event, {
            userId: user.id,
            name: user.name,
            emoji: payload.emoji,
            text: payload.text,
            timestamp: new Date().toISOString(),
          });
        }
        return;
      }

      if (event === 'race:leave') {
        const code = String(payload.code || ws.raceRoomCode || '');
        const room = raceRooms.get(code);
        if (room) {
          room.players.delete(user.id);
          if (room.players.size === 0) {
            if (room.tickTimer) clearInterval(room.tickTimer);
            if (room.countdownTimer) clearInterval(room.countdownTimer);
            raceRooms.delete(code);
          } else {
            if (room.hostUserId === user.id) {
              room.hostUserId = Array.from(room.players.keys())[0];
            }
            broadcastRoom(room);
          }
        }
        ws.raceRoomCode = null;
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        const set = userSockets.get(ws.userId);
        if (set) {
          set.delete(ws);
          if (set.size === 0) {
            userSockets.delete(ws.userId);
            db.prepare(`UPDATE users SET is_online = 0, last_active_at = datetime('now') WHERE id = ?`).run(ws.userId);
            broadcastPresence();
          }
        }
        if (ws.rtcRoomCode && rtcRooms.has(ws.rtcRoomCode)) {
          const peers = rtcRooms.get(ws.rtcRoomCode)!;
          peers.delete(ws.userId);
          for (const p of peers.values()) {
            broadcastToUser(p.userId, 'rtc:peer-left', { userId: ws.userId });
          }
        }
        if (ws.raceRoomCode && raceRooms.has(ws.raceRoomCode)) {
          const room = raceRooms.get(ws.raceRoomCode)!;
          room.players.delete(ws.userId);
          if (room.players.size === 0) {
            if (room.tickTimer) clearInterval(room.tickTimer);
            if (room.countdownTimer) clearInterval(room.countdownTimer);
            raceRooms.delete(ws.raceRoomCode);
          } else {
            broadcastRoom(room);
          }
        }
      }
    });
  });

  return wss;
}
