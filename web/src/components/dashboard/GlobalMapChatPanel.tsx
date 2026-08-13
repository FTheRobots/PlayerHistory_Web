import { useEffect, useRef, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useChatFeed } from '../../hooks/useChatFeed';
import type { ChatFeedTab, ChatTab } from '../../types';

const CHANNEL_LABELS: Record<ChatTab, string> = {
  global: 'Global',
  team: 'Team',
  admin: 'Admin',
  transport: 'Transport',
};

const TABS: Array<{ id: ChatFeedTab; label: string; hint?: string }> = [
  { id: 'all', label: 'All', hint: 'Every channel combined' },
  { id: 'global', label: 'Global', hint: 'Expansion global · vanilla direct' },
  { id: 'team', label: 'Team', hint: 'Expansion party chat' },
  { id: 'admin', label: 'Admin', hint: 'Admin channel' },
  { id: 'transport', label: 'Transport', hint: 'Vehicle · radio' },
];

interface GlobalMapChatPanelProps {
  onSelectPlayer?: (steamId: string) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function GlobalMapChatPanel({ onSelectPlayer }: GlobalMapChatPanelProps) {
  const [activeTab, setActiveTab] = useState<ChatFeedTab>('all');
  const { messages, loading, error } = useChatFeed(activeTab);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    if (!stickToBottomRef.current || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, activeTab]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };

  const activeHint = TABS.find((t) => t.id === activeTab)?.hint;

  return (
    <aside className="w-80 shrink-0 flex flex-col border border-border rounded-lg bg-panel/80 overflow-hidden min-h-0">
      <div className="shrink-0 px-3 py-2 border-b border-border bg-panel">
        <div className="flex items-center gap-2 text-sm font-medium text-text">
          <MessageSquare size={16} className="text-accent" />
          Live chat
        </div>
        {activeHint && <p className="text-[10px] text-muted mt-0.5">{activeHint}</p>}
      </div>

      <div className="shrink-0 flex flex-wrap border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`min-w-[3rem] flex-1 px-1 py-2 text-[10px] uppercase tracking-wide border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-accent text-accent-bright font-medium'
                : 'border-transparent text-muted hover:text-text'
            }`}
            title={tab.hint}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2"
      >
        {loading && messages.length === 0 && (
          <p className="text-xs text-muted text-center py-6">Loading chat…</p>
        )}

        {!loading && messages.length === 0 && !error && (
          <p className="text-xs text-muted text-center py-6 leading-relaxed">
            No messages yet{activeTab === 'all' ? '' : ' for this channel'}.
            <br />
            Chat is logged when players send messages in-game.
          </p>
        )}

        {error && (
          <p className="text-xs text-red-400 text-center py-2">{error}</p>
        )}

        {messages.map((msg) => {
          const name = msg.playerName ?? msg.steamId;
          const key = `${msg.timestamp}-${msg.steamId}-${msg.message.slice(0, 24)}`;
          return (
            <div key={key} className="text-xs leading-snug">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-[10px] text-dim font-mono shrink-0">{formatTime(msg.timestamp)}</span>
                {activeTab === 'all' && (
                  <span className="text-[9px] uppercase text-muted/90 shrink-0">
                    {CHANNEL_LABELS[msg.chatTab] ?? msg.chatTab}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onSelectPlayer?.(msg.steamId)}
                  className="font-medium text-accent hover:underline truncate max-w-full text-left"
                  title={msg.steamId}
                >
                  {msg.groupTag ? `${msg.groupTag} ${name}` : name}
                </button>
                {msg.chatSource === 'expansion' && (
                  <span className="text-[9px] uppercase text-muted/80">EXP</span>
                )}
              </div>
              <p className="text-text/90 break-words pl-0.5 mt-0.5">{msg.message}</p>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
