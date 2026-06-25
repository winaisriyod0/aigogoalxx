'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Profile, Prediction, Match } from '@/lib/supabase';
import Header from '@/components/Header';
import { ArrowLeft, Trophy, MapPin, Globe, Calendar, Bot, Clock } from 'lucide-react';
import { censorEmail, formatDateTH, formatTimeTH } from '@/lib/utils';
import { cn } from '@/lib/utils';

type PredWithMatch = Prediction & { match: Match };

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [predictions, setPredictions] = useState<PredWithMatch[]>([]);
  const [rank, setRank] = useState<number | null>(null);
  const [rankProvince, setRankProvince] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [totalProvincePlayers, setTotalProvincePlayers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [{ data: p }, { data: preds }, { count: totalCount }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('predictions').select('*, match:matches(*)').eq('user_id', id).order('created_at', { ascending: false }).limit(30),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', false),
      ]);

      setProfile(p ?? null);
      setTotalPlayers(totalCount ?? 0);

      if (p) {
        const { count: higherCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_banned', false)
          .gt('total_points', p.total_points);
        setRank((higherCount ?? 0) + 1);

        const { count: provinceHigher } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_banned', false)
          .eq('province', p.province)
          .gt('total_points', p.total_points);
        setRankProvince((provinceHigher ?? 0) + 1);

        const { count: pt } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_banned', false)
          .eq('province', p.province);
        setTotalProvincePlayers(pt ?? 0);
      }

      const predsWithMatch = (preds ?? []).filter((p: any) => p.match) as PredWithMatch[];
      setPredictions(predsWithMatch);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19]">
        <Header />
        <div className="flex items-center justify-center py-20 text-slate-400">กำลังโหลด...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0b0f19]">
        <Header />
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-slate-400">ไม่พบผู้เล่น</p>
          <Link href="/" className="text-emerald-400 hover:underline">กลับหน้าหลัก</Link>
        </div>
      </div>
    );
  }

  const recentPreds = predictions.slice(0, 10);
  // Only count stats from finished matches (points !== null means result confirmed)
  const exactCount = predictions.filter((p) => p.is_exact && p.match.status === 'finished').length;
  const correctCount = predictions.filter((p) => p.is_correct_result && !p.is_exact && p.match.status === 'finished').length;
  const missCount = predictions.filter((p) => p.points === 0 && p.match.status === 'finished').length;

  return (
    <div className="min-h-screen bg-[#0b0f19]">
      <Header />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/leaderboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-all">
          <ArrowLeft className="w-4 h-4" />
          ตารางคะแนน
        </Link>

        {/* Profile Card */}
        <div className="glass rounded-2xl border border-white/8 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className={cn(
              'w-16 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl flex-shrink-0',
              profile.is_ai ? 'border-blue-500/50 bg-blue-500/10' : 'border-emerald-500/50 bg-emerald-500/10'
            )}>
              {profile.is_ai ? <Bot className="w-8 h-8 text-blue-400" /> : '👤'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-black text-white">
                  {profile.username || `${profile.first_name} ${profile.last_name}`}
                </h1>
                {profile.is_ai && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-semibold">AI</span>
                )}
              </div>
              {profile.email && (
                <p className="text-slate-500 text-sm">{censorEmail(profile.email)}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-2">
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <MapPin className="w-3 h-3" />
                  {profile.province}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Globe className="w-3 h-3" />
                  {profile.country}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Calendar className="w-3 h-3" />
                  สมาชิกตั้งแต่ {new Date(profile.created_at).getFullYear()}
                </span>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-3xl font-black text-emerald-400">{profile.total_points}</p>
              <p className="text-xs text-slate-400">คะแนนรวม</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-white/5">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400">{rank}<span className="text-slate-400 text-sm font-normal">/{totalPlayers}</span></p>
              <p className="text-xs text-slate-400 mt-0.5">อันดับโลก</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400">{rankProvince}<span className="text-slate-400 text-sm font-normal">/{totalProvincePlayers}</span></p>
              <p className="text-xs text-slate-400 mt-0.5">อันดับ{profile.province}</p>
            </div>
          </div>
        </div>

        {/* Stats — only from finished matches */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'ถูกสกอร์', count: exactCount, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
            { label: 'ผลถูก', count: correctCount, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { label: 'ผิด', count: missCount, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          ].map((s) => (
            <div key={s.label} className={cn('rounded-xl border p-3 text-center', s.bg)}>
              <p className={cn('text-2xl font-black', s.color)}>{s.count}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recent Predictions */}
        <div>
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-emerald-400" />
            ประวัติทาย 10 ล่าสุด
          </h2>

          {/* Badge strip — only show result badge when match is finished */}
          <div className="flex gap-1 mb-4">
            {recentPreds.map((p) => {
              const isFinished = p.match.status === 'finished' && p.points !== null;
              return (
                <div
                  key={p.id}
                  title={`${p.match.home_team} ${p.home_score_pred}-${p.away_score_pred} ${p.match.away_team}${isFinished ? ` → ${p.match.home_score}-${p.match.away_score}` : ' (รอผล)'}`}
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0',
                    isFinished
                      ? (p.is_exact ? 'badge-exact' : p.is_correct_result ? 'badge-correct' : 'badge-miss')
                      : 'bg-white/8 border border-white/15 text-slate-400'
                  )}
                >
                  {isFinished
                    ? (p.is_exact ? '⭐' : p.is_correct_result ? '✓' : '✗')
                    : <Clock className="w-3 h-3" />
                  }
                </div>
              );
            })}
            {recentPreds.length < 10 && Array.from({ length: 10 - recentPreds.length }).map((_, i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex-shrink-0" />
            ))}
          </div>

          <div className="glass rounded-xl border border-white/8 divide-y divide-white/5">
            {predictions.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">ยังไม่มีประวัติการทาย</div>
            ) : (
              predictions.map((pred) => {
                const isFinished = pred.match.status === 'finished' && pred.points !== null;
                return (
                  <div key={pred.id} className="px-4 py-3 flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                      isFinished
                        ? (pred.is_exact ? 'badge-exact' : pred.is_correct_result ? 'badge-correct' : pred.points === 0 ? 'badge-miss' : 'bg-white/5 text-slate-400')
                        : 'bg-white/8 border border-white/15 text-slate-400'
                    )}>
                      {isFinished
                        ? (pred.points === 3 ? '⭐' : pred.points === 1 ? '+1' : '0')
                        : <Clock className="w-3.5 h-3.5" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">
                        {pred.match.home_team} vs {pred.match.away_team}
                      </p>
                      <p className="text-xs text-slate-400">
                        ทาย: {pred.home_score_pred}-{pred.away_score_pred}
                        {isFinished && ` · ผลจริง: ${pred.match.home_score}-${pred.match.away_score}`}
                        {!isFinished && (
                          <span className="ml-1 text-slate-500">· รอผลยืนยัน</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-500">{formatDateTH(pred.match.kickoff_time)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
