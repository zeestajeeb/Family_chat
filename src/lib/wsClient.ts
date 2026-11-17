type Listener = (payload: any) => void;

class FamilyWebSocketClient {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private reconnectTimer: number | null = null;
  private shouldConnect = false;
  public connected = false;

  connect() {
    this.shouldConnect = true;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(url);
    this.ws = socket;

    socket.onopen = () => {
      this.connected = true;
      this.emitLocal('ws:status', { connected: true });
    };

    socket.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data?.event) {
          this.emitLocal(data.event, data.payload);
        }
      } catch {
        // Ignore malformed payloads
      }
    };

    socket.onclose = () => {
      this.connected = false;
      this.emitLocal('ws:status', { connected: false });
      if (this.shouldConnect && this.reconnectTimer === null) {
        this.reconnectTimer = window.setTimeout(() => {
          this.reconnectTimer = null;
          this.connect();
        }, 2000);
      }
    };
  }

  disconnect() {
    this.shouldConnect = false;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  send(event: string, payload: Record<string, unknown> = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, payload }));
      return true;
    }
    return false;
  }

  on(event: string, cb: Listener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(cb);
    return () => {
      this.listeners.get(event)?.delete(cb);
    };
  }

  private emitLocal(event: string, payload: unknown) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      cb(payload);
    }
  }
}

export const wsClient = new FamilyWebSocketClient();
