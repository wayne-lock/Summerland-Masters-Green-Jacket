import { writeJSON } from "./_store.mjs";

const SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?dates=20260412";

export default async () => {
  try {
    const res = await fetch(SCOREBOARD, {
      headers: {
        "user-agent": "Summerland-Masters-Pool-Test/1.0"
      }
    });

    if (!res.ok) {
      throw new Error(`ESPN scoreboard HTTP ${res.status}`);
    }

    const data = await res.json();

    const event = (data.events || []).find(e =>
      /masters/i.test(e.name || e.shortName || "")
    );

    if (!event) {
      throw new Error("2026 Masters not found");
    }

    const competitors =
      event.competitions?.[0]?.competitors || [];

    const golfers = competitors.map((c, index) => ({
      id: String(c.athlete?.id ?? c.id),
      name: c.athlete?.displayName ?? "Unknown",
      rank: index + 1,
      status: "active"
    }));

    await writeJSON("golfers", golfers);

    return Response.json({
      ok: true,
      event: event.name,
      count: golfers.length,
      message: "2026 Masters field loaded",
      golfers
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
