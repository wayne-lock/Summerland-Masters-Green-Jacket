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

  if (req.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405 }
    );
  }

  const body =
    await req.json().catch(() => ({}));

  if (body.confirm !== "RESET") {
    return Response.json(
      { error: "Reset confirmation required." },
      { status: 400 }
    );
  }

  const invitations =
    await readJSON(
      "invitations",
      {}
    );

  const resetInvitations = {};

  for (const [key, invitation] of Object.entries(invitations)) {
    resetInvitations[key] = {
      ...invitation,
      status: "Invited",
      updatedAt: new Date().toISOString()
    };
  }

  await writeJSON(
    "teams",
    {}
  );

  await writeJSON(
    "scores",
    {}
  );

  await writeJSON(
    "invitations",
    resetInvitations
  );

  return Response.json({
    ok: true,
    message: "Pool season reset completed.",
    invitationsReset:
      Object.keys(resetInvitations).length
  });
};
