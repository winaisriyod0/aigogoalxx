'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Match, AIPrediction } from '@/lib/supabase';
import { toast } from 'sonner';
import { Sparkles, RefreshCw, Edit3, Save, X } from 'lucide-react';
import TeamLogo from '@/components/TeamLogo';
import { formatDateTH, formatTimeTH } from '@/lib/utils';
import { cn } from '@/lib/utils';

const AI_IDS = ['gemini', 'deepseek', 'claude'] as const;

const AI_CONFIG = {
  gemini: { label: 'Ai-Gemini', color: 'text-blue-400', apiLabel: 'Gemini', profileId: '11111111-1111-1111-1111-111111111111' },
  deepseek: { label: 'Ai-Deepseek', color: 'text-purple-400', apiLabel: 'DeepSeek/Groq', profileId: '22222222-2222-2222-2222-222222222222' },
  claude: { label: 'Ai-Claude', color: 'text-orange-400', apiLabel: 'Claude/OpenRouter', profileId: '33333333-3333-3333-3333-333333333333' },
};

export default function AdminAIPredictionsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [aiPreds, setAiPreds] = useState<AIPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AIPrediction>>({});

  const load = async () => {
    const [{ data: m }, { data: ai }] = await Promise.all([
      supabase.from('matches').select('*').in('status', ['scheduled']).order('kickoff_time', { ascending: true }).limit(20),
      supabase.from('ai_predictions').select('*').eq('is_current', true),
    ]);
    setMatches(m ?? []);
    setAiPreds(ai ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generateForMatch = async (match: Match, aiId: typeof AI_IDS[number]) => {
    const key = `${match.id}-${aiId}`;
    setGenerating(key);
    try {
        let result: { score: string; headline: string; analysis: string; scenario: string } | null = null;

      // Call edge function to keep API keys server-side
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const res = await fetch(`${supabaseUrl}/functions/v1/ai-predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          aiId,
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          stage: match.stage,
          group: match.group_name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Edge function error');
      result = data;

      if (!result) throw new Error('ไม่ได้รับข้อมูลจาก AI');

      const [home, away] = (result.score ?? '0-0').split('-').map(Number);

      const { error } = await supabase.from('ai_predictions').upsert({
        match_id: match.id,
        ai_id: aiId,
        home_score_pred: isNaN(home) ? 1 : home,
        away_score_pred: isNaN(away) ? 0 : away,
        headline: result.headline,
        analysis: result.analysis,
        scenario: result.scenario,
        is_current: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'match_id,ai_id' });

      if (error) throw error;

      // Also write to predictions table so AI participates in the main leaderboard
      await supabase.rpc('upsert_ai_prediction', {
        p_ai_id: aiId,
        p_match_id: match.id,
        p_home: isNaN(home) ? 1 : home,
        p_away: isNaN(away) ? 0 : away,
      });
      toast.success(`${AI_CONFIG[aiId].label} ทำนายเรียบร้อย`);
      await load();
    } catch (err: any) {
      toast.error(`${AI_CONFIG[aiId].label}: ${err.message}`);
    } finally {
      setGenerating(null);
    }
  };

  const generateAll = async (match: Match) => {
    for (const aiId of AI_IDS) {
      await generateForMatch(match, aiId);
    }
  };

  const startEdit = (pred: AIPrediction) => {
    setEditingId(pred.id);
    setEditForm(pred);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    // Find the current prediction being edited to get ai_id and match_id
    const pred = aiPreds.find((p) => p.id === editingId);
    const { error } = await supabase.from('ai_predictions').update({
      home_score_pred: editForm.home_score_pred,
      away_score_pred: editForm.away_score_pred,
      headline: editForm.headline,
      analysis: editForm.analysis,
      scenario: editForm.scenario,
      updated_at: new Date().toISOString(),
    }).eq('id', editingId);
    if (error) { toast.error(error.message); return; }

    // Sync to predictions table
    if (pred && editForm.home_score_pred !== null && editForm.away_score_pred !== null) {
      await supabase.rpc('upsert_ai_prediction', {
        p_ai_id: pred.ai_id,
        p_match_id: pred.match_id,
        p_home: editForm.home_score_pred,
        p_away: editForm.away_score_pred,
      });
    }

    toast.success('บันทึกเรียบร้อย');
    setEditingId(null);
    await load();
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-6 uppercase tracking-wide">AI PREDICTIONS</h1>

      {loading ? (
        <div className="text-center py-12 text-slate-400">กำลังโหลด...</div>
      ) : matches.length === 0 ? (
        <div className="glass rounded-xl border border-white/8 p-8 text-center text-slate-400">ไม่มีแมตช์ที่เปิดรับ</div>
      ) : (
        <div className="space-y-6">
          {matches.map((match) => {
            const gemini = aiPreds.find((p) => p.match_id === match.id && p.ai_id === 'gemini');
            const deepseek = aiPreds.find((p) => p.match_id === match.id && p.ai_id === 'deepseek');
            const claude = aiPreds.find((p) => p.match_id === match.id && p.ai_id === 'claude');

            return (
              <div key={match.id} className="glass rounded-xl border border-white/8 p-5">
                {/* Match header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                      <TeamLogo teamName={match.home_team} apiFlagOrUrl={match.home_team_flag} size={20} /> {match.home_team} vs {match.away_team} <TeamLogo teamName={match.away_team} apiFlagOrUrl={match.away_team_flag} size={20} />
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {match.stage}{match.group_name ? ` · ${match.group_name}` : ''} · {formatDateTH(match.kickoff_time)} {formatTimeTH(match.kickoff_time)}
                    </p>
                  </div>
                  <button
                    onClick={() => generateAll(match)}
                    disabled={!!generating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    สร้างทั้งหมด
                  </button>
                </div>

                {/* AI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {([['gemini', gemini], ['deepseek', deepseek], ['claude', claude]] as const).map(([aiId, pred]) => {
                    const cfg = AI_CONFIG[aiId];
                    const isGenerating = generating === `${match.id}-${aiId}`;
                    const isEditing = editingId === pred?.id;

                    return (
                      <div key={aiId} className="glass rounded-xl border border-white/8 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className={cn('text-sm font-bold', cfg.color)}>{cfg.label}</p>
                          <div className="flex gap-1">
                            {pred && !isEditing && (
                              <button onClick={() => startEdit(pred)} className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-white transition-all">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => generateForMatch(match, aiId)}
                              disabled={!!generating}
                              className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-white transition-all disabled:opacity-50"
                            >
                              <RefreshCw className={cn('w-3.5 h-3.5', isGenerating && 'animate-spin')} />
                            </button>
                          </div>
                        </div>

                        {isGenerating ? (
                          <div className="text-xs text-slate-400 text-center py-4">กำลังวิเคราะห์...</div>
                        ) : isEditing ? (
                          <div className="space-y-2">
                            <div className="flex gap-2 items-center">
                              <label className="text-xs text-slate-400">สกอร์</label>
                              <input type="number" min="0" max="30" value={editForm.home_score_pred ?? 0}
                                onChange={(e) => setEditForm(f => ({...f, home_score_pred: +e.target.value}))}
                                className="w-10 bg-white/5 border border-white/10 rounded px-1 py-0.5 text-white text-xs text-center" />
                              <span className="text-slate-400">-</span>
                              <input type="number" min="0" max="30" value={editForm.away_score_pred ?? 0}
                                onChange={(e) => setEditForm(f => ({...f, away_score_pred: +e.target.value}))}
                                className="w-10 bg-white/5 border border-white/10 rounded px-1 py-0.5 text-white text-xs text-center" />
                            </div>
                            <textarea value={editForm.headline ?? ''} onChange={(e) => setEditForm(f => ({...f, headline: e.target.value}))}
                              placeholder="พาดหัว" rows={2}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500/50 resize-none" />
                            <textarea value={editForm.analysis ?? ''} onChange={(e) => setEditForm(f => ({...f, analysis: e.target.value}))}
                              placeholder="วิเคราะห์" rows={3}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500/50 resize-none" />
                            <textarea value={editForm.scenario ?? ''} onChange={(e) => setEditForm(f => ({...f, scenario: e.target.value}))}
                              placeholder="สถานการณ์" rows={2}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500/50 resize-none" />
                            <div className="flex gap-1.5">
                              <button onClick={saveEdit} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all">
                                <Save className="w-3 h-3" /> บันทึก
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : pred ? (
                          <div className="space-y-1.5">
                            <div className="text-center">
                              <span className={cn('text-2xl font-black', cfg.color)}>{pred.home_score_pred ?? '?'} - {pred.away_score_pred ?? '?'}</span>
                            </div>
                            {pred.headline && <p className="text-xs text-white/80 font-medium">{pred.headline}</p>}
                            {pred.analysis && <p className="text-xs text-slate-400 line-clamp-2">{pred.analysis}</p>}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 text-center py-4">ยังไม่มีข้อมูล</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


