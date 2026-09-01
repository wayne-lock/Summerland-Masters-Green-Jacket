import { readJSON, writeJSON } from "./_store.mjs";
function authorized(req) {
  const adminPin = process.env.ADMIN_PIN;
  const suppliedPin = req.headers.get("x-admin-pin");

  return (
    adminPin &&
    suppliedPin &&
    suppliedPin === adminPin
  );
}
export default async (req) => {
  if (!authorized(req)) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const golfers =
    await readJSON(
      "golfers",
      []
    );

  if (!golfers.length) {
    return Response.json(
      { error: "No golfers available for test scoring." },
      { status: 400 }
    );
  }
    const players =
    golfers.map((g, i) => ({
      id:
        typeof g === "string"
          ? `test-${i + 1}`
          : String(g.id),
      name:
        typeof g === "string"
          ? g
          : g.name,
      total:
        [-5, -3, 1, 4, 7][i % 5],
      position: null,
      thru: "F"
    }));

  const winnerId =
    players.length
      ? players[0].id
      : null;
    const scoring = {
    eventId: "test",
    eventName: "Masters Test Scoring",
    players,
    winnerId,
    lastSync: new Date().toISOString(),
    testMode: true
  };

  await writeJSON(
    "scores",
    scoring
  );

  return Response.json({
    ok: true,
    testMode: true,
    count: players.length,
    winnerId
  });
};
