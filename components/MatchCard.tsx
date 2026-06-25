'use client';
import { useState, useEffect } from 'react';
import { Clock, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatTimeTH, formatDateTH, getCountdownParts } from '@/lib/utils';
import { getScoreDistribution } from '@/lib/scoreDistribution';
import type { Match, Prediction } from '@/lib/supabase';
import Countdown from './Countdown';
import TeamLogo from './TeamLogo';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Props = {
  match: Match;
  showScoreDistribution?: boolean;
};

export default function MatchCard({ match, showScoreDistribution = false }: Props) {
  const { user } = useAuth();
  const [myPrediction, setMyPrediction] = useState<Prediction | null>(null);
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [scoreDist, setScoreDist] = useState<ReturnType<typeof getScoreDistribution>>([]);
  const [editing, setEditing] = useState(false);

  const minutesToKickoff = (new Date(match.kickoff_time).getTime() - Date.now()) / 60000;
  const isLocked = minutesToKickoff <= 30;
  const kickoffParts = getCountdownParts(match.kickoff_time);
  const isUpcoming = match.status === 'scheduled' && kickoffParts.total > 0;

  useEffect(() => {
    if (user) {
      supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id)
        .eq('match_id', match.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setMyPrediction(data);
            setHomeScore(data.home_score_pred);
            setAwayScore(data.away_score_pred);
          }
        });
    }
    if (showScoreDistribution) {
      supabase
        .from('predictions')
        .select('home_score_pred, away_score_pred')
        .eq('match_id', match.id)
        .then(({ data }) => {
          if (data) setScoreDist(getScoreDistribution(data as Prediction[]));
        });
    }
  }, [user, match.id, showScoreDistribution]);

  const handleSubmit = async () => {
    if (!user) { toast.error('กรุณาเข้าสู่ระบบก่อนทาย'); return; }
    if (isLocked) { toast.error('ปิดรับคำทายแล้ว (ก่อนแข่ง 30 นาที)'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('predictions').upsert({
        user_id: user.id,
        match_id: match.id,
        home_score_pred: homeScore,
        away_score_pred: awayScore,
      }, { onConflict: 'user_id,match_id' });
      if (error) throw error;
      setMyPrediction({ ...myPrediction!, home_score_pred: homeScore, away_score_pred: awayScore });
      setEditing(false);
      toast.success('บันทึกคำทายเรียบร้อย');
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass rounded-xl border border-white/8 p-4 card-hover">
      {/* Stage / Date */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
          {match.stage}{match.group_name ? ` · ${match.group_name}` : ''}
        </span>
        <span className="text-xs text-slate-500">
          {formatDateTH(match.kickoff_time)} {formatTimeTH(match.kickoff_time)}
        </span>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <TeamLogo teamName={match.home_team} apiFlagOrUrl={match.home_team_flag} size={36} />
          <div>
            <p className="font-bold text-white text-sm">{match.home_team}</p>
            <p className="text-xs text-slate-500 uppercase">{match.home_team_code}</p>
          </div>
        </div>
        <div className="text-center px-3">
          {match.status === 'finished' ? (
            <div className="text-xl font-bold text-white">
              {match.home_score} <span className="text-slate-500 text-base">-</span> {match.away_score}
            </div>
          ) : (
            <div>
              <div className="text-emerald-400 font-bold text-sm">VS</div>
              {isUpcoming && (
                <div className="mt-0.5">
                  <Countdown kickoffTime={match.kickoff_time} />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="text-right">
            <p className="font-bold text-white text-sm">{match.away_team}</p>
            <p className="text-xs text-slate-500 uppercase">{match.away_team_code}</p>
          </div>
          <TeamLogo teamName={match.away_team} apiFlagOrUrl={match.away_team_flag} size={36} />
        </div>
      </div>

      {/* Status */}
      <div className="mt-3">
        {match.status === 'finished' ? (
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-700 text-slate-300">จบการแข่งขัน</span>
            {myPrediction && (
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs font-semibold',
                myPrediction.is_exact ? 'badge-exact' : myPrediction.is_correct_result ? 'badge-correct' : 'badge-miss'
              )}>
                {myPrediction.is_exact ? 'ถูกสกอร์ +3' : myPrediction.is_correct_result ? 'ผลถูก +1' : 'ผิด 0'} 
              </span>
            )}
          </div>
        ) : isLocked ? (
          <div className="flex items-center gap-1.5 text-xs text-amber-400">
            <Lock className="w-3 h-3" />
            <span>ปิดรับคำทาย</span>
          </div>
        ) : (
          <div>
            {user && (myPrediction && !editing) ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-400">
                  คำทายของคุณ: {myPrediction.home_score_pred} - {myPrediction.away_score_pred}
                </span>
                <button onClick={() => setEditing(true)} className="text-xs text-slate-400 hover:text-white underline">แก้ไข</button>
              </div>
            ) : user ? (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-400">ทายสกอร์:</span>
                <ScoreInput value={homeScore} onChange={setHomeScore} />
                <span className="text-slate-500">-</span>
                <ScoreInput value={awayScore} onChange={setAwayScore} />
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all disabled:opacity-50"
                >
                  {submitting ? '...' : 'บันทึก'}
                </button>
                {editing && (
                  <button onClick={() => setEditing(false)} className="text-xs text-slate-400 hover:text-white">ยกเลิก</button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                <Clock className="w-3 h-3" />
                <span>เข้าสู่ระบบเพื่อทาย</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Score Distribution */}
      {showScoreDistribution && scoreDist.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/5">
          <p className="text-xs text-slate-400 mb-2 font-medium">% สกอร์ที่ทาย</p>
          <div className="flex flex-wrap gap-1.5">
            {scoreDist.map((s) => (
              <div
                key={`${s.home}-${s.away}`}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/8"
              >
                <span className="text-xs font-bold text-white">{s.home}-{s.away}</span>
                <span className="text-xs text-emerald-400 font-medium">{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center">
      <button onClick={() => onChange(Math.max(0, value - 1))} className="w-6 h-6 rounded-l bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all">-</button>
      <span className="w-8 text-center text-white font-bold text-sm bg-white/5 h-6 flex items-center justify-center">{value}</span>
      <button onClick={() => onChange(Math.min(30, value + 1))} className="w-6 h-6 rounded-r bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all">+</button>
    </div>
  );
}
