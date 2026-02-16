import './globals.css';
import Providers from '../components/Providers';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'Kanban v2',
  description: 'Sistema Kanban Colaborativo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          {children}
          {/* Componente invisível que injeta as notificações elegantes */}
          <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
        </Providers>
      </body>
    </html>
  );
}
