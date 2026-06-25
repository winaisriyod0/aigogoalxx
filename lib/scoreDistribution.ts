import type { Prediction } from './supabase';

export type ScoreCount = {
  home: number;
  away: number;
  count: number;
  pct: number;
};

export function getScoreDistribution(predictions: Prediction[]): ScoreCount[] {
  if (!predictions.length) return [];
  const map: Record<string, ScoreCount> = {};
  for (const p of predictions) {
    const key = `${p.home_score_pred}-${p.away_score_pred}`;
    if (!map[key]) {
      map[key] = { home: p.home_score_pred, away: p.away_score_pred, count: 0, pct: 0 };
    }
    map[key].count++;
  }
  const total = predictions.length;
  const arr = Object.values(map)
    .map((s) => ({ ...s, pct: Math.round((s.count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
  return arr.slice(0, 12);
}
