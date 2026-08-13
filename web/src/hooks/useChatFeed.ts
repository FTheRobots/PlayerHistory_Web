import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { ChatMessage, ChatFeedTab } from '../types';
import { usePageVisible } from './usePageVisible';

const POLL_MS = 5000;
const MAX_MESSAGES = 200;

export function useChatFeed(activeTab: ChatFeedTab) {
  const { activeInstance } = useAuth();
  const pageVisible = usePageVisible();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastTimestampRef = useRef<string | null>(null);
  const seenKeysRef = useRef<Set<string>>(new Set());

  const messageKey = (msg: ChatMessage) =>
    `${msg.timestamp}|${msg.steamId}|${msg.message}`;

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getChatMessages({ tab: activeTab, limit: MAX_MESSAGES });
      setMessages(result.data);
      seenKeysRef.current = new Set(result.data.map(messageKey));
      lastTimestampRef.current =
        result.data.length > 0 ? result.data[result.data.length - 1].timestamp : null;
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const pollNew = useCallback(async () => {
    const since = lastTimestampRef.current;
    if (!since) return;

    try {
      const result = await api.getChatMessages({ tab: activeTab, since, limit: 100 });
      if (result.data.length === 0) return;

      setMessages((prev) => {
        const merged = [...prev];
        for (const msg of result.data) {
          const key = messageKey(msg);
          if (seenKeysRef.current.has(key)) continue;
          seenKeysRef.current.add(key);
          merged.push(msg);
        }
        const trimmed = merged.length > MAX_MESSAGES ? merged.slice(-MAX_MESSAGES) : merged;
        if (trimmed.length < merged.length) {
          seenKeysRef.current = new Set(trimmed.map(messageKey));
        }
        lastTimestampRef.current = trimmed[trimmed.length - 1]?.timestamp ?? since;
        return trimmed;
      });
      setError(null);
    } catch {
      // keep existing messages on poll failure
    }
  }, [activeTab]);

  useEffect(() => {
    lastTimestampRef.current = null;
    seenKeysRef.current = new Set();
    setMessages([]);
    void loadInitial();
  }, [activeTab, activeInstance?.id, loadInitial]);

  useEffect(() => {
    if (!pageVisible) return;
    const id = window.setInterval(() => void pollNew(), POLL_MS);
    return () => window.clearInterval(id);
  }, [pollNew, pageVisible]);

  return { messages, loading, error, reload: loadInitial };
}
