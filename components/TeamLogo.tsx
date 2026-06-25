'use client';
import Image from 'next/image';
import { useTeams } from '@/contexts/TeamsContext';

type Props = {
  teamName: string;
  /** fallback: badge URL from API (TheSportsDB strHomeTeamBadge) or emoji */
  apiFlagOrUrl?: string;
  size?: number;
  className?: string;
};

/**
 * Shows team logo in priority order:
 * 1. admin-uploaded logo_url from teams table
 * 2. apiFlagOrUrl if it looks like a URL (TheSportsDB badge)
 * 3. flag emoji from teams table
 * 4. apiFlagOrUrl if it's an emoji
 * 5. two-letter code fallback
 */
export default function TeamLogo({ teamName, apiFlagOrUrl, size = 32, className = '' }: Props) {
  const teams = useTeams();
  const team = teams[teamName.toLowerCase()];

  const logoUrl = team?.logo_url ?? (apiFlagOrUrl?.startsWith('http') ? apiFlagOrUrl : null);
  const flagEmoji = team?.flag ?? (apiFlagOrUrl && !apiFlagOrUrl.startsWith('http') ? apiFlagOrUrl : '');
  const code = team?.code ?? teamName.substring(0, 3).toUpperCase();

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={teamName}
        width={size}
        height={size}
        className={`object-contain ${className}`}
        style={{ width: size, height: size }}
        unoptimized
      />
    );
  }

  if (flagEmoji) {
    return (
      <span
        className={`inline-flex items-center justify-center ${className}`}
        style={{ fontSize: size * 0.7, lineHeight: 1, width: size, height: size }}
        role="img"
        aria-label={teamName}
      >
        {flagEmoji}
      </span>
    );
  }

  // Fallback: 2-3 letter code box
  return (
    <span
      className={`inline-flex items-center justify-center rounded bg-white/10 text-slate-300 font-bold uppercase ${className}`}
      style={{ fontSize: size * 0.35, width: size, height: size }}
    >
      {code.substring(0, 3)}
    </span>
  );
}
