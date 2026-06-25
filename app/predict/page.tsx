'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Match } from '@/lib/supabase';
import Header from '@/components/Header';
import MatchCard from '@/components/MatchCard';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Target, Lock } from 'lucide-react';
import { formatDateTH } from '@/lib/utils';

export default function PredictPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('matches')
      .select('*')
      .in('status', ['scheduled', 'live'])
      .order('kickoff_time', { ascending: true })
      .then(({ data }) => {
        setMatches(data ?? []);
        setLoading(false);
      });
  }, []);

  // Group by date
  const byDate: Record<string, Match[]> = {};
  for (const m of matches) {
    const d = formatDateTH(m.kickoff_time);
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(m);
  }

  return (
    <div className="min-h-screen bg-[#0b0f19]">
      <Header />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl font-black text-white">ทายผล</h1>
          </div>
          <p className="text-slate-400 text-sm">ทายสกอร์แมตช์ที่กำลังจะมาถึง ปิดรับ 30 นาทีก่อนเริ่ม</p>
        </div>

        {!user && (
          <div className="glass rounded-xl border border-yellow-500/30 p-4 mb-6 flex items-center gap-3">
            <Lock className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">กรุณาเข้าสู่ระบบก่อนทาย</p>
              <Link href="/auth" className="text-xs text-emerald-400 hover:underline">เข้าสู่ระบบ / สมัครสมาชิก</Link>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-slate-400">กำลังโหลด...</div>
        ) : matches.length === 0 ? (
          <div className="glass rounded-xl border border-white/8 p-12 text-center text-slate-400">
            <p className="text-lg font-semibold mb-2">ไม่มีแมตช์ที่เปิดทาย</p>
            <p className="text-sm">ติดตามรายการแข่งขันต่อไปได้ที่หน้าหลัก</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(byDate).map(([date, dayMatches]) => (
              <div key={date}>
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">{date}</h2>
                <div className="space-y-3">
                  {dayMatches.map((match) => (
                    <MatchCard key={match.id} match={match} showScoreDistribution />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
