'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Calendar, MessageSquare, Bot } from 'lucide-react';

type Stats = {
  totalPlayers: number;
  openMatches: number;
  todayPredictions: number;
  todayAiPredictions: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalPlayers: 0, openMatches: 0, todayPredictions: 0, todayAiPredictions: 0 });

  useEffect(() => {
    const load = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const [
        { count: players },
        { count: openMatches },
        { count: todayPreds },
        { count: aiPreds },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', false).eq('is_ai', false),
        supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
        supabase.from('predictions').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
        supabase.from('ai_predictions').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      ]);

      setStats({
        totalPlayers: players ?? 0,
        openMatches: openMatches ?? 0,
        todayPredictions: todayPreds ?? 0,
        todayAiPredictions: aiPreds ?? 0,
      });
    };
    load();
  }, []);

  const cards = [
    { icon: <Users className="w-6 h-6 text-emerald-400" />, label: 'สมาชิกทั้งหมด', value: stats.totalPlayers },
    { icon: <Calendar className="w-6 h-6 text-blue-400" />, label: 'แมตช์ที่เปิดทาย', value: stats.openMatches },
    { icon: <MessageSquare className="w-6 h-6 text-yellow-400" />, label: 'คำทายวันนี้', value: stats.todayPredictions },
    { icon: <Bot className="w-6 h-6 text-purple-400" />, label: 'AI PREDICTION วันนี้', value: stats.todayAiPredictions },
  ];

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-6 uppercase tracking-wide">DASHBOARD</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-2xl border border-white/8 p-5">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0">
                {c.icon}
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium mb-1">{c.label}</p>
                <p className="text-3xl font-black text-white">{c.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-xl border border-white/8 p-5">
        <p className="text-slate-400 text-sm">ใช้เมนูด้านซ้ายเพื่อจัดการทีม, แมตช์, คำทำนาย AI, ผลการแข่งขัน และผู้ใช้</p>
      </div>
    </div>
  );
}
