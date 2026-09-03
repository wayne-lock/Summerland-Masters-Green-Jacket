import { readJSON, writeJSON } from "./_store.mjs";


function keyName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const SUPABASE_URL =
  "https://rgdqzqbzqobzobahgbsq.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_cexIwuREWj_tQS-CMSkL7w_mdkx6YXF";

async function getSignedInUser(req) {
  const authorization =
    req.headers.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/user`,
    {
      headers: {
        Authorization: authorization,
        apikey: SUPABASE_PUBLISHABLE_KEY
      }
    }
  );

  if (!response.ok) return null;

  const user = await response.json();
  return user || null;
}

function deadlinePassed(config) {
  if (!config.deadline) return false;
  return Date.now() >= new Date(config.deadline).getTime();
}

export default async (req) => {
  const url = new URL(req.url);

  const config = await readJSON("config", {
    entryFee: 20,
    deadline: null
  });

  if (req.method === "GET") {
  const user = await getSignedInUser(req);

  if (!user) {
    return Response.json(
      { error: "Please sign in first." },
      { status: 401 }
    );
  }

  const teams = await readJSON("teams", {});
  const team = teams[user.id];

  if (!team) {
    return Response.json({
      found: false,
      locked: deadlinePassed(config)
    });
  }

  return Response.json({
    found: true,
    locked: deadlinePassed(config),
    name: team.name,
    golferIds: team.golferIds,
    submittedAt: team.submittedAt,
    updatedAt: team.updatedAt
  });
}

  if (req.method === "POST") {
  const user = await getSignedInUser(req);

  if (!user) {
    return Response.json(
      { error: "Please sign in first." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));

  const firstName =
    String(user.user_metadata?.first_name || "").trim();

  const lastName =
    String(user.user_metadata?.last_name || "").trim();

  const name =
    String(
      user.user_metadata?.player_name ||
      `${firstName} ${lastName}`.trim() ||
      user.email?.split("@")[0] ||
      ""
    ).trim();

  const golferIds = Array.isArray(body.golferIds)
    ? [...new Set(body.golferIds.map(String))]
    : [];

  if (name.length < 2) {
    return Response.json(
      { error: "Player name is missing from your account." },
      { status: 400 }
    );
  }

  if (golferIds.length !== config.teamSize) {
    return Response.json(
      {
        error:
          `Exactly ${config.teamSize} golfers are required.`
      },
      { status: 400 }
    );
  }

  if (deadlinePassed(config)) {
    return Response.json(
      {
        error:
          "The selection deadline has passed. Teams are locked."
      },
      { status: 423 }
    );
  }

  const field = await readJSON("golfers", []);
  const valid =
    new Set(field.map(g => String(g.id)));

  if (
    field.length &&
    golferIds.some(id => !valid.has(id))
  ) {
    return Response.json(
      {
        error:
          "One or more golfer selections are invalid."
      },
      { status: 400 }
    );
  }

  const teams = await readJSON("teams", {});
  const now = new Date().toISOString();
  const existing = teams[user.id];

  teams[user.id] = {
    userId: user.id,
    email: user.email || null,
    name,
    golferIds,
    submittedAt: existing?.submittedAt || now,
    updatedAt: now
  };

  await writeJSON("teams", teams);

  return Response.json({
    ok: true,
    name,
    golferIds,
    submittedAt: teams[user.id].submittedAt,
    updatedAt: now
  });
}

  return new Response(
    "Method not allowed",
    { status: 405 }
  );
};
