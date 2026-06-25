'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/supabase';
import Header from '@/components/Header';
import { Trophy, ChevronLeft, ChevronRight, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<Profile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('Season 1');

  useEffect(() => {
    supabase.from('settings').select('value').eq('key', 'leaderboard_title').maybeSingle().then(({ data }) => {
      if (data?.value) setTitle(data.value);
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('is_banned', false)
        .order('total_points', { ascending: false })
        .range(from, to);

      setPlayers(data ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    };
    load();
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const globalOffset = (page - 1) * PAGE_SIZE;

  return (
    <div className="min-h-screen bg-[#0b0f19]">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-sm font-medium mb-4">
            <Trophy className="w-4 h-4" />
            ตารางคะแนน
          </div>
          <h1 className="text-3xl font-black text-white">Leaderboard — {title}</h1>
          <p className="text-slate-400 text-sm mt-2">{total} ผู้เล่นทั้งหมด</p>
        </div>

        <div className="glass rounded-2xl border border-white/8 overflow-hidden">
          {/* Column headers */}
          <div className="px-4 py-3 border-b border-white/5 grid grid-cols-[48px_1fr_auto_auto] gap-3 text-xs text-slate-500 uppercase tracking-wider font-medium">
            <span className="text-center">#</span>
            <span>ผู้เล่น</span>
            <span className="hidden sm:block text-center w-24">จังหวัด</span>
            <span className="text-right w-16">คะแนน</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">กำลังโหลด...</div>
          ) : players.length === 0 ? (
            <div className="p-12 text-center text-slate-500">ยังไม่มีข้อมูล</div>
          ) : (
            <div className="divide-y divide-white/4">
              {players.map((player, idx) => {
                const rank = globalOffset + idx + 1;
                return (
                  <Link
                    key={player.id}
                    href={`/profile/${player.id}`}
                    className="grid grid-cols-[48px_1fr_auto_auto] gap-3 items-center px-4 py-3 hover:bg-white/3 transition-all group"
                  >
                    <div className="flex items-center justify-center">
                      <RankDisplay rank={rank} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'font-semibold text-sm truncate group-hover:text-emerald-400 transition-all',
                          player.is_ai ? 'text-blue-400' : 'text-white'
                        )}>
                          {player.username || `${player.first_name} ${player.last_name}`}
                        </span>
                        {player.is_ai && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 flex-shrink-0">AI</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{player.country}</p>
                    </div>
                    <span className="hidden sm:block text-xs text-slate-400 text-center w-24 truncate">{player.province}</span>
                    <div className="text-right w-16">
                      <span className="font-bold text-emerald-400 text-sm">{player.total_points}</span>
                      <span className="text-xs text-slate-500 ml-1">pts</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl glass border border-white/8 text-white disabled:opacity-30 hover:bg-white/5 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let p: number;
                if (totalPages <= 7) {
                  p = i + 1;
                } else if (page <= 4) {
                  p = i + 1;
                } else if (page >= totalPages - 3) {
                  p = totalPages - 6 + i;
                } else {
                  p = page - 3 + i;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-sm font-semibold transition-all',
                      p === page ? 'bg-emerald-500 text-black' : 'glass border border-white/8 text-slate-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl glass border border-white/8 text-white disabled:opacity-30 hover:bg-white/5 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function RankDisplay({ rank }: { rank: number }) {
  if (rank === 1) return <Medal className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="text-slate-500 text-sm font-bold">{rank}</span>;
}
