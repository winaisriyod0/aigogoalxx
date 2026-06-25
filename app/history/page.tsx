'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Prediction, Match } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Link from 'next/link';
import { History, Trophy } from 'lucide-react';
import TeamLogo from '@/components/TeamLogo';
import { formatDateTH, formatTimeTH } from '@/lib/utils';
import { cn } from '@/lib/utils';

type PredWithMatch = Prediction & { match: Match };

export default function HistoryPage() {
  const { user } = useAuth();
  const [preds, setPreds] = useState<PredWithMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from('predictions')
      .select('*, match:matches(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPreds((data ?? []).filter((p: any) => p.match) as PredWithMatch[]);
        setLoading(false);
      });
  }, [user]);

  const total = preds.reduce((s, p) => s + (p.points ?? 0), 0);
  const exactCount = preds.filter((p) => p.is_exact).length;
  const correctCount = preds.filter((p) => p.is_correct_result && !p.is_exact).length;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0b0f19]">
        <Header />
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-slate-400">กรุณา<Link href="/auth" className="text-emerald-400 hover:underline">เข้าสู่ระบบ</Link>เพื่อดูประวัติ</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19]">
      <Header />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <History className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl font-black text-white">ประวัติของฉัน</h1>
        </div>

        {/* Stats summary */}
        {preds.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: 'ทั้งหมด', v: preds.length, color: 'text-white' },
              { label: 'ถูกสกอร์', v: exactCount, color: 'text-yellow-400' },
              { label: 'ผลถูก', v: correctCount, color: 'text-emerald-400' },
              { label: 'คะแนนรวม', v: total, color: 'text-emerald-400' },
            ].map((s) => (
              <div key={s.label} className="glass rounded-xl border border-white/8 p-3 text-center">
                <p className={cn('text-xl font-black', s.color)}>{s.v}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="glass rounded-xl border border-white/8 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400">กำลังโหลด...</div>
          ) : preds.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Trophy className="w-8 h-8 mx-auto mb-3 text-slate-600" />
              <p>ยังไม่มีประวัติการทาย</p>
              <Link href="/predict" className="mt-2 inline-block text-emerald-400 hover:underline text-sm">ทายผลเลย</Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {preds.map((pred) => (
                <div key={pred.id} className="px-4 py-3.5 flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0',
                    pred.is_exact ? 'badge-exact' : pred.is_correct_result ? 'badge-correct' : pred.points === 0 ? 'badge-miss' : 'bg-white/5 text-slate-400'
                  )}>
                    {pred.points === 3 ? '+3' : pred.points === 1 ? '+1' : pred.points === 0 ? '0' : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate flex items-center gap-1">
                      <TeamLogo teamName={pred.match.home_team} apiFlagOrUrl={pred.match.home_team_flag} size={18} /> {pred.match.home_team} <span className="text-slate-400">vs</span> {pred.match.away_team} <TeamLogo teamName={pred.match.away_team} apiFlagOrUrl={pred.match.away_team_flag} size={18} />
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-400">ทาย: <span className="text-white font-bold">{pred.home_score_pred}-{pred.away_score_pred}</span></span>
                      {pred.match.status === 'finished' && (
                        <span className="text-xs text-slate-400">ผลจริง: <span className="text-emerald-400 font-bold">{pred.match.home_score}-{pred.match.away_score}</span></span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-500">{formatDateTH(pred.match.kickoff_time)}</p>
                    <p className="text-xs text-slate-500">{formatTimeTH(pred.match.kickoff_time)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
