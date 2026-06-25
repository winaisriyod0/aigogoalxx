'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Gift, Save } from 'lucide-react';
import Link from 'next/link';

export default function AdminPrizesPage() {
  const [prize, setPrize] = useState('');
  const [winner, setWinner] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('settings').select('key, value').in('key', ['weekly_prize', 'weekly_winner']).then(({ data }) => {
      (data ?? []).forEach((s: { key: string; value: string | null }) => {
        if (s.key === 'weekly_prize') setPrize(s.value ?? '');
        if (s.key === 'weekly_winner') setWinner(s.value ?? '');
      });
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const updates = [
      supabase.from('settings').upsert({ key: 'weekly_prize', value: prize, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
      supabase.from('settings').upsert({ key: 'weekly_winner', value: winner, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
    ];
    const results = await Promise.all(updates);
    if (results.some((r) => r.error)) {
      toast.error('เกิดข้อผิดพลาด');
    } else {
      toast.success('บันทึกเรียบร้อย');
    }
    setSaving(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-6 uppercase tracking-wide">PRIZES</h1>
      <div className="max-w-2xl space-y-5">
        <div className="glass rounded-xl border border-white/8 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-yellow-400" />
            <h2 className="text-sm font-bold text-white">รางวัลประจำสัปดาห์</h2>
          </div>
          <textarea
            value={prize}
            onChange={(e) => setPrize(e.target.value)}
            placeholder="ระบุรายละเอียดรางวัล..."
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all resize-none"
          />
        </div>

        <div className="glass rounded-xl border border-white/8 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">ผู้โชคดีสัปดาห์ล่าสุด</h2>
          </div>
          <textarea
            value={winner}
            onChange={(e) => setWinner(e.target.value)}
            placeholder="ระบุชื่อผู้โชคดีและรางวัล..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all resize-none"
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>

        <div className="glass rounded-xl border border-white/8 p-4">
          <p className="text-xs text-slate-400">
            หมายเหตุ: สามารถแก้ไขรายละเอียดรางวัลได้ที่ <Link href="/admin/settings" className="text-emerald-400 hover:underline">Settings</Link> ด้วยเช่นกัน
          </p>
        </div>
      </div>
    </div>
  );
}
