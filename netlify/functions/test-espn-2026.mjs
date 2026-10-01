const SCOREBOARD =

  "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?dates=20260409";

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

    const events = data.events || [];

    const event = events.find(e =>

      /masters/i.test(

        e.name || e.shortName || ""

      )

    );

    if (!event) {

      return Response.json({

        ok: false,

        message: "2026 Masters not found",

        events: events.map(e => ({

          id: e.id,

          name: e.name,

          shortName: e.shortName

        }))

      });

    }

    const comp = event.competitions?.[0];

    const competitors = comp?.competitors || [];

    const players = competitors.map(c => ({

      id: String(c.athlete?.id ?? c.id),

      name: c.athlete?.displayName ?? "Unknown",

      score: c.score?.displayValue ?? c.score ?? null,

      position:

        c.status?.position?.displayName ??

        c.rank ??

        null,

      thru:

        c.status?.thru ??

        c.status?.displayValue ??

        null

    }));

    return Response.json({

      ok: true,

      eventId: event.id,

      eventName: event.name,

      playerCount: players.length,

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
