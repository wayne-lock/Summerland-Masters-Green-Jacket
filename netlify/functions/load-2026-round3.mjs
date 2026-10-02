import { readJSON, writeJSON } from "./_store.mjs";

const EVENT_ID = "401811941";
const SEASON = "2026";

function scoreToNumber(value) {
  if (value === undefined || value === null) return null;

  const s = String(value).trim();

  if (!s || s === "--") return null;
  if (s.toUpperCase() === "E") return 0;

  const n = Number(s.replace("+", ""));
  return Number.isFinite(n) ? n : null;
}

async function getRound3(golfer) {
  const url =
    `https://site.web.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard/${EVENT_ID}/playersummary?season=${SEASON}&player=${golfer.id}`;

  const res = await fetch(url, {
    headers: {
      "user-agent": "Summerland-Masters-Pool-Test/1.0"
    }
  });

  if (!res.ok) {
    throw new Error(
      `${golfer.name}: ESPN HTTP ${res.status}`
    );
  }

  const data = await res.json();
  const rounds = data.rounds || [];

  const round1 =
    rounds.find(r => Number(r.period) === 1);

  const round2 =
    rounds.find(r => Number(r.period) === 2);
  const round3 =
  rounds.find(r => Number(r.period) === 3);

  if (!round1 || !round2) {
    throw new Error(
      `${golfer.name}: Round 1 or Round 2 not found`
    );
  }

  const r1 = scoreToNumber(round1.displayValue);
  const r2 = scoreToNumber(round2.displayValue);

  if (r1 === null || r2 === null) {
    throw new Error(
      `${golfer.name}: invalid Round 1 or Round 2 score`
    );
  }


const r3 =
  round3 ? scoreToNumber(round3.displayValue) : null;

const madeCut = r3 !== null;

  return {
    id: String(golfer.id),
    name: golfer.name,
    total: r1 + r2 + (madeCut ? r3 : 0),
    position: null,
    thru: madeCut ? "F" : "CUT"
  };
}

export default async () => {
  try {
    const golfers =
      await readJSON("golfers", []);

    if (!golfers.length) {
      throw new Error("No golfers are loaded.");
    }

    const players = [];
    const errors = [];

    const batchSize = 10;

    for (
      let i = 0;
      i < golfers.length;
      i += batchSize
    ) {
      const batch =
        golfers.slice(i, i + batchSize);

      const results =
        await Promise.allSettled(
        batch.map(getRound3)
        );

      results.forEach(result => {
        if (result.status === "fulfilled") {
          players.push(result.value);
        } else {
          errors.push(
            result.reason?.message ||
            "Unknown ESPN error"
          );
        }
      });
    }

    if (errors.length) {
      return Response.json(
        {
          ok: false,
          message:
            "Round 2 was not loaded because some golfers failed.",
          count: players.length,
          errors
        },
        { status: 502 }
      );
    }

    const scoring = {
      eventId: EVENT_ID,
      eventName: "2026 Masters - Round 3",
      players,
      winnerId: null,
      lastSync: new Date().toISOString(),
      testMode: true
    };

    await writeJSON(
      "scores",
      scoring
    );

    return Response.json({
      ok: true,
      round: 3,
      count: players.length,
      message:
        "2026 Masters Round 3 loaded",
      players
    });

  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err.message
      },
      { status: 500 }
    );
  }
};
