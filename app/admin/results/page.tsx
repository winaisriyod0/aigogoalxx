'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Match } from '@/lib/supabase';
import { toast } from 'sonner';
import TeamLogo from '@/components/TeamLogo';
import { CheckSquare } from 'lucide-react';
import { formatDateTH, formatTimeTH } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function AdminResultsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, { home: number; away: number }>>({});

  const load = async () => {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .in('status', ['scheduled', 'live', 'finished'])
      .order('kickoff_time', { ascending: false })
      .limit(50);
    setMatches(data ?? []);
    const scoreInit: Record<string, { home: number; away: number }> = {};
    (data ?? []).forEach((m: Match) => {
      scoreInit[m.id] = { home: m.home_score ?? 0, away: m.away_score ?? 0 };
    });
    setScores(scoreInit);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setResult = async (match: Match) => {
    const score = scores[match.id];
    if (!score) return;
    setSaving(match.id);
    try {
      // Save score + mark finished
      // DB trigger (recalc_predictions_for_match) automatically:
      //   - Recalculates all human prediction points
      //   - Syncs AI predictions -> predictions table
      //   - Updates total_points for ALL players (human + AI)
      const { error } = await supabase.from('matches').update({
        home_score: score.home,
        away_score: score.away,
        status: 'finished',
        updated_at: new Date().toISOString(),
      }).eq('id', match.id);
      if (error) throw error;

      toast.success('บันทึกผลและอัพเดตคะแนนเรียบร้อย');
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-6 uppercase tracking-wide">RESULTS</h1>
      <p className="text-slate-400 text-sm mb-6">ใส่สกอร์และกด "ยืนยันผล" เพื่อคำนวณคะแนนผู้เล่นและ AI</p>

      {loading ? (
        <div className="text-center py-12 text-slate-400">กำลังโหลด...</div>
      ) : (
        <div className="glass rounded-xl border border-white/8 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 grid grid-cols-[1fr_150px_120px_100px] gap-3 text-xs text-slate-500 uppercase tracking-wider">
            <span>แมตช์</span>
            <span className="text-center">สกอร์</span>
            <span className="text-center">สถานะ</span>
            <span></span>
          </div>
          <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto scrollbar-thin">
            {matches.map((match) => {
              const score = scores[match.id] ?? { home: 0, away: 0 };
              return (
                <div key={match.id} className="grid grid-cols-[1fr_150px_120px_100px] gap-3 items-center px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      <span className="inline-flex items-center gap-1.5 flex-wrap text-sm text-white font-medium">
                        <TeamLogo teamName={match.home_team} apiFlagOrUrl={match.home_team_flag} size={18} /> {match.home_team}
                        {' vs '}
                        {match.away_team} <TeamLogo teamName={match.away_team} apiFlagOrUrl={match.away_team_flag} size={18} />
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">{formatDateTH(match.kickoff_time)} {formatTimeTH(match.kickoff_time)}</p>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <ScoreInput
                      value={score.home}
                      onChange={(v) => setScores((s) => ({ ...s, [match.id]: { ...s[match.id], home: v } }))}
                      disabled={match.status === 'finished'}
                    />
                    <span className="text-slate-400">-</span>
                    <ScoreInput
                      value={score.away}
                      onChange={(v) => setScores((s) => ({ ...s, [match.id]: { ...s[match.id], away: v } }))}
                      disabled={match.status === 'finished'}
                    />
                  </div>
                  <div className="flex justify-center">
                    {match.status === 'finished' ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                        <CheckSquare className="w-3 h-3" /> จบแล้ว
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs">รอผล</span>
                    )}
                  </div>
                  <button
                    onClick={() => setResult(match)}
                    disabled={!!saving || match.status === 'finished'}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                      match.status === 'finished'
                        ? 'bg-white/5 text-slate-500 cursor-default'
                        : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50'
                    )}
                  >
                    {saving === match.id ? '...' : 'ยืนยันผล'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreInput({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Math.max(0, Math.min(30, +e.target.value)))}
      disabled={disabled}
      min={0} max={30}
      className="w-12 bg-white/5 border border-white/10 rounded-lg text-center text-white font-bold text-sm py-1.5 focus:outline-none focus:border-emerald-500/50 disabled:opacity-40 disabled:cursor-default"
    />
  );
}
