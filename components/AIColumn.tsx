'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Bot, Sparkles } from 'lucide-react';
import type { AIPrediction } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Props = {
  prediction: AIPrediction;
  matchStatus?: string;
  actualHome?: number | null;
  actualAway?: number | null;
};

const AI_CONFIG = {
  gemini: {
    name: 'Ai-Gemini',
    color: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/5',
    glowColor: 'shadow-blue-500/10',
    icon: '✨',
  },
  deepseek: {
    name: 'Ai-Deepseek',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/5',
    glowColor: 'shadow-purple-500/10',
    icon: '🔍',
  },
  claude: {
    name: 'Ai-Claude',
    color: 'text-orange-400',
    borderColor: 'border-orange-500/30',
    bgColor: 'bg-orange-500/5',
    glowColor: 'shadow-orange-500/10',
    icon: '🧠',
  },
};

export default function AIColumn({ prediction, matchStatus, actualHome, actualAway }: Props) {
  const [expanded, setExpanded] = useState(false);
  const config = AI_CONFIG[prediction.ai_id as keyof typeof AI_CONFIG];

  const hasScore = prediction.home_score_pred !== null && prediction.away_score_pred !== null;
  const isFinished = matchStatus === 'finished';
  const isExact =
    isFinished &&
    actualHome !== null && actualAway !== null &&
    prediction.home_score_pred === actualHome &&
    prediction.away_score_pred === actualAway;
  const isCorrectResult =
    isFinished && !isExact &&
    actualHome != null && actualAway != null &&
    prediction.home_score_pred != null && prediction.away_score_pred != null &&
    (
      (prediction.home_score_pred > prediction.away_score_pred && actualHome > actualAway) ||
      (prediction.home_score_pred < prediction.away_score_pred && actualHome < actualAway) ||
      (prediction.home_score_pred === prediction.away_score_pred && actualHome === actualAway)
    );

  // Split headline into lines (newline-separated from AI prompt)
  const headlineLines = prediction.headline
    ? prediction.headline.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 2)
    : [];

  return (
    <div className={cn(
      'rounded-xl border p-4 flex flex-col gap-2 card-hover relative',
      config.bgColor, config.borderColor, `shadow-lg ${config.glowColor}`
    )}>
      {/* Status badge */}
      {isFinished && (
        <div className={cn(
          'absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold',
          isExact ? 'badge-exact' : isCorrectResult ? 'badge-correct' : 'badge-miss'
        )}>
          {isExact ? 'ถูกสกอร์' : isCorrectResult ? 'ผลถูก' : 'ผิด'}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{config.icon}</span>
        <div>
          <p className={cn('font-bold text-sm', config.color)}>{config.name}</p>
          <div className="flex items-center gap-1">
            <Bot className="w-2.5 h-2.5 text-slate-500" />
            <span className="text-xs text-slate-500">AI Analysis</span>
          </div>
        </div>
      </div>

      {/* Predicted Score */}
      {hasScore ? (
        <div className="flex items-center justify-center py-1.5 rounded-lg bg-white/5 border border-white/8">
          <span className={cn('text-2xl font-black', config.color)}>
            {prediction.home_score_pred} - {prediction.away_score_pred}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center py-1.5 rounded-lg bg-white/5 border border-white/8">
          <span className="text-lg text-slate-500 font-bold">? - ?</span>
        </div>
      )}

      {/* Headline — 2 lines, each truncated at 60 chars */}
      {headlineLines.length > 0 && (
        <div className="space-y-0.5">
          {headlineLines.map((line, i) => (
            <p
              key={i}
              className={cn(
                'text-xs font-medium leading-snug truncate',
                i === 0 ? 'text-white/90' : 'text-white/65'
              )}
              title={line}
            >
              {line}
            </p>
          ))}
        </div>
      )}

      {/* Read more */}
      {(prediction.analysis || prediction.scenario) && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className={cn('flex items-center gap-1 text-xs font-medium transition-all', config.color, 'hover:opacity-80')}
          >
            {expanded ? (
              <>อ่านน้อยลง <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>อ่านต่อ <ChevronDown className="w-3 h-3" /></>
            )}
          </button>
          {expanded && (
            <div className="mt-2 space-y-2">
              {prediction.analysis && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Match Analysis</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{prediction.analysis}</p>
                </div>
              )}
              {prediction.scenario && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Expected Scenario</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{prediction.scenario}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!prediction.headline && !hasScore && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 py-1">
          <Sparkles className="w-3 h-3" />
          <span>รอข้อมูลจาก AI...</span>
        </div>
      )}
    </div>
  );
}
