import { io } from 'socket.io-client';

// URL base sem o /api no final, pois o Nginx pega o /socket.io direto da raiz
const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const SOCKET_URL = rawUrl.replace(/\/api\/?$/, '');

// O autoConnect: false garante que o túnel só seja aberto quando o usuário entrar num Quadro
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  path: '/socket.io/',
  transports: ['websocket', 'polling']
});
