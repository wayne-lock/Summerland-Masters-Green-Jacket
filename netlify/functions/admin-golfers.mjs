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

function cleanName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function nameKey(value) {
  return cleanName(value).toLowerCase();
}

export default async (req) => {

  if (!authorized(req)) {
    return Response.json(
      { error: "Incorrect admin PIN." },
      { status: 401 }
    );
  }

  if (req.method === "GET") {
    const golfers =
      await readJSON("golfers", []);

    return Response.json({
      golfers,
      count: golfers.length
    });
  }

  if (req.method === "POST") {

    const body =
      await req.json().catch(() => ({}));

    if (!Array.isArray(body.names)) {
      return Response.json(
        { error: "Golfer names are required." },
        { status: 400 }
      );
    }

    const names =
      body.names
        .map(cleanName)
        .filter(Boolean);

    const uniqueNames = [];
    const seen = new Set();

    for (const name of names) {
      const key = nameKey(name);

      if (!seen.has(key)) {
        seen.add(key);
        uniqueNames.push(name);
      }
    }

    if (!uniqueNames.length) {
      return Response.json(
        { error: "Enter at least one golfer." },
        { status: 400 }
      );
    }

    const current =
      await readJSON("golfers", []);

    const existingByName =
      new Map(
        current.map(g => [
          nameKey(g.name),
          g
        ])
      );

    let nextNumber = 1;

    const golfers =
      uniqueNames
        .sort((a, b) =>
          a.localeCompare(b)
        )
        .map(name => {

          const existing =
            existingByName.get(
              nameKey(name)
            );

          if (existing) {
            return {
              ...existing,
              name,
              status: "active"
            };
          }

          return {
            id:
              `admin-${Date.now()}-${nextNumber++}`,
            name,
            status: "active"
          };
        });

    await writeJSON(
      "golfers",
      golfers
    );

    return Response.json({
      ok: true,
      golfers,
      count: golfers.length
    });
  }

  return new Response(
    "Method not allowed",
    { status: 405 }
  );
};
