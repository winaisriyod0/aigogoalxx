'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/supabase';
import { toast } from 'sonner';
import { Search, Ban, Trash2, Bot } from 'lucide-react';
import { censorEmail, formatDateTH } from '@/lib/utils';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers(data ?? []);
    setFiltered(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(users); return; }
    const q = search.toLowerCase();
    setFiltered(users.filter((u) =>
      (u.username ?? '').toLowerCase().includes(q) ||
      (u.first_name + ' ' + u.last_name).toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q)
    ));
  }, [search, users]);

  const toggleBan = async (user: Profile) => {
    const { error } = await supabase.from('profiles').update({ is_banned: !user.is_banned }).eq('id', user.id);
    if (error) { toast.error(error.message); return; }
    toast.success(user.is_banned ? 'ปลดแบนเรียบร้อย' : 'แบนผู้เล่นเรียบร้อย');
    await load();
  };

  const deleteUser = async (user: Profile) => {
    if (!confirm(`ลบผู้เล่น "${user.username || user.first_name}"? ข้อมูลทั้งหมดจะหายถาวร`)) return;
    const { error } = await supabase.from('profiles').delete().eq('id', user.id);
    if (error) { toast.error(error.message); return; }
    toast.success('ลบผู้เล่นเรียบร้อย');
    await load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white uppercase tracking-wide">USERS</h1>
        <span className="text-slate-400 text-sm">{users.length} คน</span>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ, ชื่อในเว็บ, อีเมล..."
          className="w-full max-w-sm bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
        />
      </div>

      <div className="glass rounded-xl border border-white/8 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 grid grid-cols-[1fr_1fr_120px_80px_100px] gap-3 text-xs text-slate-500 uppercase tracking-wider">
          <span>ชื่อ</span>
          <span>อีเมล</span>
          <span>สมัครวันที่</span>
          <span className="text-center">คะแนน</span>
          <span></span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">กำลังโหลด...</div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto scrollbar-thin">
            {filtered.map((user) => (
              <div key={user.id} className={cn(
                'grid grid-cols-[1fr_1fr_120px_80px_100px] gap-3 items-center px-4 py-3',
                user.is_banned && 'opacity-50'
              )}>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {user.is_ai && <Bot className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                    <Link href={`/profile/${user.id}`} className="text-sm text-white font-medium truncate hover:text-emerald-400 transition-all">
                      {user.username || `${user.first_name} ${user.last_name}`}
                    </Link>
                    {user.is_banned && <span className="px-1.5 py-0.5 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30">แบน</span>}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{user.province} · {user.country}</p>
                </div>
                <span className="text-xs text-slate-400 truncate">{user.email ? censorEmail(user.email) : '-'}</span>
                <span className="text-xs text-slate-400">{formatDateTH(user.created_at)}</span>
                <span className="text-center font-bold text-emerald-400 text-sm">{user.total_points}</span>
                <div className="flex items-center gap-1 justify-end">
                  {!user.is_ai && (
                    <>
                      <button
                        onClick={() => toggleBan(user)}
                        className={cn(
                          'p-1.5 rounded-lg transition-all text-xs',
                          user.is_banned
                            ? 'hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400'
                            : 'hover:bg-yellow-500/10 text-slate-400 hover:text-yellow-400'
                        )}
                        title={user.is_banned ? 'ปลดแบน' : 'แบน'}
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteUser(user)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all"
                        title="ลบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
