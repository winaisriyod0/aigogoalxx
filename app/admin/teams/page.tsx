'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Check, X, Upload } from 'lucide-react';
import Image from 'next/image';

type Team = {
  id: string;
  name: string;
  code: string;
  flag: string;
  logo_url: string | null;
};

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [form, setForm] = useState({ name: '', code: '', flag: '' });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; code: string; flag: string }>({ name: '', code: '', flag: '' });
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  const load = () =>
    supabase.from('teams').select('*').order('name').then(({ data }) => setTeams((data ?? []) as Team[]));

  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('teams').insert({ name: form.name, code: form.code, flag: form.flag });
    if (error) toast.error(error.message);
    else { toast.success('เพิ่มทีมเรียบร้อย'); setForm({ name: '', code: '', flag: '' }); load(); }
    setSaving(false);
  };

  const startEdit = (t: Team) => {
    setEditId(t.id);
    setEditForm({ name: t.name, code: t.code, flag: t.flag });
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase.from('teams').update(editForm).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('แก้ไขเรียบร้อย'); setEditId(null); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm('ลบทีมนี้?')) return;
    await supabase.from('teams').delete().eq('id', id);
    load();
    toast.success('ลบทีมเรียบร้อย');
  };

  const triggerUpload = (teamId: string) => {
    setUploadTargetId(teamId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;
    setUploading(uploadTargetId);
    try {
      const ext = file.name.split('.').pop();
      const path = `${uploadTargetId}.${ext}`;
      const { error: upErr } = await supabase.storage.from('team-logos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('team-logos').getPublicUrl(path);
      const { error: dbErr } = await supabase.from('teams').update({ logo_url: publicUrl }).eq('id', uploadTargetId);
      if (dbErr) throw dbErr;
      toast.success('อัพโหลดโลโก้เรียบร้อย');
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(null);
      setUploadTargetId(null);
      e.target.value = '';
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-6 uppercase tracking-wide">TEAMS</h1>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Add form */}
      <form onSubmit={add} className="glass rounded-xl border border-white/8 p-5 mb-6">
        <h2 className="text-sm font-bold text-white mb-3">เพิ่มทีมใหม่</h2>
        <div className="flex flex-wrap gap-3 items-end">
          {[
            { label: 'ชื่อทีม', key: 'name', placeholder: 'Brazil', required: true },
            { label: 'รหัส 3 ตัว', key: 'code', placeholder: 'BRA', required: true },
            { label: 'ธง (emoji)', key: 'flag', placeholder: '🇧🇷', required: false },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
              <input
                value={(form as any)[f.key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                required={f.required}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-all w-36"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold transition-all disabled:opacity-50 self-end"
          >
            <Plus className="w-4 h-4" />
            เพิ่ม
          </button>
        </div>
      </form>

      <div className="glass rounded-xl border border-white/8 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/5 grid grid-cols-[40px_44px_1fr_80px_auto] gap-3 text-xs text-slate-500 uppercase tracking-wider">
          <span>โลโก้</span><span>ธง</span><span>ชื่อ / รหัส</span><span></span><span></span>
        </div>
        <div className="divide-y divide-white/5 max-h-[540px] overflow-y-auto scrollbar-thin">
          {teams.length === 0 ? (
            <div className="p-8 text-center text-slate-400">ยังไม่มีทีม</div>
          ) : (
            teams.map((t) => (
              <div key={t.id} className="grid grid-cols-[40px_44px_1fr_80px_auto] gap-3 items-center px-4 py-3 hover:bg-white/3 transition-all">
                {/* Logo */}
                <div className="relative w-8 h-8 flex-shrink-0">
                  {t.logo_url ? (
                    <Image src={t.logo_url} alt={t.name} width={32} height={32} className="w-8 h-8 object-contain rounded" unoptimized />
                  ) : (
                    <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-slate-600">
                      <Upload className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {/* Flag */}
                {editId === t.id ? (
                  <input
                    value={editForm.flag}
                    onChange={(e) => setEditForm((f) => ({ ...f, flag: e.target.value }))}
                    className="w-10 bg-white/5 border border-white/20 rounded px-1 py-0.5 text-center text-lg focus:outline-none"
                  />
                ) : (
                  <span className="text-2xl">{t.flag}</span>
                )}

                {/* Name / Code */}
                {editId === t.id ? (
                  <div className="flex gap-2">
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="flex-1 bg-white/5 border border-white/20 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                    />
                    <input
                      value={editForm.code}
                      onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))}
                      className="w-16 bg-white/5 border border-white/20 rounded-lg px-2 py-1 text-white text-sm uppercase focus:outline-none focus:border-emerald-500/50"
                      maxLength={4}
                    />
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-slate-500 uppercase">{t.code}</p>
                  </div>
                )}

                {/* Upload logo button */}
                <button
                  onClick={() => triggerUpload(t.id)}
                  disabled={uploading === t.id}
                  title="อัพโหลดโลโก้"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 text-xs transition-all disabled:opacity-50"
                >
                  {uploading === t.id ? (
                    <span className="animate-spin">⟳</span>
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">โลโก้</span>
                </button>

                {/* Edit / Delete */}
                <div className="flex items-center gap-1">
                  {editId === t.id ? (
                    <>
                      <button onClick={() => saveEdit(t.id)} className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(t)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove(t.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
