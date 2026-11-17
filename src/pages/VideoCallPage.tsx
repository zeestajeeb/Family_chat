import { useEffect, useState } from 'react';
import { Plus, Video } from 'lucide-react';
import type { User } from '../types';
import { WebRTCBar } from '../components/WebRTCBar';

interface VideoMeeting {
  id: number;
  room_code: string;
  title: string;
  host_name: string;
  started_at: string;
}

export function VideoCallPage({ currentUser }: { currentUser: User }) {
  const [meetings, setMeetings] = useState<VideoMeeting[]>([]);
  const [livekitConfigured, setLivekitConfigured] = useState(false);
  const [activeRoomCode, setActiveRoomCode] = useState<string>('FAMILY-HOME-ROOM');
  const [newTitle, setNewTitle] = useState('');

  const loadMeetings = async () => {
    const res = await fetch('/api/meetings');
    if (res.ok) {
      const data = await res.json();
      setMeetings(data.meetings || []);
      setLivekitConfigured(Boolean(data.livekitConfigured));
      if (data.meetings?.[0] && !activeRoomCode) {
        setActiveRoomCode(data.meetings[0].room_code);
      }
    }
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  const createMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle || 'Family Study & Catch-up' }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewTitle('');
      setActiveRoomCode(data.meeting.room_code);
      await loadMeetings();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Family Video Calling</h1>
          <p className="text-sm text-slate-600">
            Private 3-person audio, video, and screen sharing restricted exclusively to family members.
          </p>
        </div>
        <span className="text-xs font-medium text-slate-500">
          Token Mode: {livekitConfigured ? 'LiveKit Server JWT' : 'Authenticated WebRTC P2P Mesh'}
        </span>
      </div>

      {/* Room Picker + New Room Form */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-xs font-semibold text-slate-700 mr-2">Private Rooms:</span>
          {meetings.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveRoomCode(m.room_code)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeRoomCode === m.room_code
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Video className="h-3.5 w-3.5" />
              <span>{m.title}</span>
            </button>
          ))}
        </div>

        <form onSubmit={createMeeting} className="lg:col-span-5 flex gap-2 rounded-xl border border-slate-200 bg-white p-4">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New room title (e.g. Homework Help)"
            className="flex-1 min-w-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Room</span>
          </button>
        </form>
      </div>

      <WebRTCBar key={activeRoomCode} currentUser={currentUser} roomCode={activeRoomCode} />
    </div>
  );
}
