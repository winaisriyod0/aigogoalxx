import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LEAGUE_ID = "4429";
const BASE = "https://www.thesportsdb.com/api/v1/json/3";

// WC 2026 event ID ranges — IDs are non-sequential across blocks
const WC_ID_RANGES: [number, number][] = [
  [2391729, 2391800], // Main group stage block
  [2461100, 2461200], // Secondary block (France/Iraq, Bosnia, Czechia, etc.)
];

function mapStatus(s: string): string {
  if (s === "FT" || s === "AET" || s === "PEN") return "finished";
  if (["1H","2H","HT","ET","BT","LIVE"].includes(s)) return "live";
  if (["PPD","CANC","ABD"].includes(s)) return "postponed";
  return "scheduled";
}

function padDate(d: Date): string {
  return [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, "0"),
    String(d.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function getCode(name: string): string {
  const special: Record<string, string> = {
    "United States": "USA", "USA": "USA", "South Korea": "KOR",
    "Korea Republic": "KOR", "Saudi Arabia": "KSA", "New Zealand": "NZL",
    "Costa Rica": "CRC", "El Salvador": "SLV", "Trinidad and Tobago": "TRI",
    "Bosnia and Herzegovina": "BIH", "Bosnia-Herzegovina": "BIH",
    "North Macedonia": "MKD", "Ivory Coast": "CIV", "Côte d'Ivoire": "CIV",
    "Congo DR": "COD", "DR Congo": "COD",
  };
  return special[name] ?? name.substring(0, 3).toUpperCase();
}

function normalizeEvent(e: any): any {
  const kickoffUTC = new Date(e.strTimestamp + "Z").toISOString();
  const homeScore = e.intHomeScore != null && e.intHomeScore !== "" ? Number(e.intHomeScore) : null;
  const awayScore = e.intAwayScore != null && e.intAwayScore !== "" ? Number(e.intAwayScore) : null;
  const st = mapStatus(e.strStatus ?? "NS");

  return {
    external_id: String(e.idEvent),
    home_team: e.strHomeTeam,
    away_team: e.strAwayTeam,
    home_team_code: getCode(e.strHomeTeam),
    away_team_code: getCode(e.strAwayTeam),
    home_team_flag: e.strHomeTeamBadge ?? "",
    away_team_flag: e.strAwayTeamBadge ?? "",
    kickoff_time: kickoffUTC,
    stage: e.intRound ? `Round ${e.intRound}` : "Group Stage",
    group_name: e.strGroup ? `Group ${e.strGroup}` : null,
    status: st,
    home_score: st === "finished" ? homeScore : null,
    away_score: st === "finished" ? awayScore : null,
  };
}

async function safeJson(url: string): Promise<any[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.events ?? data.results ?? []) as any[];
  } catch {
    return [];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    const nowUTC = new Date();
    const bkkMs = nowUTC.getTime() + 7 * 3600 * 1000;
    const bkkNow = new Date(bkkMs);

    const fromBKK = url.searchParams.get("from") ?? padDate(bkkNow);
    const toBKK   = url.searchParams.get("to")   ?? padDate(new Date(bkkMs + 86400000));

    // BKK date window → UTC: [fromBKK-1 day 17:00 → toBKK 16:59:59]
    const bkkFromStart = new Date(fromBKK + "T17:00:00Z").getTime() - 86400000;
    const bkkToEnd     = new Date(toBKK   + "T17:00:00Z").getTime() - 1;

    // UTC calendar dates spanned
    const utcDates = new Set<string>();
    const startDate = padDate(new Date(bkkFromStart));
    const endDate   = padDate(new Date(bkkToEnd));
    let curDate = startDate;
    while (curDate <= endDate) {
      utcDates.add(curDate);
      const next = new Date(curDate + "T00:00:00Z");
      next.setUTCDate(next.getUTCDate() + 1);
      curDate = padDate(next);
    }

    // Strategy 1: eventsday per UTC date
    const eventsFromDay: any[] = [];
    for (const d of utcDates) {
      const events = await safeJson(`${BASE}/eventsday.php?d=${d}&l=${LEAGUE_ID}`);
      eventsFromDay.push(...events);
    }

    const foundIds = new Set(eventsFromDay.map((e: any) => String(e.idEvent)));

    // Strategy 2: parallel scan all known WC ID ranges
    const idFetches: Promise<any[]>[] = [];
    for (const [rangeStart, rangeEnd] of WC_ID_RANGES) {
      for (let id = rangeStart; id <= rangeEnd; id++) {
        if (!foundIds.has(String(id))) {
          idFetches.push(safeJson(`${BASE}/lookupevent.php?id=${id}`));
        }
      }
    }
    const idResults = await Promise.all(idFetches);
    const eventsFromIds = idResults.flat();

    const allEvents = [...eventsFromDay, ...eventsFromIds];

    // Deduplicate
    const seen = new Set<string>();
    const deduped = allEvents.filter((e) => {
      if (!e?.idEvent) return false;
      if (seen.has(String(e.idEvent))) return false;
      seen.add(String(e.idEvent));
      return true;
    });

    // Filter to WC within BKK window
    const filtered = deduped.filter((e: any) => {
      if (e.idLeague !== LEAGUE_ID) return false;
      const ts = e.strTimestamp ? new Date(e.strTimestamp + "Z").getTime() : 0;
      return ts >= bkkFromStart && ts <= bkkToEnd;
    });

    filtered.sort((a: any, b: any) =>
      new Date(a.strTimestamp + "Z").getTime() - new Date(b.strTimestamp + "Z").getTime()
    );

    const normalized = filtered.map((e: any) => normalizeEvent(e));

    return new Response(
      JSON.stringify({ fixtures: normalized, total: normalized.length, fromBKK, toBKK }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
