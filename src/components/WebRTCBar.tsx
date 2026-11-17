import { useEffect, useRef, useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Send,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { User } from '../types';
import { wsClient } from '../lib/wsClient';

interface PeerInfo {
  userId: number;
  name: string;
  avatarUrl: string;
  micOn: boolean;
  camOn: boolean;
}

interface RtcChatItem {
  id: string;
  userId: number;
  name: string;
  text: string;
  timestamp: string;
}

interface WebRTCBarProps {
  currentUser: User;
  roomCode: string;
  compact?: boolean;
  onLeave?: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
};

export function WebRTCBar({ currentUser, roomCode, compact = false, onLeave }: WebRTCBarProps) {
  const [joined, setJoined] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(!compact);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [connectionMode, setConnectionMode] = useState<string>('Ready');
  const [durationSec, setDurationSec] = useState(0);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<number, MediaStream>>({});
  const [chatMessages, setChatMessages] = useState<RtcChatItem[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionsRef = useRef<Map<number, RTCPeerConnection>>(new Map());
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!joined) return;
    const timer = window.setInterval(() => setDurationSec((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [joined]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const cleanupMediaAndPeers = () => {
    for (const pc of peerConnectionsRef.current.values()) {
      pc.close();
    }
    peerConnectionsRef.current.clear();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setRemoteStreams({});
    setPeers([]);
    setJoined(false);
    setDurationSec(0);
    setScreenSharing(false);
    setConnectionMode('Disconnected');
  };

  const createPeerConnection = (targetUserId: number, initiator: boolean) => {
    const existing = peerConnectionsRef.current.get(targetUserId);
    if (existing) return existing;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(targetUserId, pc);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.onicecandidate = (evt) => {
      if (evt.candidate) {
        wsClient.send('rtc:signal', {
          roomCode,
          targetUserId,
          signal: { type: 'candidate', candidate: evt.candidate },
        });
      }
    };

    pc.ontrack = (evt) => {
      const [stream] = evt.streams;
      if (stream) {
        setRemoteStreams((prev) => ({ ...prev, [targetUserId]: stream }));
      }
    };

    if (initiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer).then(() => offer))
        .then((offer) => {
          wsClient.send('rtc:signal', {
            roomCode,
            targetUserId,
            signal: { type: 'offer', sdp: offer },
          });
        })
        .catch(() => {});
    }

    return pc;
  };

  useEffect(() => {
    if (!joined) return;

    const unsubPeers = wsClient.on('rtc:peers', (data: { roomCode: string; peers: PeerInfo[] }) => {
      if (data.roomCode !== roomCode) return;
      setPeers(data.peers.filter((p) => p.userId !== currentUser.id));
      for (const p of data.peers) {
        if (p.userId !== currentUser.id) {
          createPeerConnection(p.userId, true);
        }
      }
    });

    const unsubJoined = wsClient.on('rtc:peer-joined', (peer: PeerInfo) => {
      setPeers((prev) => [...prev.filter((p) => p.userId !== peer.userId), peer]);
    });

    const unsubLeft = wsClient.on('rtc:peer-left', (data: { userId: number }) => {
      const pc = peerConnectionsRef.current.get(data.userId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(data.userId);
      }
      setPeers((prev) => prev.filter((p) => p.userId !== data.userId));
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
    });

    const unsubState = wsClient.on('rtc:media-state', (data: { userId: number; micOn: boolean; camOn: boolean }) => {
      setPeers((prev) =>
        prev.map((p) => (p.userId === data.userId ? { ...p, micOn: data.micOn, camOn: data.camOn } : p))
      );
    });

    const unsubSignal = wsClient.on(
      'rtc:signal',
      async (data: { fromUserId: number; signal: { type: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit } }) => {
        const pc = createPeerConnection(data.fromUserId, false);
        try {
          if (data.signal.type === 'offer' && data.signal.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.signal.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            wsClient.send('rtc:signal', {
              roomCode,
              targetUserId: data.fromUserId,
              signal: { type: 'answer', sdp: answer },
            });
          } else if (data.signal.type === 'answer' && data.signal.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.signal.sdp));
          } else if (data.signal.type === 'candidate' && data.signal.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
          }
        } catch {
          // Ignore transient ICE errors
        }
      }
    );

    const unsubChat = wsClient.on('rtc:chat', (msg: RtcChatItem) => {
      setChatMessages((prev) => [...prev.slice(-40), msg]);
    });

    return () => {
      unsubPeers();
      unsubJoined();
      unsubLeft();
      unsubState();
      unsubSignal();
      unsubChat();
    };
  }, [joined, roomCode, currentUser.id]);

  useEffect(() => {
    return () => {
      if (joined) {
        wsClient.send('rtc:leave', { roomCode });
        cleanupMediaAndPeers();
      }
    };
  }, []);

  const joinCall = async () => {
    setMediaNotice(null);
    setConnectionMode('Connecting...');
    try {
      const tokenRes = await fetch(`/api/meetings/${encodeURIComponent(roomCode)}/token`, { method: 'POST' });
      const tokenData = await tokenRes.json();
      setConnectionMode(tokenData.mode === 'livekit' ? 'LiveKit SFU Ready' : 'Encrypted WebRTC P2P');
    } catch {
      setConnectionMode('Encrypted WebRTC P2P');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: !compact,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setMicOn(stream.getAudioTracks().some((t) => t.enabled));
      setCamOn(stream.getVideoTracks().some((t) => t.enabled));
    } catch {
      setMediaNotice('Camera or microphone permission unavailable; joined in listen & chat mode.');
      setMicOn(false);
      setCamOn(false);
    }

    setJoined(true);
    wsClient.send('rtc:join', { roomCode, micOn: true, camOn: !compact });
  };

  const leaveCall = () => {
    wsClient.send('rtc:leave', { roomCode });
    cleanupMediaAndPeers();
    onLeave?.();
  };

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = next;
    });
    wsClient.send('rtc:media-state', { roomCode, micOn: next, camOn });
  };

  const toggleCam = async () => {
    const next = !camOn;
    setCamOn(next);
    if (localStreamRef.current) {
      const vTracks = localStreamRef.current.getVideoTracks();
      if (vTracks.length > 0) {
        vTracks.forEach((t) => (t.enabled = next));
      } else if (next) {
        try {
          const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const track = camStream.getVideoTracks()[0];
          if (track) {
            localStreamRef.current.addTrack(track);
            for (const pc of peerConnectionsRef.current.values()) {
              pc.addTrack(track, localStreamRef.current);
            }
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
            }
          }
        } catch {
          setCamOn(false);
          setMediaNotice('Camera could not be activated.');
          return;
        }
      }
    }
    wsClient.send('rtc:media-state', { roomCode, micOn, camOn: next });
  };

  const toggleScreenShare = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setMediaNotice('Screen sharing is not supported in this browser.');
      return;
    }
    if (screenSharing) {
      setScreenSharing(false);
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const camTrack = camStream.getVideoTracks()[0];
        replaceVideoTrack(camTrack);
      } catch {
        // Ignore
      }
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) return;
      setScreenSharing(true);
      replaceVideoTrack(screenTrack);
      screenTrack.onended = () => setScreenSharing(false);
    } catch {
      setMediaNotice('Screen sharing was cancelled.');
    }
  };

  const replaceVideoTrack = (newTrack: MediaStreamTrack) => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.stop();
        localStreamRef.current?.removeTrack(t);
      });
      localStreamRef.current.addTrack(newTrack);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
    for (const pc of peerConnectionsRef.current.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(newTrack);
      } else if (localStreamRef.current) {
        pc.addTrack(newTrack, localStreamRef.current);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setFullscreen(false);
    }
  };

  const sendRtcChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    wsClient.send('rtc:chat', { roomCode, text });
    setChatInput('');
  };

  if (compact) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-900">Race Family Voice &amp; Video</span>
            <span className="text-xs text-slate-500 tabular-nums">
              {joined ? `${peers.length + 1}/3 Connected · ${formatDuration(durationSec)}` : 'Optional live comms'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!joined ? (
              <button
                type="button"
                onClick={joinCall}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
              >
                Join Voice / Cam
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                    micOn ? 'border-slate-200 bg-white text-slate-700' : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                  <span>{micOn ? 'Mic On' : 'Muted'}</span>
                </button>
                <button
                  type="button"
                  onClick={toggleCam}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                    camOn ? 'border-slate-200 bg-white text-slate-700' : 'border-slate-200 bg-slate-100 text-slate-600'
                  }`}
                >
                  {camOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
                  <span>{camOn ? 'Cam On' : 'Cam Off'}</span>
                </button>
                <button
                  type="button"
                  onClick={leaveCall}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 whitespace-nowrap shrink-0"
                >
                  <PhoneOff className="h-3.5 w-3.5" />
                  <span>Leave</span>
                </button>
              </>
            )}
          </div>
        </div>

        {joined && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`h-12 w-16 rounded object-cover bg-slate-900 ${camOn ? 'block' : 'hidden'}`}
              />
              {!camOn && (
                <img src={currentUser.avatar_url} alt={currentUser.name} className="h-10 w-10 rounded-full object-cover" />
              )}
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-slate-900">{currentUser.name} (You)</div>
                <div className="text-xs text-slate-500">{micOn ? 'Mic active' : 'Mic muted'}</div>
              </div>
            </div>
            {peers.map((peer) => (
              <RemoteMiniTile key={peer.userId} peer={peer} stream={remoteStreams[peer.userId]} speakerOn={speakerOn} />
            ))}
          </div>
        )}
        {mediaNotice && <p className="mt-2 text-xs text-amber-700">{mediaNotice}</p>}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">Room {roomCode}</h2>
            <span className="text-xs text-slate-500 tabular-nums">
              {joined ? `Connected · ${connectionMode} · ${formatDuration(durationSec)}` : 'Private 3-Seat Family Room'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!joined ? (
            <button
              type="button"
              onClick={joinCall}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              Join Video Call
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleMic}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold whitespace-nowrap shrink-0 ${
                  micOn ? 'border-slate-200 bg-white text-slate-700' : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                <span>{micOn ? 'Mic On' : 'Mic Off'}</span>
              </button>
              <button
                type="button"
                onClick={toggleCam}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold whitespace-nowrap shrink-0 ${
                  camOn ? 'border-slate-200 bg-white text-slate-700' : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                <span>{camOn ? 'Cam On' : 'Cam Off'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSpeakerOn(!speakerOn)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0"
              >
                {speakerOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                <span>{speakerOn ? 'Speaker On' : 'Speaker Muted'}</span>
              </button>
              <button
                type="button"
                onClick={toggleScreenShare}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold whitespace-nowrap shrink-0 ${
                  screenSharing ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <MonitorUp className="h-4 w-4" />
                <span>{screenSharing ? 'Stop Share' : 'Share Screen'}</span>
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0"
              >
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                <span>{fullscreen ? 'Exit' : 'Full Screen'}</span>
              </button>
              <button
                type="button"
                onClick={leaveCall}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700 whitespace-nowrap shrink-0"
              >
                <PhoneOff className="h-4 w-4" />
                <span>Leave Call</span>
              </button>
            </>
          )}
        </div>
      </div>

      {mediaNotice && (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-xs text-amber-800">{mediaNotice}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 p-5">
          {!joined ? (
            <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center p-6">
              <Video className="h-10 w-10 text-slate-400 mb-3" />
              <h3 className="text-base font-semibold text-slate-900">Ready to connect with family</h3>
              <p className="mt-1 max-w-md text-sm text-slate-600">
                Only the three authorized family accounts can join this encrypted room. Click Join Video Call to turn on camera and audio.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`h-full w-full object-cover ${camOn || screenSharing ? 'block' : 'hidden'}`}
                />
                {!camOn && !screenSharing && (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.name}
                    className="h-20 w-20 rounded-full object-cover border-2 border-slate-700"
                  />
                )}
                <div className="absolute bottom-2.5 left-2.5 rounded-md bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-white">
                  {currentUser.name} (You) · {micOn ? 'Mic On' : 'Muted'}
                </div>
              </div>

              {peers.map((peer) => (
                <RemoteVideoTile key={peer.userId} peer={peer} stream={remoteStreams[peer.userId]} speakerOn={speakerOn} />
              ))}

              {peers.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 aspect-video p-4 text-center">
                  <p className="text-sm font-medium text-slate-700">Waiting for other family members</p>
                  <p className="mt-1 text-xs text-slate-500">Share room code {roomCode} or ask them to click Join in Video Calls.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-50/70">
          <div className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-700">
            In-Call Family Chat
          </div>
          <div className="flex-1 space-y-2.5 overflow-y-auto p-4 max-h-72 min-h-[200px]">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-slate-500">No meeting chat messages yet.</p>
            ) : (
              chatMessages.map((m) => (
                <div key={m.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-900">{m.name}</span>
                    <span className="tabular-nums">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{m.text}</p>
                </div>
              ))
            )}
          </div>
          <form onSubmit={sendRtcChat} className="flex gap-2 border-t border-slate-200 p-3 bg-white">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={!joined}
              placeholder={joined ? 'Message participants...' : 'Join call to chat'}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
            />
            <button
              type="submit"
              disabled={!joined}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function RemoteVideoTile({
  peer,
  stream,
  speakerOn,
}: {
  peer: PeerInfo;
  stream?: MediaStream;
  speakerOn: boolean;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);
  useEffect(() => {
    if (ref.current) {
      ref.current.muted = !speakerOn;
    }
  }, [speakerOn]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center">
      {stream ? (
        <video ref={ref} autoPlay playsInline className="h-full w-full object-cover" />
      ) : (
        <img src={peer.avatarUrl} alt={peer.name} className="h-20 w-20 rounded-full object-cover border-2 border-slate-700" />
      )}
      <div className="absolute bottom-2.5 left-2.5 rounded-md bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-white">
        {peer.name} · {peer.micOn ? 'Mic On' : 'Muted'}
      </div>
    </div>
  );
}

function RemoteMiniTile({
  peer,
  stream,
  speakerOn,
}: {
  peer: PeerInfo;
  stream?: MediaStream;
  speakerOn: boolean;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);
  useEffect(() => {
    if (ref.current) {
      ref.current.muted = !speakerOn;
    }
  }, [speakerOn]);

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
      {stream && peer.camOn ? (
        <video ref={ref} autoPlay playsInline className="h-12 w-16 rounded object-cover bg-slate-900" />
      ) : (
        <img src={peer.avatarUrl} alt={peer.name} className="h-10 w-10 rounded-full object-cover" />
      )}
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold text-slate-900">{peer.name}</div>
        <div className="text-xs text-slate-500">{peer.micOn ? 'Mic active' : 'Muted'}</div>
      </div>
    </div>
  );
}
