import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { TeamsProvider } from '@/contexts/TeamsContext';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'AI Go Goal — ทายผลฟุตบอลโลก',
  description: 'แข่งขันทายสกอร์ฟุตบอลโลกกับ AI 3 เจ้าดัง Gemini, DeepSeek, Claude',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#0b0f19] text-[#f1f5f9] min-h-screen">
        <AuthProvider>
          <TeamsProvider>
            {children}
          </TeamsProvider>
          <Toaster theme="dark" />
        </AuthProvider>
      </body>
    </html>
  );
}
