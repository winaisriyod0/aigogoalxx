'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Match } from '@/lib/supabase';
import { toast } from 'sonner';
import TeamLogo from '@/components/TeamLogo';
import { Plus, RefreshCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDateTH, formatTimeTH } from '@/lib/utils';
import { cn } from '@/lib/utils';

type MatchEx = Match & {
  home_handicap?: string | null;
  away_handicap?: string | null;
  odds_home?: number | null;
  odds_draw?: number | null;
  odds_away?: number | null;
};

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<MatchEx[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState<'yesterday' | 'today' | 'tomorrow' | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [odds, setOdds] = useState<Record<string, { home_handicap: string; away_handicap: string; odds_home: string; odds_draw: string; odds_away: string }>>({});

  const load = async () => {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .order('kickoff_time', { ascending: true });
    const list = (data ?? []) as MatchEx[];
    setMatches(list);
    const init: typeof odds = {};
    list.forEach((m) => {
      init[m.id] = {
        home_handicap: m.home_handicap ?? '',
        away_handicap: m.away_handicap ?? '',
        odds_home: m.odds_home != null ? String(m.odds_home) : '',
        odds_draw: m.odds_draw != null ? String(m.odds_draw) : '',
        odds_away: m.odds_away != null ? String(m.odds_away) : '',
      };
    });
    setOdds(init);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const fetchFromAPI = async (dayOffset: 'yesterday' | 'today' | 'tomorrow') => {
    setFetching(dayOffset);
    try {
      // BKK "day" = UTC window 17:00 prev-day → 16:59 same-day
      // We pass the BKK date directly; edge function handles window
      const nowUTC = new Date();
      const bkkMs = nowUTC.getTime() + 7 * 3600000;
      const offsetMs = dayOffset === 'yesterday' ? -86400000 : dayOffset === 'tomorrow' ? 86400000 : 0;
      const target = new Date(bkkMs + offsetMs);
      const fmt = (d: Date) => d.toISOString().split('T')[0];
      const dateStr = fmt(target);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const res = await fetch(
        `${supabaseUrl}/functions/v1/football-api?from=${dateStr}&to=${dateStr}`,
        { headers: { 'Authorization': `Bearer ${supabaseAnonKey}` } }
      );
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      const fixtures: any[] = json.fixtures ?? [];
      let inserted = 0;

      for (const f of fixtures) {
        const { error } = await supabase.from('matches').upsert(f, { onConflict: 'external_id' });
        if (!error) inserted++;

        // Sync teams — upsert by name (no duplicate)
        for (const [teamName, teamCode, teamFlag] of [
          [f.home_team, f.home_team_code, f.home_team_flag],
          [f.away_team, f.away_team_code, f.away_team_flag],
        ]) {
          const { data: existing } = await supabase
            .from('teams')
            .select('id')
            .eq('name', teamName)
            .maybeSingle();
          if (!existing) {
            await supabase.from('teams').insert({ name: teamName, code: teamCode, flag: teamFlag });
          }
        }
      }

      toast.success(`ดึงข้อมูล ${inserted} แมตช์ของ${
        dayOffset === 'yesterday' ? 'เมื่อวาน' : dayOffset === 'today' ? 'วันนี้' : 'พรุ่งนี้'
      }เรียบร้อย`);
      await load();
    } catch (err: any) {
      toast.error(`ดึงข้อมูลล้มเหลว: ${err.message}`);
    } finally {
      setFetching(null);
    }
  };

  const deleteMatch = async (id: string) => {
    if (!confirm('ลบแมตช์นี้?')) return;
    await supabase.from('matches').delete().eq('id', id);
    setMatches((m) => m.filter((x) => x.id !== id));
    toast.success('ลบแมตช์เรียบร้อย');
  };

  const saveOdds = async (matchId: string) => {
    const o = odds[matchId];
    if (!o) return;
    const { error } = await supabase.from('matches').update({
      home_handicap: o.home_handicap || null,
      away_handicap: o.away_handicap || null,
      odds_home: o.odds_home ? parseFloat(o.odds_home) : null,
      odds_draw: o.odds_draw ? parseFloat(o.odds_draw) : null,
      odds_away: o.odds_away ? parseFloat(o.odds_away) : null,
    }).eq('id', matchId);
    if (error) toast.error(error.message);
    else { toast.success('บันทึกอัตราต่อรองแล้ว'); setExpandedId(null); await load(); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-2xl font-black text-white uppercase tracking-wide">MATCHES</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchFromAPI('yesterday')}
            disabled={fetching !== null}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-500/20 border border-slate-500/30 text-slate-300 text-sm font-semibold hover:bg-slate-500/30 transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', fetching === 'yesterday' && 'animate-spin')} />
            {fetching === 'yesterday' ? 'กำลังดึง...' : 'เมื่อวาน'}
          </button>
          <button
            onClick={() => fetchFromAPI('today')}
            disabled={fetching !== null}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-semibold hover:bg-blue-500/30 transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', fetching === 'today' && 'animate-spin')} />
            {fetching === 'today' ? 'กำลังดึง...' : 'วันนี้'}
          </button>
          <button
            onClick={() => fetchFromAPI('tomorrow')}
            disabled={fetching !== null}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/30 transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', fetching === 'tomorrow' && 'animate-spin')} />
            {fetching === 'tomorrow' ? 'กำลังดึง...' : 'พรุ่งนี้'}
          </button>
        </div>
      </div>

      <div className="glass rounded-xl border border-white/8 overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-white/5 grid grid-cols-[1fr_1fr_150px_90px_36px_36px] gap-2 text-xs text-slate-500 uppercase tracking-wider">
          <span>บ้าน</span><span>เยือน</span><span>เวลา</span><span>สถานะ</span><span></span><span></span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">กำลังโหลด...</div>
        ) : matches.length === 0 ? (
          <div className="p-8 text-center text-slate-400">ยังไม่มีแมตช์ กดดึงข้อมูลจาก API</div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto scrollbar-thin">
            {matches.map((match) => (
              <div key={match.id}>
                <div className="grid grid-cols-[1fr_1fr_150px_90px_36px_36px] gap-2 items-center px-4 py-3 hover:bg-white/3 transition-all">
                  <span className="flex items-center gap-1.5 text-sm text-white font-medium truncate"><TeamLogo teamName={match.home_team} apiFlagOrUrl={match.home_team_flag} size={20} /> {match.home_team}</span>
                  <span className="flex items-center gap-1.5 text-sm text-white font-medium truncate"><TeamLogo teamName={match.away_team} apiFlagOrUrl={match.away_team_flag} size={20} /> {match.away_team}</span>
                  <div>
                    <span className="text-xs text-slate-400 block">{formatDateTH(match.kickoff_time)} {formatTimeTH(match.kickoff_time)}</span>
                    {match.home_handicap && (
                      <span className="text-xs text-amber-400">AH: {match.home_handicap} / {match.away_handicap}</span>
                    )}
                  </div>
                  <StatusBadge status={match.status} />
                  <button
                    onClick={() => setExpandedId(expandedId === match.id ? null : match.id)}
                    title="ตั้งค่า Asian Handicap"
                    className="p-1.5 rounded-lg hover:bg-amber-500/10 text-slate-500 hover:text-amber-400 transition-all"
                  >
                    {expandedId === match.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button onClick={() => deleteMatch(match.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Asian Handicap editor */}
                {expandedId === match.id && (
                  <div className="px-4 pb-4 bg-amber-500/5 border-t border-amber-500/10">
                    <p className="text-xs text-amber-400 font-semibold mb-3 mt-3">Asian Handicap / อัตราต่อรอง</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <OddsField
                        label="แฮนดิแคป (บ้าน)"
                        value={odds[match.id]?.home_handicap ?? ''}
                        onChange={(v) => setOdds((o) => ({ ...o, [match.id]: { ...o[match.id], home_handicap: v } }))}
                        placeholder="-0.5"
                      />
                      <OddsField
                        label="แฮนดิแคป (เยือน)"
                        value={odds[match.id]?.away_handicap ?? ''}
                        onChange={(v) => setOdds((o) => ({ ...o, [match.id]: { ...o[match.id], away_handicap: v } }))}
                        placeholder="+0.5"
                      />
                      <OddsField
                        label="ราคาบ้าน"
                        value={odds[match.id]?.odds_home ?? ''}
                        onChange={(v) => setOdds((o) => ({ ...o, [match.id]: { ...o[match.id], odds_home: v } }))}
                        placeholder="1.90"
                      />
                      <OddsField
                        label="ราคาเสมอ"
                        value={odds[match.id]?.odds_draw ?? ''}
                        onChange={(v) => setOdds((o) => ({ ...o, [match.id]: { ...o[match.id], odds_draw: v } }))}
                        placeholder="3.40"
                      />
                      <OddsField
                        label="ราคาเยือน"
                        value={odds[match.id]?.odds_away ?? ''}
                        onChange={(v) => setOdds((o) => ({ ...o, [match.id]: { ...o[match.id], odds_away: v } }))}
                        placeholder="2.10"
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => saveOdds(match.id)}
                        className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all"
                      >
                        บันทึก
                      </button>
                      <button
                        onClick={() => setExpandedId(null)}
                        className="px-4 py-1.5 rounded-lg glass border border-white/10 text-slate-400 hover:text-white text-xs transition-all"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AddMatchForm onAdded={load} />
    </div>
  );
}

function OddsField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500/50 transition-all"
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-500/20 text-blue-400',
    live: 'bg-emerald-500/20 text-emerald-400',
    finished: 'bg-slate-500/20 text-slate-400',
    postponed: 'bg-yellow-500/20 text-yellow-400',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', map[status] ?? 'bg-white/10 text-white')}>
      {status}
    </span>
  );
}

function AddMatchForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ home_team: '', away_team: '', home_flag: '', away_flag: '', kickoff: '', stage: 'Group Stage', group_name: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('matches').insert({
        home_team: form.home_team,
        away_team: form.away_team,
        home_team_code: form.home_team.substring(0, 3).toUpperCase(),
        away_team_code: form.away_team.substring(0, 3).toUpperCase(),
        home_team_flag: form.home_flag,
        away_team_flag: form.away_flag,
        kickoff_time: new Date(form.kickoff).toISOString(),
        stage: form.stage,
        group_name: form.group_name || null,
      });
      if (error) throw error;
      toast.success('เพิ่มแมตช์เรียบร้อย');
      setOpen(false);
      setForm({ home_team: '', away_team: '', home_flag: '', away_flag: '', kickoff: '', stage: 'Group Stage', group_name: '' });
      onAdded();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/30 transition-all">
        <Plus className="w-4 h-4" />
        เพิ่มแมตช์ด้วยตัวเอง
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-xl border border-white/8 p-5 space-y-4">
      <h3 className="text-sm font-bold text-white">เพิ่มแมตช์ใหม่</h3>
      <div className="grid grid-cols-2 gap-3">
        <Field label="ทีมเหย้า" value={form.home_team} onChange={(v) => setForm(f => ({...f, home_team: v}))} />
        <Field label="ทีมเยือน" value={form.away_team} onChange={(v) => setForm(f => ({...f, away_team: v}))} />
        <Field label="ธง (emoji) เหย้า" value={form.home_flag} onChange={(v) => setForm(f => ({...f, home_flag: v}))} placeholder="🏴" />
        <Field label="ธง (emoji) เยือน" value={form.away_flag} onChange={(v) => setForm(f => ({...f, away_flag: v}))} placeholder="🏴" />
      </div>
      <Field label="เวลาแข่ง (Local GMT+7)" value={form.kickoff} onChange={(v) => setForm(f => ({...f, kickoff: v}))} type="datetime-local" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="รอบ (Stage)" value={form.stage} onChange={(v) => setForm(f => ({...f, stage: v}))} />
        <Field label="กลุ่ม (ถ้ามี)" value={form.group_name} onChange={(v) => setForm(f => ({...f, group_name: v}))} placeholder="Group A" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold transition-all disabled:opacity-50">
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl glass border border-white/10 text-slate-400 hover:text-white text-sm transition-all">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-all" />
    </div>
  );
}
