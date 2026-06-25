'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentAndFinishedLots } from '@/lib/timeGap';
import type { Match, AIPrediction, Profile } from '@/lib/supabase';
import Header from '@/components/Header';
import MatchCard from '@/components/MatchCard';
import AIColumn from '@/components/AIColumn';
import TeamLogo from '@/components/TeamLogo';
import { Trophy, Heart, Gift, Users, Clock, TrendingUp } from 'lucide-react';
import { formatTimeTH, formatDateTH } from '@/lib/utils';
import { cn } from '@/lib/utils';

type Settings = Record<string, string>;

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [aiPredictions, setAiPredictions] = useState<AIPrediction[]>([]);
  const [aiPredictionsFinished, setAiPredictionsFinished] = useState<AIPrediction[]>([]);
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .order('kickoff_time', { ascending: true });

      const { data: aiData } = await supabase
        .from('ai_predictions')
        .select('*')
        .eq('is_current', true);

      const { data: aiFinished } = await supabase
        .from('ai_predictions')
        .select('*')
        .eq('is_current', false)
        .order('updated_at', { ascending: false })
        .limit(9);

      const { data: lbData } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_banned', false)
        .order('total_points', { ascending: false })
        .limit(10);

      const { data: settingsData } = await supabase
        .from('settings')
        .select('key, value');

      setMatches(matchData ?? []);
      setAiPredictions(aiData ?? []);
      setAiPredictionsFinished(aiFinished ?? []);
      setLeaderboard(lbData ?? []);

      const settingsMap: Settings = {};
      settingsData?.forEach((s) => { if (s.key && s.value) settingsMap[s.key] = s.value; });
      setSettings(settingsMap);
      setLoading(false);
    };
    load();
  }, []);

  const { upcoming, finished } = getCurrentAndFinishedLots(matches);
  const upcomingMatches = upcoming?.matches ?? [];
  const finishedMatches = finished?.matches ?? [];

  const aiByMatch = upcomingMatches.map((match) => ({
    match,
    gemini: aiPredictions.find((p) => p.match_id === match.id && p.ai_id === 'gemini'),
    deepseek: aiPredictions.find((p) => p.match_id === match.id && p.ai_id === 'deepseek'),
    claude: aiPredictions.find((p) => p.match_id === match.id && p.ai_id === 'claude'),
  }));

  const finishedAiByMatch = finishedMatches.map((match) => ({
    match,
    gemini: aiPredictionsFinished.find((p) => p.match_id === match.id && p.ai_id === 'gemini'),
    deepseek: aiPredictionsFinished.find((p) => p.match_id === match.id && p.ai_id === 'deepseek'),
    claude: aiPredictionsFinished.find((p) => p.match_id === match.id && p.ai_id === 'claude'),
  }));

  // "เริ่มทายเลย": go to /predict if logged in, else /auth
  const handleStartPredict = () => {
    if (!authLoading && user) {
      router.push('/predict');
    } else {
      router.push('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19]">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="hero-glow absolute inset-0 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-6">
            <Trophy className="w-4 h-4" />
            PREDICT TO WIN
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 leading-tight">
            ทายผล <span className="text-emerald-400">ฟุตบอลโลก</span>
            <br />
            <span className="text-yellow-400">สนุกได้ทุกแมตช์</span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto mb-8">
            สมัครฟรี ทายสกอร์ก่อนเริ่มแข่ง 30 นาที สะสมคะแนน แล้วขึ้นไปท็อปของลีก
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleStartPredict}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition-all glow-green"
            >
              เริ่มทายเลย
            </button>
            <Link href="/leaderboard" className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-all border border-white/10">
              ดูตารางคะแนน
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: <TrendingUp className="w-5 h-5 text-emerald-400" />, title: 'ทายแม่น ได้แต้มเยอะ', desc: 'สกอร์ตรง +3 / ผลถูก +1' },
              { icon: <Clock className="w-5 h-5 text-yellow-400" />, title: 'ปิดรับก่อนแข่ง 30 นาที', desc: 'ยุติธรรมกับทุกคน' },
              { icon: <Trophy className="w-5 h-5 text-yellow-400" />, title: 'ลุ้นแชมป์ลีก', desc: 'ตารางคะแนนอัปเดตโดยอัตโนมัติ' },
            ].map((f, i) => (
              <div key={i} className="glass rounded-xl border border-white/8 p-4 flex items-start gap-3 card-hover">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{f.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-12">

        {/* Upcoming Matches */}
        {upcomingMatches.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              แมตช์ที่กำลังจะมา
            </h2>
            <div className="space-y-3">
              {upcomingMatches.map((match) => (
                <MatchCard key={match.id} match={match} showScoreDistribution />
              ))}
            </div>
          </section>
        )}

        {/* AI Predictions - Upcoming */}
        {aiByMatch.some((m) => m.gemini || m.deepseek || m.claude) && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-emerald-400">🤖</span>
              AI ทำนายผล
            </h2>
            <div className="space-y-6">
              {aiByMatch.map(({ match, gemini, deepseek, claude }) => (
                (gemini || deepseek || claude) ? (
                  <div key={match.id} className="glass rounded-xl border border-white/8 p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <TeamLogo teamName={match.home_team} apiFlagOrUrl={match.home_team_flag} size={28} />
                      <div className="text-sm">
                        <span className="font-bold text-white">{match.home_team}</span>
                        <span className="text-slate-400 mx-2">VS</span>
                        <span className="font-bold text-white">{match.away_team}</span>
                        <TeamLogo teamName={match.away_team} apiFlagOrUrl={match.away_team_flag} size={28} className="ml-2" />
                      </div>
                      <span className="ml-auto text-xs text-slate-500">{formatDateTH(match.kickoff_time)} {formatTimeTH(match.kickoff_time)}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {gemini && <AIColumn prediction={gemini} />}
                      {deepseek && <AIColumn prediction={deepseek} />}
                      {claude && <AIColumn prediction={claude} />}
                    </div>
                  </div>
                ) : null
              ))}
            </div>
          </section>
        )}

        {/* AI Predictions - Finished */}
        {finishedAiByMatch.some((m) => m.gemini || m.deepseek || m.claude) && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-yellow-400">⏱</span>
              AI ทำนายผลที่จบลงล่าสุด
              {finished && (
                <span className="text-xs text-slate-500 font-normal">
                  ({formatDateTH(finished.matches[0]?.kickoff_time ?? '')})
                </span>
              )}
            </h2>
            <div className="space-y-6">
              {finishedAiByMatch.map(({ match, gemini, deepseek, claude }) => (
                (gemini || deepseek || claude) ? (
                  <div key={match.id} className="glass rounded-xl border border-white/8 p-4">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <TeamLogo teamName={match.home_team} apiFlagOrUrl={match.home_team_flag} size={28} />
                      <div className="text-sm">
                        <span className="font-bold text-white">{match.home_team}</span>
                        <span className={cn(
                          'mx-2 font-black text-base',
                          match.status === 'finished' ? 'text-emerald-400' : 'text-slate-400'
                        )}>
                          {match.status === 'finished' ? `${match.home_score} - ${match.away_score}` : 'VS'}
                        </span>
                        <span className="font-bold text-white">{match.away_team}</span>
                        <TeamLogo teamName={match.away_team} apiFlagOrUrl={match.away_team_flag} size={28} className="ml-2" />
                      </div>
                      {match.status === 'finished' && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs">จบแล้ว</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {gemini && <AIColumn prediction={gemini} matchStatus={match.status} actualHome={match.home_score} actualAway={match.away_score} />}
                      {deepseek && <AIColumn prediction={deepseek} matchStatus={match.status} actualHome={match.home_score} actualAway={match.away_score} />}
                      {claude && <AIColumn prediction={claude} matchStatus={match.status} actualHome={match.home_score} actualAway={match.away_score} />}
                    </div>
                  </div>
                ) : null
              ))}
            </div>
          </section>
        )}

        {/* Prize & Winner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass rounded-xl border border-yellow-500/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-5 h-5 text-yellow-400" />
              <h3 className="font-bold text-white">รางวัลประจำสัปดาห์</h3>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              {settings.weekly_prize || 'ยังไม่มีรางวัลประจำสัปดาห์นี้'}
            </p>
          </div>
          <div className="glass rounded-xl border border-emerald-500/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <h3 className="font-bold text-white">ผู้โชคดีสัปดาห์ล่าสุด</h3>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              {settings.weekly_winner || 'ยังไม่มีผู้โชคดี'}
            </p>
          </div>
        </div>

        {/* Affiliate / Support */}
        <div className="glass rounded-xl border border-pink-500/20 p-6 text-center">
          <Heart className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <h3 className="font-bold text-white text-lg mb-2">สนับสนุนเว็บ</h3>
          <p className="text-slate-400 text-sm mb-4">
            {settings.affiliate_text || 'ช่วยสนับสนุนเว็บด้วยการสมัครผ่านลิงก์ของเรา! รับ 1 Support point'}
          </p>
          {settings.affiliate_link ? (
            <a
              href={settings.affiliate_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-semibold text-sm transition-all"
            >
              <Heart className="w-4 h-4" />
              เข้าสู่ระบบเพื่อสนับสนุน
            </a>
          ) : (
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-500 font-semibold text-sm cursor-default">
              <Heart className="w-4 h-4" />
              เข้าสู่ระบบเพื่อสนับสนุน
            </span>
          )}
        </div>

        {/* Top 10 Leaderboard */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              ท็อป 10 ผู้เล่น
              <span className="text-sm text-slate-400 font-normal">
                — {settings.leaderboard_title || 'Season 1'}
              </span>
            </h2>
            <Link href="/leaderboard" className="text-sm text-emerald-400 hover:text-emerald-300 transition-all">
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="glass rounded-xl border border-white/8 overflow-hidden">
            {leaderboard.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">ยังไม่มีผู้เล่น</div>
            ) : (
              <div className="divide-y divide-white/5">
                {leaderboard.map((player, idx) => (
                  <Link
                    key={player.id}
                    href={`/profile/${player.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-all group"
                  >
                    <RankBadge rank={idx + 1} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'font-semibold text-sm truncate',
                          player.is_ai ? 'text-blue-400' : 'text-white'
                        )}>
                          {player.username || `${player.first_name} ${player.last_name}`}
                        </span>
                        {player.is_ai && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">AI</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{player.province}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-400 text-sm">{player.total_points} <span className="text-xs text-slate-400">pts</span></p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center">
        <p className="text-slate-500 text-sm">© 2026 AI Go Goal · ทายผลฟุตบอลโลก</p>
      </footer>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <div className="w-7 h-7 rounded-full bg-yellow-400/20 border border-yellow-400/50 flex items-center justify-center text-yellow-400 font-black text-xs">1</div>;
  if (rank === 2) return <div className="w-7 h-7 rounded-full bg-slate-400/20 border border-slate-400/50 flex items-center justify-center text-slate-300 font-black text-xs">2</div>;
  if (rank === 3) return <div className="w-7 h-7 rounded-full bg-amber-700/20 border border-amber-700/50 flex items-center justify-center text-amber-600 font-black text-xs">3</div>;
  return <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 font-bold text-xs">{rank}</div>;
}
