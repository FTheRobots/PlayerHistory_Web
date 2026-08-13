import { getAccessToken, getWsUrl } from '../auth/storage';
import { getActiveInstanceId } from '../auth/activeInstance';

export type WsMessage = {
  type?: string;
  channel?: string;
  data?: unknown;
  events?: unknown;
  error?: string;
  userId?: number;
};

type MessageHandler = (msg: WsMessage) => void;

const RECONNECT_MS = 5000;

class SharedWebSocketHub {
  private ws: WebSocket | null = null;
  private refCount = 0;
  private token: string | null = null;
  private instanceId: string | null = null;
  private active = false;
  private reconnectTimer: number | null = null;
  private readonly channels = new Set<string>();
  private readonly handlers = new Set<MessageHandler>();
  private onConnectHandlers = new Set<() => void>();
  private onDisconnectHandlers = new Set<() => void>();

  acquire(token: string, instanceId?: string): void {
    const nextInstance = instanceId ?? getActiveInstanceId() ?? '';
    this.refCount += 1;
    if (this.token !== token || this.instanceId !== nextInstance) {
      this.token = token;
      this.instanceId = nextInstance;
      this.reconnect();
      return;
    }
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.active = true;
      this.connect();
    }
  }

  release(): void {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount === 0) {
      this.active = false;
      this.clearReconnect();
      this.ws?.close();
      this.ws = null;
    }
  }

  subscribe(channel: string): void {
    this.channels.add(channel);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', channel }));
    }
  }

  unsubscribe(channel: string): void {
    this.channels.delete(channel);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', channel }));
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onConnect(handler: () => void): () => void {
    this.onConnectHandlers.add(handler);
    return () => this.onConnectHandlers.delete(handler);
  }

  onDisconnect(handler: () => void): () => void {
    this.onDisconnectHandlers.add(handler);
    return () => this.onDisconnectHandlers.delete(handler);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private reconnect(): void {
    this.clearReconnect();
    this.ws?.close();
    this.ws = null;
    this.active = true;
    this.connect();
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private connect(): void {
    if (!this.active || this.refCount === 0) return;

    const token = this.token ?? getAccessToken();
    if (!token) return;

    this.clearReconnect();
    const params = new URLSearchParams({ token });
    if (this.instanceId) {
      params.set('instanceId', this.instanceId);
    }
    const ws = new WebSocket(`${getWsUrl()}?${params.toString()}`);
    this.ws = ws;

    ws.onopen = () => {
      if (this.ws !== ws) return;
      for (const channel of this.channels) {
        ws.send(JSON.stringify({ type: 'subscribe', channel }));
      }
      for (const handler of this.onConnectHandlers) handler();
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as WsMessage;
        for (const handler of this.handlers) handler(msg);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (this.ws === ws) {
        this.ws = null;
      }
      for (const handler of this.onDisconnectHandlers) handler();
      if (!this.active || this.refCount === 0) return;

      this.clearReconnect();
      this.reconnectTimer = window.setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, RECONNECT_MS);
    };

    ws.onerror = () => {
      ws.close();
    };
  }
}

export const sharedWsHub = new SharedWebSocketHub();
