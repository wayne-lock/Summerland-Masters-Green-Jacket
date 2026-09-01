import { readJSON, writeJSON } from "./_store.mjs";

const defaults = {
  year: 2027,
  entryFee: 20,
  deadline: null,
  teamSize: 14,
  title: "Summerland Masters Green Jacket"
};

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
      { error: "Incorrect admin PIN." },
      { status: 401 }
    );
  }

  if (req.method === "GET") {
    const config =
      await readJSON("config", defaults);

    return Response.json(config);
  }

  if (req.method === "POST") {

    const body =
      await req.json().catch(() => ({}));

    const current =
      await readJSON("config", defaults);

    const year =
      Number(body.year);

    const entryFee =
      Number(body.entryFee);

    const teamSize =
      Number(body.teamSize);

    if (
      !Number.isInteger(year) ||
      year < 2027 ||
      year > 2100
    ) {
      return Response.json(
        { error: "Enter a valid tournament year." },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(entryFee) ||
      entryFee < 0
    ) {
      return Response.json(
        { error: "Enter a valid entry fee." },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(teamSize) ||
      teamSize < 1 ||
      teamSize > 50
    ) {
      return Response.json(
        { error: "Golfers per team must be between 1 and 50." },
        { status: 400 }
      );
    }

    const next = {
      ...current,
      year,
      entryFee,
      teamSize,
      deadline:
        body.deadline || null,
      title:
        String(
          body.title ||
          current.title ||
          defaults.title
        ).trim()
    };

    await writeJSON(
      "config",
      next
    );

    return Response.json({
      ok: true,
      config: next
    });
  }

  return new Response(
    "Method not allowed",
    { status: 405 }
  );
};
