import { readJSON, writeJSON } from "./_store.mjs";

const SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard";

function scoreToNumber(display) {
  if (display === undefined || display === null) return null;

  const s = String(display).trim();

  if (!s || s === "--") return null;
  if (s === "E") return 0;

  const n = Number(s.replace("+", ""));

  return Number.isFinite(n) ? n : null;
}

async function fetchMasters() {
  const res = await fetch(SCOREBOARD, {
    headers: {
      "user-agent": "Summerland-Masters-Pool/1.0"
    }
  });

  if (!res.ok) {
    throw new Error(
      `ESPN scoreboard HTTP ${res.status}`
    );
  }

  const data = await res.json();

  const events = data.events || [];

  const event = events.find(e =>
    /masters/i.test(
      e.name || e.shortName || ""
    )
  );

  if (!event) {
    throw new Error(
      "Masters Tournament not found on the current ESPN PGA scoreboard."
    );
  }

  const comp =
    event.competitions?.[0];

  const competitors =
    comp?.competitors || [];

  const players =
    competitors.map(c => ({
      id: String(
        c.athlete?.id ?? c.id
      ),

      name:
        c.athlete?.displayName ??
        "Unknown",

      total:
        scoreToNumber(
          c.score?.displayValue ??
          c.score
        ),

      position:
        c.status?.position?.displayName ??
        c.rank ??
        null,

      thru:
        c.status?.thru ??
        c.status?.displayValue ??
        null
    }));

  let winnerId = null;

  if (event.status?.type?.completed) {
    const champ =
      competitors.find(c =>
        String(
          c.status?.position?.displayName ??
          c.rank ??
          ""
        ) === "1"
      );

    if (champ) {
      winnerId = String(
        champ.athlete?.id ??
        champ.id
      );
    }
  }

  return {
    eventId: event.id,
    eventName: event.name,
    players,
    winnerId,
    lastSync:
      new Date().toISOString()
  };
}

export default async () => {
  try {
    const scoring =
      await fetchMasters();

    await writeJSON(
      "scores",
      scoring
    );

    if (scoring.players.length) {
  const current =
    await readJSON(
      "golfers",
      []
    );

  const existingByName =
    new Map(
      current
        .map(g => {
          const name =
            typeof g === "string"
              ? g
              : g?.name;

          return [
            String(name || "")
              .trim()
              .toLowerCase(),
            g
          ];
        })
        .filter(([key]) => key)
    );

  const next =
    scoring.players
      .map(p => {
        const key =
          String(p.name || "")
            .trim()
            .toLowerCase();

        const existing =
          existingByName.get(key);

        return {
          ...(
            existing &&
            typeof existing === "object"
              ? existing
              : {}
          ),
          id:
            existing &&
            typeof existing === "object" &&
            existing.id
              ? existing.id
              : p.id,
          name: p.name,
          status: "active"
        };
      })
      .sort(
        (a,b) =>
          a.name.localeCompare(
            b.name
          )
      );

  await writeJSON(
    "golfers",
    next
  );
}

    return Response.json({
      ok: true,
      event: scoring.eventName,
      count: scoring.players.length,
      lastSync: scoring.lastSync
    });
  }
  catch (err) {
    console.error(err);

    return Response.json(
      {
        ok: false,
        error: err.message
      },
      { status: 500 }
    );
  }
};
