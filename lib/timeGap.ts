import type { Match } from './supabase';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const LOT_CLOSE_MS = (1 * 60 + 55) * 60 * 1000; // 1h55m after last match

export type MatchLot = {
  lotId: string;
  matches: Match[];
  isFinished: boolean;
  lastMatchEndTime: Date;
};

export function groupMatchesIntoLots(matches: Match[]): MatchLot[] {
  if (!matches.length) return [];

  const sorted = [...matches].sort(
    (a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime()
  );

  const lots: MatchLot[] = [];
  let currentLot: Match[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].kickoff_time).getTime();
    const curr = new Date(sorted[i].kickoff_time).getTime();
    if (curr - prev > SIX_HOURS_MS) {
      lots.push(buildLot(currentLot));
      currentLot = [sorted[i]];
    } else {
      currentLot.push(sorted[i]);
    }
  }
  lots.push(buildLot(currentLot));
  return lots;
}

function buildLot(matches: Match[]): MatchLot {
  const lastMatch = matches[matches.length - 1];
  const lastKickoff = new Date(lastMatch.kickoff_time);
  const lastMatchEndTime = new Date(lastKickoff.getTime() + LOT_CLOSE_MS);
  const now = new Date();
  const isFinished = lastMatch.status === 'finished' && now > lastMatchEndTime;

  const lotId = matches
    .map((m) => m.id)
    .sort()
    .join('-');

  return { lotId, matches, isFinished, lastMatchEndTime };
}

export function getCurrentAndFinishedLots(matches: Match[]): {
  upcoming: MatchLot | null;
  finished: MatchLot | null;
} {
  const lots = groupMatchesIntoLots(matches);
  if (!lots.length) return { upcoming: null, finished: null };

  const now = new Date();

  // Find the first lot that hasn't fully finished yet (upcoming/current)
  let upcomingLot: MatchLot | null = null;
  let finishedLot: MatchLot | null = null;

  for (let i = 0; i < lots.length; i++) {
    const lot = lots[i];
    if (!lot.isFinished) {
      upcomingLot = lot;
      // The finished lot is the one just before this
      if (i > 0) finishedLot = lots[i - 1];
      break;
    }
  }

  // If all lots are finished, the last one is the most recent finished
  if (!upcomingLot && lots.length > 0) {
    finishedLot = lots[lots.length - 1];
  }

  return { upcoming: upcomingLot, finished: finishedLot };
}

export function getNextUpcomingMatch(matches: Match[]): Match | null {
  const now = new Date();
  const upcoming = matches
    .filter((m) => m.status === 'scheduled' && new Date(m.kickoff_time) > now)
    .sort((a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime());
  return upcoming[0] ?? null;
}
