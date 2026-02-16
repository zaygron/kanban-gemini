import './globals.css';
import Providers from '../components/Providers';

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
        </Providers>
      </body>
    </html>
  );
}
