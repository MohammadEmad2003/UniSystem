import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace('/api', '') ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
