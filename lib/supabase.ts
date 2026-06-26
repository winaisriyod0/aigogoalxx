import { createClient } from '@supabase/supabase-js'

// ดึงค่ารองรับทั้งโหมด Node.js (Localhost) และ Edge Runtime (Cloudflare Workers)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables!")
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  username: string | null;
  province: string;
  country: string;
  email: string | null;
  is_ai: boolean;
  is_banned: boolean;
  total_points: number;
  created_at: string;
  updated_at: string;
};

export type Match = {
  id: string;
  external_id: string | null;
  home_team: string;
  away_team: string;
  home_team_code: string;
  away_team_code: string;
  home_team_flag: string;
  away_team_flag: string;
  kickoff_time: string;
  stage: string;
  group_name: string | null;
  home_score: number | null;
  away_score: number | null;
  status: 'scheduled' | 'live' | 'finished' | 'postponed';
  lot_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Prediction = {
  id: string;
  user_id: string;
  match_id: string;
  home_score_pred: number;
  away_score_pred: number;
  points: number | null;
  is_exact: boolean | null;
  is_correct_result: boolean | null;
  created_at: string;
  updated_at: string;
};

export type AIPrediction = {
  id: string;
  match_id: string;
  ai_id: 'gemini' | 'deepseek' | 'claude';
  home_score_pred: number | null;
  away_score_pred: number | null;
  headline: string | null;
  analysis: string | null;
  scenario: string | null;
  full_text: string | null;
  lot_id: string | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
};

export type UserRole = {
  id: string;
  user_id: string;
  role: 'admin' | 'player';
};

export type Settings = {
  id: string;
  key: string;
  value: string | null;
};
