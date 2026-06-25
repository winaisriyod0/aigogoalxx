'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Trophy, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const PROVINCES = [
  'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร',
  'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท',
  'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง',
  'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม',
  'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส',
  'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์',
  'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา',
  'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์',
  'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน',
  'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง',
  'ราชบุรี', 'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย',
  'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ',
  'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี',
  'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย',
  'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์',
  'อุทัยธานี', 'อุบลราชธานี',
];

const COUNTRIES = [
  { code: 'TH', name: 'ไทย', en: 'Thailand' },
  { code: 'SG', name: 'สิงคโปร์', en: 'Singapore' },
  { code: 'MY', name: 'มาเลเซีย', en: 'Malaysia' },
  { code: 'ID', name: 'อินโดนีเซีย', en: 'Indonesia' },
  { code: 'PH', name: 'ฟิลิปปินส์', en: 'Philippines' },
  { code: 'VN', name: 'เวียดนาม', en: 'Vietnam' },
  { code: 'KH', name: 'กัมพูชา', en: 'Cambodia' },
  { code: 'MM', name: 'เมียนมาร์', en: 'Myanmar' },
  { code: 'LA', name: 'ลาว', en: 'Laos' },
  { code: 'BN', name: 'บรูไน', en: 'Brunei' },
  { code: 'IN', name: 'อินเดีย', en: 'India' },
];

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    username: '',
    province: 'กรุงเทพมหานคร',
    country: 'Thailand',
  });

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });
      if (error) throw error;
      toast.success('เข้าสู่ระบบสำเร็จ');
      router.push('/');
    } catch (err: any) {
      toast.error(err.message === 'Invalid login credentials' ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('กรุณากรอกชื่อและนามสกุล');
      return;
    }
    if (!form.username.trim()) {
      toast.error('กรุณากรอกชื่อที่ใช้แสดงในเว็บ');
      return;
    }
    setLoading(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const res = await fetch(`${supabaseUrl}/functions/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          username: form.username.trim(),
          province: form.province,
          country: form.country,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? 'สมัครสมาชิกไม่สำเร็จ');

      // Auto sign in after successful signup
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });
      if (signInError) {
        toast.success('สมัครสำเร็จ! กรุณาเข้าสู่ระบบ');
        setMode('signin');
      } else {
        toast.success('สมัครและเข้าสู่ระบบสำเร็จ!');
        router.push('/');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
      <div className="hero-glow absolute inset-0 pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white hover:text-emerald-400 transition-all mb-4">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">กลับหน้าหลัก</span>
          </Link>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xl font-black">
              <span className="text-white">AI GO</span>
              <span className="text-emerald-400"> GOAL</span>
            </span>
          </div>
          <p className="text-slate-400 text-sm">
            {mode === 'signin' ? 'ยินดีต้อนรับกลับมา' : 'สมัครสมาชิกฟรี'}
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl border border-white/8 p-6 shadow-2xl">
          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden bg-white/5 border border-white/8 mb-6">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                  mode === m
                    ? 'bg-emerald-500 text-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m === 'signin' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
              </button>
            ))}
          </div>

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <FormField label="อีเมล" type="email" value={form.email} onChange={(v) => update('email', v)} />
              <FormField label="รหัสผ่าน" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(v) => update('password', v)}
                suffix={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-white">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold transition-all glow-green"
              >
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="ชื่อ" value={form.firstName} onChange={(v) => update('firstName', v)} />
                <FormField label="นามสกุล" value={form.lastName} onChange={(v) => update('lastName', v)} />
              </div>
              <FormField label="ชื่อในเว็บ" value={form.username} onChange={(v) => update('username', v)} placeholder="ชื่อที่แสดงสาธารณะ" />
              <FormField label="อีเมล" type="email" value={form.email} onChange={(v) => update('email', v)} />
              <FormField label="รหัสผ่าน" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(v) => update('password', v)}
                suffix={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-white">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">จังหวัด</label>
                <select
                  value={form.province}
                  onChange={(e) => update('province', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
                >
                  {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">ประเทศ</label>
                <select
                  value={form.country}
                  onChange={(e) => update('country', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
                >
                  {COUNTRIES.map((c) => <option key={c.code} value={c.en}>{c.name}</option>)}
                </select>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold transition-all glow-green"
              >
                {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
              </button>
              <p className="text-xs text-slate-500 text-center">
                หลังสมัครแล้ว กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function FormField({
  label, value, onChange, type = 'text', placeholder, suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  suffix?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
      <div className="relative flex items-center">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all pr-9"
        />
        {suffix && <div className="absolute right-3">{suffix}</div>}
      </div>
    </div>
  );
}
