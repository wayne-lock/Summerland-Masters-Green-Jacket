const URL =
  "https://site.web.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard/401811941/playersummary?season=2026&player=3470";

export default async () => {
  try {
    const res = await fetch(URL, {
      headers: {
        "user-agent": "Summerland-Masters-Pool-Test/1.0"
      }
    });

    if (!res.ok) {
      throw new Error(`ESPN player summary HTTP ${res.status}`);
    }

    const data = await res.json();

    return Response.json({
      ok: true,
      player: data.profile?.displayName ?? null,
      rounds: (data.rounds || []).map(r => ({
        round: r.period,
        score: r.value,
        displayScore: r.displayValue,
        inScore: r.inScore,
        outScore: r.outScore
      }))
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
