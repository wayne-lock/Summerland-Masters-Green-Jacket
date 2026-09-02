import { readJSON } from "./_store.mjs";

function displayScore(v) {
  if (v === null || v === undefined) return "—";
  if (v === 0) return "E";
  return v > 0 ? `+${v}` : `${v}`;
}

export default async () => {
  const config = await readJSON("config", {
    entryFee: 20
  });

  const teams = await readJSON("teams", {});
const golfers = await readJSON("golfers", []);
  const golferNamesById = new Map(
  golfers.map(g => [
    String(g.id),
    g.name
  ])
);
  const deadlinePassed =
  config.deadline
    ? Date.now() >= new Date(config.deadline).getTime()
    : false;
  const scoring = await readJSON("scores", {
    players: [],
    lastSync: null,
    winnerId: null
  });

  const byId = new Map(
    (scoring.players || []).map(
      p => [String(p.id), p]
    )
  );

  const rows = Object.values(teams)
    .map(t => {
      let total = 0;
      let counted = 0;

      for (const id of t.golferIds || []) {
        const g = byId.get(String(id));

        if (!g || typeof g.total !== "number") {
          continue;
        }

        total +=
          g.total +
          (
            String(id) === String(scoring.winnerId)
              ? -2
              : 0
          );

        counted++;
      }

    return {
  name: t.name,
  score: counted ? total : null,
  counted,
  golfers: deadlinePassed
    ? (t.golferIds || [])
        .map(id => golferNamesById.get(String(id)))
        .filter(Boolean)
    : []
};
    })
    .sort(
      (a,b) =>
        (a.score ?? 9999) -
        (b.score ?? 9999)
    );

  const leader =
    rows.find(
      x => x.score !== null
    )?.score ?? null;

  const output =
    rows.map((r,i) => ({
      rank: i + 1,
      ...r,
      scoreDisplay:
        displayScore(r.score),

      behindDisplay:
        (
          leader === null ||
          r.score === null
        )
          ? "—"
          : (
              r.score === leader
                ? "—"
                : `+${r.score - leader}`
            )
    }));

  return Response.json({
    rows: output,
    prize:
      Object.keys(teams).length *
      (config.entryFee || 20),

    entries:
      Object.keys(teams).length,

    lastSync:
      scoring.lastSync
  });
};
