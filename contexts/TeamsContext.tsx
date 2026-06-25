'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Team = {
  id: string;
  name: string;
  code: string;
  flag: string;
  logo_url: string | null;
};

type TeamsMap = Record<string, Team>; // keyed by name (lowercased)

const TeamsContext = createContext<TeamsMap>({});

export function TeamsProvider({ children }: { children: React.ReactNode }) {
  const [map, setMap] = useState<TeamsMap>({});

  useEffect(() => {
    supabase.from('teams').select('*').then(({ data }) => {
      const m: TeamsMap = {};
      (data ?? []).forEach((t: Team) => {
        m[t.name.toLowerCase()] = t;
      });
      setMap(m);
    });
  }, []);

  return <TeamsContext.Provider value={map}>{children}</TeamsContext.Provider>;
}

export function useTeams() {
  return useContext(TeamsContext);
}
