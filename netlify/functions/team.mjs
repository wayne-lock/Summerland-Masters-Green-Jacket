import { readJSON, writeJSON } from "./_store.mjs";
import crypto from "node:crypto";

function keyName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function hashPin(pin) {
  return crypto
    .createHash("sha256")
    .update(String(pin))
    .digest("hex");
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
    const name = url.searchParams.get("name") || "";
    const pin = url.searchParams.get("pin") || "";
    const key = keyName(name);

    if (!key) {
      return Response.json(
        { error: "Name required" },
        { status: 400 }
      );
    }

    const teams = await readJSON("teams", {});
    const team = teams[key];

    if (!team) {
      return Response.json({
        found: false,
        locked: deadlinePassed(config)
      });
    }

    if (!pin || team.pinHash !== hashPin(pin)) {
      return Response.json(
        { error: "Incorrect PIN" },
        { status: 403 }
      );
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
    const body = await req.json().catch(() => ({}));

    const name = String(body.name || "").trim();
    const pin = String(body.pin || "").trim();

    const golferIds = Array.isArray(body.golferIds)
      ? [...new Set(body.golferIds.map(String))]
      : [];

    if (name.length < 2) {
      return Response.json(
        { error: "Please enter your name." },
        { status: 400 }
      );
    }

    if (!/^\d{4}$/.test(pin)) {
      return Response.json(
        { error: "Use a 4-digit edit PIN." },
        { status: 400 }
      );
    }

    if (golferIds.length !== 14) {
      return Response.json(
        { error: "Exactly 14 golfers are required." },
        { status: 400 }
      );
    }

    if (deadlinePassed(config)) {
      return Response.json(
        { error: "The selection deadline has passed. Teams are locked." },
        { status: 423 }
      );
    }

    const field = await readJSON("golfers", []);
    const valid = new Set(field.map(g => String(g.id)));

    if (
      field.length &&
      golferIds.some(id => !valid.has(id))
    ) {
      return Response.json(
        { error: "One or more golfer selections are invalid." },
        { status: 400 }
      );
    }

    const teams = await readJSON("teams", {});
    const key = keyName(name);
    const now = new Date().toISOString();
    const existing = teams[key];

    if (
      existing &&
      existing.pinHash !== hashPin(pin)
    ) {
      return Response.json(
        {
          error:
            "That name is already registered with a different PIN."
        },
        { status: 409 }
      );
    }

    teams[key] = {
      name,
      pinHash: hashPin(pin),
      golferIds,
      submittedAt: existing?.submittedAt || now,
      updatedAt: now
    };

    await writeJSON("teams", teams);

    return Response.json({
      ok: true,
      name,
      golferIds,
      submittedAt: teams[key].submittedAt,
      updatedAt: now
    });
  }

  return new Response(
    "Method not allowed",
    { status: 405 }
  );
};
