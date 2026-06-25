'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Calendar, Bot, CheckSquare, Gift, Settings, Shield, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/teams', label: 'Teams', icon: Shield },
  { href: '/admin/matches', label: 'Matches', icon: Calendar },
  { href: '/admin/ai-predictions', label: 'AI Predictions', icon: Bot },
  { href: '/admin/results', label: 'Results', icon: CheckSquare },
  { href: '/admin/prizes', label: 'Prizes', icon: Gift },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 hidden md:flex flex-col glass-dark border-r border-white/5 min-h-[calc(100vh-64px)]">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white text-sm uppercase tracking-wider">ADMIN</span>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                active
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
              {active && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
