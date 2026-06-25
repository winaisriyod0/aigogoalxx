'use client';
import { useEffect, useState } from 'react';
import { getCountdownParts } from '@/lib/utils';

export default function Countdown({ kickoffTime }: { kickoffTime: string }) {
  const [parts, setParts] = useState(getCountdownParts(kickoffTime));

  useEffect(() => {
    const interval = setInterval(() => {
      setParts(getCountdownParts(kickoffTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [kickoffTime]);

  if (parts.total <= 0) return null;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <span className="font-mono font-bold text-yellow-400 blink tracking-wider">
      {pad(parts.h)}:{pad(parts.m)}:{pad(parts.s)}
    </span>
  );
}
