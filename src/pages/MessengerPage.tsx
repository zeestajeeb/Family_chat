import { useEffect, useRef, useState } from 'react';
import { CheckCheck, ImagePlus, Send, Smile } from 'lucide-react';
import type { ChatMessage, Conversation, User } from '../types';
import { wsClient } from '../lib/wsClient';

const QUICK_EMOJIS = ['👍', '❤️', '🎉', '🚀', '🏁', '😄'];

export function MessengerPage({ currentUser, liveMembers }: { currentUser: User; liveMembers: User[] }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState('');
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeConvRef = useRef<number | null>(null);
  activeConvRef.current = activeConvId;

  const loadConversations = async () => {
    const res = await fetch('/api/conversations');
    if (!res.ok) return;
    const data = await res.json();
    setConversations(data.conversations || []);
    if (!activeConvRef.current && data.conversations?.[0]) {
      setActiveConvId(data.conversations[0].id);
    }
  };

  const loadMessages = async (convId: number) => {
    const res = await fetch(`/api/conversations/${convId}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
      wsClient.send('chat:read', { conversationId: convId });
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    const unsubMsg = wsClient.on('chat:message', (msg: ChatMessage) => {
      loadConversations();
      if (msg.conversation_id === activeConvRef.current) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        wsClient.send('chat:read', { conversationId: msg.conversation_id });
      }
    });

    const unsubTyping = wsClient.on(
      'chat:typing',
      (data: { conversationId: number; userName: string; isTyping: boolean }) => {
        if (data.conversationId === activeConvRef.current) {
          setTypingUser(data.isTyping ? data.userName : null);
        }
      }
    );

    const unsubRead = wsClient.on('chat:read_receipt', (data: { conversationId: number; userId: number }) => {
      if (data.conversationId === activeConvRef.current) {
        setMessages((prev) =>
          prev.map((m) => {
            const arr: number[] = JSON.parse(m.read_by_json || '[]');
            if (!arr.includes(data.userId)) {
              arr.push(data.userId);
              return { ...m, read_by_json: JSON.stringify(arr) };
            }
            return m;
          })
        );
      }
    });

    const unsubReact = wsClient.on(
      'chat:reaction',
      (data: { messageId: number; conversationId: number; reactions: Record<string, number[]> }) => {
        if (data.conversationId === activeConvRef.current) {
          setMessages((prev) =>
            prev.map((m) => (m.id === data.messageId ? { ...m, reactions_json: JSON.stringify(data.reactions) } : m))
          );
        }
      }
    );

    return () => {
      unsubMsg();
      unsubTyping();
      unsubRead();
      unsubReact();
    };
  }, []);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId || !body.trim()) return;
    wsClient.send('chat:send', { conversationId: activeConvId, body: body.trim() });
    wsClient.send('chat:typing', { conversationId: activeConvId, isTyping: false });
    setBody('');
    setShowEmojiPicker(false);
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConvId) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const res = await fetch('/api/uploads/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: reader.result }),
        });
        if (res.ok) {
          const data = await res.json();
          wsClient.send('chat:send', {
            conversationId: activeConvId,
            body: body.trim() || 'Shared a photo',
            attachmentUrl: data.url,
          });
          setBody('');
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
    e.target.value = '';
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Family Messenger</h1>
        <p className="text-sm text-slate-600">
          Private real-time messaging strictly for Dad, Leo, and Maya.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 overflow-hidden rounded-xl border border-slate-200 bg-white min-h-[560px]">
        {/* Left Conversation List */}
        <aside className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50 p-3 space-y-1">
          <p className="px-2 py-1.5 text-xs font-semibold text-slate-500">Private Channels</p>
          {conversations.map((conv) => {
            const isSelected = conv.id === activeConvId;
            const otherMember = conv.type === 'direct' ? conv.members.find((m) => m.id !== currentUser.id) : null;
            const liveOther = otherMember ? liveMembers.find((lm) => lm.id === otherMember.id) || otherMember : null;
            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => setActiveConvId(conv.id)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  isSelected ? 'bg-white border border-slate-200 shadow-2xs' : 'hover:bg-slate-100/70'
                }`}
              >
                {liveOther ? (
                  <img
                    src={liveOther.avatar_url}
                    alt={conv.displayTitle}
                    className="h-9 w-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shrink-0">
                    FC
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold text-slate-900">{conv.displayTitle}</span>
                    {liveOther && (
                      <span className={`text-[11px] font-medium ${liveOther.is_online ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {liveOther.is_online ? 'Online' : 'Offline'}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-500 mt-0.5">{conv.last_message || 'No messages yet'}</p>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Right Message Thread */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">{activeConv?.displayTitle || 'Select a conversation'}</h2>
              <p className="text-xs text-slate-500">
                {activeConv?.members.map((m) => m.name).join(' · ')}
              </p>
            </div>
            {typingUser && <span className="text-xs font-medium text-blue-600">{typingUser} is typing...</span>}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[430px] bg-slate-50/30">
            {messages.map((m) => {
              const mine = m.sender_id === currentUser.id;
              const readBy: number[] = JSON.parse(m.read_by_json || '[]');
              const reactions: Record<string, number[]> = JSON.parse(m.reactions_json || '{}');
              const seenByOther = readBy.some((uid) => uid !== m.sender_id);

              return (
                <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-end gap-2 max-w-[82%]">
                    {!mine && (
                      <img src={m.sender_avatar} alt={m.sender_name} className="h-7 w-7 rounded-full object-cover shrink-0" />
                    )}
                    <div
                      className={`rounded-xl px-4 py-2.5 text-sm ${
                        mine ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-900'
                      }`}
                    >
                      {!mine && <p className="text-[11px] font-bold text-slate-500 mb-0.5">{m.sender_name}</p>}
                      {m.attachment_url && (
                        <img
                          src={m.attachment_url}
                          alt="Shared attachment"
                          className="mb-2 max-h-52 rounded-lg object-contain border border-slate-200 bg-white"
                        />
                      )}
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    </div>
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400 px-1">
                    <span className="tabular-nums">
                      {new Date(m.created_at + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {mine && (
                      <span className={`inline-flex items-center gap-0.5 ${seenByOther ? 'text-blue-600' : 'text-slate-400'}`}>
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span>{seenByOther ? 'Read' : 'Sent'}</span>
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      {Object.entries(reactions).map(([em, users]) =>
                        users.length > 0 ? (
                          <button
                            key={em}
                            type="button"
                            onClick={() => wsClient.send('chat:react', { messageId: m.id, emoji: em })}
                            className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-700"
                          >
                            {em} {users.length}
                          </button>
                        ) : null
                      )}
                      <button
                        type="button"
                        onClick={() => wsClient.send('chat:react', { messageId: m.id, emoji: '👍' })}
                        className="hover:text-slate-600"
                        title="React 👍"
                      >
                        +👍
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="relative border-t border-slate-200 bg-white p-3.5 flex items-center gap-2">
            {showEmojiPicker && (
              <div className="absolute bottom-16 left-4 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-md">
                {QUICK_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setBody((b) => b + em)}
                    className="rounded px-2 py-1 text-base hover:bg-slate-100"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImagePick}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Share private image"
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Insert emoji"
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            >
              <Smile className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                if (activeConvId) {
                  wsClient.send('chat:typing', { conversationId: activeConvId, isTyping: e.target.value.length > 0 });
                }
              }}
              placeholder={uploading ? 'Uploading image...' : 'Write a message to your family...'}
              className="flex-1 rounded-lg border border-slate-200 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
