import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { Flag, Play, RotateCcw, Send, Trophy, Users } from 'lucide-react';
import type { RaceRoom, TrackDefinition, User } from '../types';
import { wsClient } from '../lib/wsClient';
import { WebRTCBar } from '../components/WebRTCBar';

interface RacingSummary {
  tracks: TrackDefinition[];
  recentResults: {
    id: number;
    room_code: string;
    track_id: string;
    player_name: string;
    car_model: string;
    position: number;
    race_time_ms: number;
    points_earned: number;
  }[];
  leaderboard: {
    id: number;
    name: string;
    avatar_url: string;
    races_played: number;
    wins: number;
    best_time_ms: number | null;
  }[];
}

const CAR_MODELS = [
  { id: 'turbo-gt', name: 'Turbo GT', stats: 'Top Speed' },
  { id: 'apex-rally', name: 'Apex Rally', stats: 'Balanced' },
  { id: 'volt-kart', name: 'Volt Kart', stats: 'Quick Turn' },
] as const;

const CAR_COLORS = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#0f172a'];
const REACTIONS = ['🏁', '🔥', '💨', '🎉', '👏'];

export function RacingPage({ currentUser, onPointsUpdated }: { currentUser: User; onPointsUpdated?: () => void }) {
  const [summary, setSummary] = useState<RacingSummary | null>(null);
  const [room, setRoom] = useState<RaceRoom | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<'emerald-circuit' | 'sunset-oval' | 'harbor-switchback'>('emerald-circuit');
  const [selectedCar, setSelectedCar] = useState<'turbo-gt' | 'apex-rally' | 'volt-kart'>('turbo-gt');
  const [selectedColor, setSelectedColor] = useState('#2563eb');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [raceChat, setRaceChat] = useState<{ id: string; name: string; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [floatingEmoji, setFloatingEmoji] = useState<{ id: string; name: string; emoji: string } | null>(null);

  const phaserMountRef = useRef<HTMLDivElement | null>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const latestRoomRef = useRef<RaceRoom | null>(null);
  const tracksRef = useRef<TrackDefinition[]>([]);
  const touchInputRef = useRef({ up: false, down: false, left: false, right: false });
  const keyInputRef = useRef({ up: false, down: false, left: false, right: false });

  const loadSummary = async () => {
    const res = await fetch('/api/racing/summary');
    if (res.ok) {
      const data = (await res.json()) as RacingSummary;
      setSummary(data);
      tracksRef.current = data.tracks;
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    const unsubState = wsClient.on('race:state', (nextRoom: RaceRoom) => {
      const prevStatus = latestRoomRef.current?.status;
      latestRoomRef.current = nextRoom;
      setRoom(nextRoom);
      setErrorMsg(null);
      if (prevStatus === 'racing' && nextRoom.status === 'finished') {
        loadSummary();
        onPointsUpdated?.();
      }
    });

    const unsubErr = wsClient.on('race:error', (err: { message: string }) => {
      setErrorMsg(err.message);
    });

    const unsubEmoji = wsClient.on('race:emoji', (data: { name: string; emoji: string }) => {
      const item = { id: String(Date.now()), name: data.name, emoji: data.emoji };
      setFloatingEmoji(item);
      window.setTimeout(() => setFloatingEmoji((cur) => (cur?.id === item.id ? null : cur)), 2200);
    });

    const unsubChat = wsClient.on('race:chat', (data: { name: string; text: string; timestamp: string }) => {
      setRaceChat((prev) => [...prev.slice(-24), { id: `${data.timestamp}-${Math.random()}`, name: data.name, text: data.text }]);
    });

    return () => {
      unsubState();
      unsubErr();
      unsubEmoji();
      unsubChat();
    };
  }, []);

  // Keyboard & Touch input sender
  useEffect(() => {
    if (!room) return;
    const emitInput = () => {
      if (latestRoomRef.current?.status !== 'racing') return;
      wsClient.send('race:input', {
        code: latestRoomRef.current.code,
        up: keyInputRef.current.up || touchInputRef.current.up,
        down: keyInputRef.current.down || touchInputRef.current.down,
        left: keyInputRef.current.left || touchInputRef.current.left,
        right: keyInputRef.current.right || touchInputRef.current.right,
      });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && latestRoomRef.current?.status === 'racing') {
        e.preventDefault();
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keyInputRef.current.up = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keyInputRef.current.down = true;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keyInputRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keyInputRef.current.right = true;
      emitInput();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keyInputRef.current.up = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keyInputRef.current.down = false;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keyInputRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keyInputRef.current.right = false;
      emitInput();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    const interval = window.setInterval(emitInput, 60);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      clearInterval(interval);
    };
  }, [room?.code]);

  // Mount Phaser 3 Scene when in a room
  useEffect(() => {
    if (!room || !phaserMountRef.current) return;

    if (phaserGameRef.current) {
      phaserGameRef.current.destroy(true);
      phaserGameRef.current = null;
    }

    class FamilyRaceScene extends Phaser.Scene {
      private trackGraphics!: Phaser.GameObjects.Graphics;
      private carSprites = new Map<number, Phaser.GameObjects.Container>();
      private renderedTrackId: string | null = null;

      constructor() {
        super('FamilyRaceScene');
      }

      create() {
        this.trackGraphics = this.add.graphics();
      }

      private drawTrack(track: TrackDefinition) {
        const g = this.trackGraphics;
        g.clear();
        g.fillStyle(Phaser.Display.Color.HexStringToColor(track.bgColor).color, 1);
        g.fillRect(0, 0, 960, 580);

        const pts = track.waypoints;
        // White/Red outer curb border
        g.lineStyle(track.roadHalfWidth * 2 + 12, 0xe2e8f0, 1);
        g.beginPath();
        g.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
        g.closePath();
        g.strokePath();

        // Asphalt surface
        g.lineStyle(track.roadHalfWidth * 2, Phaser.Display.Color.HexStringToColor(track.asphaltColor).color, 1);
        g.beginPath();
        g.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
        g.closePath();
        g.strokePath();

        // Dashed center lane guide
        g.lineStyle(2, 0x94a3b8, 0.5);
        g.beginPath();
        g.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
        g.closePath();
        g.strokePath();

        // Start/Finish checkered marker
        const start = pts[0];
        const next = pts[1];
        const ang = Math.atan2(next.y - start.y, next.x - start.x);
        g.save();
        g.translateCanvas(start.x, start.y);
        g.rotateCanvas(ang);
        for (let r = -3; r < 3; r++) {
          for (let c = 0; c < 2; c++) {
            g.fillStyle((r + c) % 2 === 0 ? 0xffffff : 0x0f172a, 1);
            g.fillRect(c * 10 - 10, r * 14, 10, 14);
          }
        }
        g.restore();
      }

      private createCarContainer(player: RaceRoom['players'][number]) {
        const container = this.add.container(player.x, player.y);
        const body = this.add.graphics();
        const hex = Phaser.Display.Color.HexStringToColor(player.carColor).color;

        // Shadow
        body.fillStyle(0x000000, 0.35);
        body.fillRoundedRect(-18, -10, 38, 24, 6);
        // Car chassis
        body.fillStyle(hex, 1);
        body.fillRoundedRect(-19, -12, 38, 24, 6);
        // Windshield
        body.fillStyle(0x0f172a, 0.85);
        body.fillRoundedRect(-4, -9, 12, 18, 3);
        // Headlights
        body.fillStyle(0xfef08a, 1);
        body.fillRect(16, -9, 3, 5);
        body.fillRect(16, 4, 3, 5);

        const label = this.add.text(0, -24, player.name.split(' ')[0], {
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#ffffff',
          backgroundColor: '#0f172acc',
          padding: { x: 5, y: 2 },
        });
        label.setOrigin(0.5, 0.5);

        container.add([body, label]);
        container.setData('color', player.carColor);
        return container;
      }

      update() {
        const r = latestRoomRef.current;
        if (!r) return;
        const track = tracksRef.current.find((t) => t.id === r.trackId);
        if (track && this.renderedTrackId !== track.id) {
          this.drawTrack(track);
          this.renderedTrackId = track.id;
        }

        const activeIds = new Set(r.players.map((p) => p.userId));
        for (const [uid, sprite] of this.carSprites.entries()) {
          if (!activeIds.has(uid)) {
            sprite.destroy();
            this.carSprites.delete(uid);
          }
        }

        for (const p of r.players) {
          let sprite = this.carSprites.get(p.userId);
          if (!sprite || sprite.getData('color') !== p.carColor) {
            if (sprite) sprite.destroy();
            sprite = this.createCarContainer(p);
            this.carSprites.set(p.userId, sprite);
          }
          // Smooth interpolation toward authoritative server coordinates
          sprite.x = Phaser.Math.Linear(sprite.x, p.x, 0.45);
          sprite.y = Phaser.Math.Linear(sprite.y, p.y, 0.45);
          const bodyObj = sprite.list[0] as Phaser.GameObjects.Graphics;
          bodyObj.setRotation(p.angle);
        }
      }
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: phaserMountRef.current,
      width: 960,
      height: 580,
      backgroundColor: '#0f172a',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [FamilyRaceScene],
    });
    phaserGameRef.current = game;

    return () => {
      game.destroy(true);
      phaserGameRef.current = null;
    };
  }, [room?.code]);

  const setTouchControl = (key: 'up' | 'down' | 'left' | 'right', active: boolean) => {
    touchInputRef.current[key] = active;
    if (latestRoomRef.current?.status === 'racing') {
      wsClient.send('race:input', {
        code: latestRoomRef.current.code,
        ...touchInputRef.current,
      });
    }
  };

  const createRoom = () => {
    wsClient.send('race:create', {
      trackId: selectedTrack,
      carModel: selectedCar,
      carColor: selectedColor,
      laps: 3,
    });
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    wsClient.send('race:join', { code: joinCode.trim().toUpperCase() });
  };

  const leaveRoom = () => {
    if (room) {
      wsClient.send('race:leave', { code: room.code });
    }
    setRoom(null);
    latestRoomRef.current = null;
  };

  const sendRaceChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !chatInput.trim()) return;
    wsClient.send('race:chat', { code: room.code, text: chatInput.trim() });
    setChatInput('');
  };

  const formatTime = (ms: number | null) => {
    if (!ms) return '00:00.0';
    const totalSec = ms / 1000;
    const min = Math.floor(totalSec / 60);
    const sec = (totalSec % 60).toFixed(1).padStart(4, '0');
    return `${String(min).padStart(2, '0')}:${sec}`;
  };

  const myPlayer = room?.players.find((p) => p.userId === currentUser.id);
  const isHost = room?.hostUserId === currentUser.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Family Grand Prix Arena</h1>
          <p className="text-sm text-slate-600">
            Real-time 3-player Phaser 2D racing with server-authoritative lap and position tracking.
          </p>
        </div>
        {room && (
          <div className="flex items-center gap-3">
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-semibold text-slate-900">
              Invite Code: {room.code}
            </span>
            <button
              type="button"
              onClick={leaveRoom}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 whitespace-nowrap shrink-0"
            >
              Leave Room
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700">
          {errorMsg}
        </div>
      )}

      {!room ? (
        <div className="space-y-6">
          {/* Lobby Create / Join */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Host Private Family Race</h2>
                <span className="text-xs text-slate-500">Max 3 Players</span>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <img
                  src="/src/assets/images/track_banner_racing_1794844439889.jpg"
                  alt="Family Racing Circuit"
                  referrerPolicy="no-referrer"
                  className="h-44 w-full object-cover"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {summary?.tracks.map((tr) => (
                  <button
                    key={tr.id}
                    type="button"
                    onClick={() => setSelectedTrack(tr.id)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      selectedTrack === tr.id ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-900">{tr.name}</p>
                    <p className="mt-1 text-[11px] text-slate-600 line-clamp-2">{tr.description}</p>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Car</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CAR_MODELS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedCar(m.id)}
                        className={`rounded-lg border p-2 text-center ${
                          selectedCar === m.id ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold">{m.name}</div>
                        <div className="text-[10px] text-slate-500">{m.stats}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Paint Color</label>
                  <div className="flex items-center gap-2 pt-1">
                    {CAR_COLORS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setSelectedColor(hex)}
                        aria-label={`Color ${hex}`}
                        className={`h-8 w-8 rounded-full border-2 transition-transform ${
                          selectedColor === hex ? 'border-slate-900 scale-110' : 'border-white'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={createRoom}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Flag className="h-4 w-4" />
                <span>Create Private Race Room</span>
              </button>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <form onSubmit={joinRoom} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                <h2 className="text-lg font-bold text-slate-900">Join with Invite Code</h2>
                <p className="text-xs text-slate-600">
                  Enter the 6-character room code shared by Dad, Leo, or Maya.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. A4F91C"
                    maxLength={8}
                    className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2 font-mono text-sm uppercase focus:border-blue-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    Join Race
                  </button>
                </div>
              </form>

              {/* Family Racing Leaderboard */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="h-4 w-4 text-amber-600" />
                  <h2 className="text-base font-bold text-slate-900">Family Racing Leaderboard</h2>
                </div>
                <div className="space-y-3">
                  {summary?.leaderboard.map((row) => (
                    <div key={row.id} className="flex items-center justify-between border-b border-slate-100 pb-2.5 last:border-b-0 last:pb-0">
                      <div className="flex items-center gap-2.5">
                        <img src={row.avatar_url} alt={row.name} className="h-8 w-8 rounded-full object-cover" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">{row.name}</p>
                          <p className="text-[11px] text-slate-500 tabular-nums">{row.races_played} races</p>
                        </div>
                      </div>
                      <div className="text-right tabular-nums">
                        <p className="text-xs font-bold text-slate-900">{row.wins || 0} wins</p>
                        <p className="text-[11px] text-slate-500">
                          {row.best_time_ms ? `Best ${formatTime(row.best_time_ms)}` : 'No finish yet'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Embedded Live Voice/Video Call inside Racing Arena */}
          <WebRTCBar currentUser={currentUser} roomCode={`RACE-${room.code}`} compact />

          {/* Lobby / Garage Customization Bar */}
          {room.status === 'lobby' && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Starting Grid Lobby ({room.players.length}/3 Players)
                  </h2>
                  <p className="text-xs text-slate-600">
                    Share invite code <strong className="font-mono">{room.code}</strong> with family members. Pick your car and color!
                  </p>
                </div>
                {isHost && (
                  <button
                    type="button"
                    onClick={() => wsClient.send('race:start', { code: room.code })}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 whitespace-nowrap shrink-0"
                  >
                    <Play className="h-4 w-4" />
                    <span>Start Race Countdown</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {room.players.map((p) => (
                  <div key={p.userId} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                    <img src={p.avatarUrl} alt={p.name} className="h-10 w-10 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900">{p.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {p.carModel} · <span className="inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: p.carColor }} />
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Your Car:</span>
                  {CAR_MODELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => wsClient.send('race:customize', { code: room.code, carModel: m.id })}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                        myPlayer?.carModel === m.id ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-700 mr-1">Paint:</span>
                  {CAR_COLORS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => wsClient.send('race:customize', { code: room.code, carColor: hex })}
                      className={`h-6 w-6 rounded-full border-2 ${
                        myPlayer?.carColor === hex ? 'border-slate-900' : 'border-white'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active Race Canvas + HUD */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-9 space-y-3">
              {/* Top Race Telemetry HUD */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-900 tabular-nums">
                  <span>Position: {myPlayer?.position ?? 1} / {room.players.length}</span>
                  <span>Lap: {myPlayer?.lap ?? 1} / {room.totalLaps}</span>
                  <span>Timer: {formatTime(room.elapsedMs)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => wsClient.send('race:emoji', { code: room.code, emoji })}
                      className="rounded-md border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phaser Viewport */}
              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                <div ref={phaserMountRef} className="w-full aspect-[960/580]" />

                {room.status === 'countdown' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60">
                    <div className="text-center text-white">
                      <p className="text-sm font-semibold uppercase tracking-wider text-blue-300">Get Ready</p>
                      <p className="mt-2 text-7xl font-extrabold tabular-nums">{room.countdownValue}</p>
                    </div>
                  </div>
                )}

                {floatingEmoji && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/85 px-4 py-1.5 text-sm font-semibold text-white">
                    {floatingEmoji.name}: {floatingEmoji.emoji}
                  </div>
                )}

                {room.status === 'finished' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/75 p-4">
                    <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 text-white space-y-4">
                      <div className="flex items-center gap-2 text-amber-400">
                        <Trophy className="h-5 w-5" />
                        <h3 className="text-lg font-bold">Race Results</h3>
                      </div>
                      <div className="space-y-2">
                        {[...room.players]
                          .sort((a, b) => a.position - b.position)
                          .map((p) => (
                            <div
                              key={p.userId}
                              className="flex items-center justify-between rounded-lg bg-slate-800 px-3.5 py-2.5 text-sm"
                            >
                              <span className="font-semibold">
                                #{p.position} {p.name}
                              </span>
                              <span className="font-mono text-xs text-slate-300 tabular-nums">
                                {formatTime(p.finishTimeMs ?? room.elapsedMs)}
                              </span>
                            </div>
                          ))}
                      </div>
                      {isHost ? (
                        <button
                          type="button"
                          onClick={() => wsClient.send('race:rematch', { code: room.code })}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          <RotateCcw className="h-4 w-4" />
                          <span>Rematch</span>
                        </button>
                      ) : (
                        <p className="text-center text-xs text-slate-400">Waiting for host to start rematch...</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop Help + Mobile Touch Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-600">
                  Controls: Use <strong>Arrow Keys</strong> or <strong>WASD</strong> on desktop, or touch buttons on mobile.
                </p>
                <div className="flex items-center gap-2 select-none">
                  <button
                    type="button"
                    onPointerDown={() => setTouchControl('left', true)}
                    onPointerUp={() => setTouchControl('left', false)}
                    onPointerLeave={() => setTouchControl('left', false)}
                    className="h-11 w-12 rounded-lg border border-slate-300 bg-slate-50 text-sm font-bold active:bg-blue-100"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => setTouchControl('right', true)}
                    onPointerUp={() => setTouchControl('right', false)}
                    onPointerLeave={() => setTouchControl('right', false)}
                    className="h-11 w-12 rounded-lg border border-slate-300 bg-slate-50 text-sm font-bold active:bg-blue-100"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => setTouchControl('down', true)}
                    onPointerUp={() => setTouchControl('down', false)}
                    onPointerLeave={() => setTouchControl('down', false)}
                    className="h-11 px-3 rounded-lg border border-slate-300 bg-slate-50 text-xs font-bold active:bg-red-100"
                  >
                    Brake
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => setTouchControl('up', true)}
                    onPointerUp={() => setTouchControl('up', false)}
                    onPointerLeave={() => setTouchControl('up', false)}
                    className="h-11 px-4 rounded-lg bg-blue-600 text-xs font-bold text-white active:bg-blue-700"
                  >
                    Gas
                  </button>
                </div>
              </div>
            </div>

            {/* Right Sidebar: Live Standings & Race Chat */}
            <div className="lg:col-span-3 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="border-b border-slate-200 p-4 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                  <span>Live Standings</span>
                </div>
                {[...room.players]
                  .sort((a, b) => a.position - b.position)
                  .map((p) => (
                    <div key={p.userId} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 truncate">
                        #{p.position} {p.name}
                      </span>
                      <span className="text-slate-500 tabular-nums">Lap {p.lap}</span>
                    </div>
                  ))}
              </div>

              <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-72 min-h-[180px] bg-slate-50/50">
                {raceChat.length === 0 ? (
                  <p className="text-xs text-slate-400">Cheer on your family in race chat!</p>
                ) : (
                  raceChat.map((m) => (
                    <div key={m.id} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs">
                      <span className="font-bold text-slate-900">{m.name}: </span>
                      <span className="text-slate-700">{m.text}</span>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={sendRaceChat} className="flex gap-1.5 border-t border-slate-200 p-2.5 bg-white">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Race chat..."
                  className="flex-1 min-w-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-white hover:bg-slate-800"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
