'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, LogOut, Menu, X, Shield, User, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'ฟุตบอล' },
  { href: '/predict', label: 'ทายผล' },
  { href: '/leaderboard', label: 'ตารางคะแนน' },
  { href: '/history', label: 'ประวัติของฉัน' },
];

export default function Header() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass-dark border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center group-hover:bg-emerald-500/30 transition-all">
              <Trophy className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="font-bold text-base tracking-wide">
              <span className="text-white">AI GO</span>
              <span className="text-emerald-400"> GOAL</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  pathname === link.href
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  pathname.startsWith('/admin')
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-500/10'
                )}
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </Link>
            )}
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropOpen(!dropOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-sm"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-500/30 border border-emerald-500/50 flex items-center justify-center">
                    <User className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span className="hidden sm:block text-white font-medium max-w-[120px] truncate">
                    {profile?.username || profile?.first_name || 'ผู้เล่น'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {dropOpen && (
                  <div className="absolute right-0 mt-2 w-48 glass rounded-xl border border-white/10 shadow-xl py-1 z-50">
                    <Link
                      href={`/profile/${user.id}`}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                      onClick={() => setDropOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      โปรไฟล์
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10 transition-all"
                        onClick={() => setDropOpen(false)}
                      >
                        <Shield className="w-4 h-4" />
                        Admin Panel
                      </Link>
                    )}
                    <hr className="border-white/10 my-1" />
                    <button
                      onClick={() => { signOut(); setDropOpen(false); }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-all w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      ออก
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-all glow-green"
              >
                เข้าสู่ระบบ
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-all"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/5 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'block px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  pathname === link.href
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-emerald-400"
              >
                <Shield className="w-4 h-4" />
                Admin Panel
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
