'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Save, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type SettingsMap = Record<string, string>;

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('settings').select('key, value').then(({ data }) => {
      const map: SettingsMap = {};
      (data ?? []).forEach((s: { key: string; value: string | null }) => {
        map[s.key] = s.value ?? '';
      });
      setSettings(map);
      setLoading(false);
    });
  }, []);

  const saveKey = async (key: string) => {
    setSaving(key);
    const { error } = await supabase.from('settings').upsert({
      key,
      value: settings[key] ?? '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });
    if (error) { toast.error(error.message); }
    else { toast.success('บันทึกเรียบร้อย'); }
    setSaving(null);
  };

  const update = (key: string, v: string) => setSettings((s) => ({ ...s, [key]: v }));

  const resetLeaderboard = async () => {
    if (!confirm('รีเซตคะแนนทั้งหมด? ไม่สามารถยกเลิกได้')) return;
    const { error } = await supabase.from('profiles').update({ total_points: 0 });
    if (error) { toast.error(error.message); return; }
    const { error: e2 } = await supabase.from('predictions').update({ points: null, is_exact: null, is_correct_result: null });
    toast.success('รีเซตคะแนนเรียบร้อย');
  };

  if (loading) return <div className="text-center py-12 text-slate-400">กำลังโหลด...</div>;

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-6 uppercase tracking-wide">SETTINGS</h1>

      <div className="space-y-5 max-w-2xl">
        {/* Account info */}
        <Section title="บัญชีของคุณ">
          <p className="text-sm font-bold text-white uppercase tracking-wide">{user?.email}</p>
        </Section>

        {/* Affiliate Link */}
        <Section title="AFFILIATE LINK (ปุ่มสนับสนุนเว็บ)" desc="ลิงก์ที่จะแสดงได้ปุ่มสนับสนุนในหน้าแรก เว้นว่างเพื่อซ่อน">
          <input
            value={settings.affiliate_link ?? ''}
            onChange={(e) => update('affiliate_link', e.target.value)}
            placeholder="https://..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
          />
          <textarea
            value={settings.affiliate_text ?? ''}
            onChange={(e) => update('affiliate_text', e.target.value)}
            placeholder="ข้อความในปุ่มสนับสนุน"
            rows={2}
            className="w-full mt-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all resize-none"
          />
          <SaveButton onClick={() => { saveKey('affiliate_link'); saveKey('affiliate_text'); }} saving={saving === 'affiliate_link'} />
        </Section>

        {/* Weekly Prize */}
        <Section title={`ข้อความ "รางวัล TOP เทพเซียน 3 อันดับ – ${settings.leaderboard_title ?? 'Season 1'}"`} desc="แสดงที่หน้าแรกของเว็บฟุตบอล ต่อจากผู้โชคดีประจำสัปดาห์">
          <textarea
            value={settings.weekly_prize ?? ''}
            onChange={(e) => update('weekly_prize', e.target.value)}
            placeholder="ข้อความรางวัล"
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all resize-none"
          />
          <SaveButton onClick={() => saveKey('weekly_prize')} saving={saving === 'weekly_prize'} />
        </Section>

        {/* Weekly Winner */}
        <Section title="ข้อความ ผู้โชคดีสัปดาห์ล่าสุด" desc="แสดงที่หน้าแรกของเว็บฟุตบอล">
          <textarea
            value={settings.weekly_winner ?? ''}
            onChange={(e) => update('weekly_winner', e.target.value)}
            placeholder="ชื่อผู้โชคดีและรางวัล"
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all resize-none"
          />
          <SaveButton onClick={() => saveKey('weekly_winner')} saving={saving === 'weekly_winner'} />
        </Section>

        {/* Leaderboard Title */}
        <Section title="ชื่อตารางคะแนน" desc="เช่น Season 1, Season 2 – จะแสดงในหน้า Leaderboard และหน้าแรก">
          <input
            value={settings.leaderboard_title ?? ''}
            onChange={(e) => update('leaderboard_title', e.target.value)}
            placeholder="Season 1"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
          />
          <SaveButton onClick={() => saveKey('leaderboard_title')} saving={saving === 'leaderboard_title'} />
        </Section>

        {/* Reset Scores */}
        <Section title="รีเซตคะแนน" desc="ล้างคะแนนทั้งหมดกลับเป็น 0 (ใช้เมื่อเริ่ม Season ใหม่)">
          <button
            onClick={resetLeaderboard}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/30 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            รีเซตคะแนนทั้งหมด
          </button>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl border border-white/8 p-5 space-y-3">
      <div>
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold transition-all disabled:opacity-50"
    >
      <Save className="w-3.5 h-3.5" />
      {saving ? 'กำลังบันทึก...' : 'บันทึก'}
    </button>
  );
}
