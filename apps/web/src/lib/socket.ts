import { io } from 'socket.io-client';

// Conecta automaticamente na nossa API NestJS
const URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// O autoConnect: false garante que o túnel só seja aberto quando o usuário entrar num Quadro
export const socket = io(URL, {
  autoConnect: false,
});
