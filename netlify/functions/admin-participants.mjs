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

  const teams = await readJSON("teams", {});

  if (req.method === "GET") {
    const participants = Object.entries(teams).map(
      ([key, team]) => ({
        key,
        name: team.name || key
      })
    );

    return Response.json({
      participants
    });
  }
    if (req.method === "DELETE") {
    const body =
      await req.json().catch(() => ({}));

    const key =
      String(body.key || "").trim();

    if (!key || !teams[key]) {
      return Response.json(
        { error: "Participant not found." },
        { status: 404 }
      );
    }

    const removedName =
      teams[key].name || key;

    delete teams[key];

    await writeJSON(
      "teams",
      teams
    );

    return Response.json({
      ok: true,
      removed: removedName
    });
  }

  return Response.json(
    { error: "Method not allowed." },
    { status: 405 }
  );
};
