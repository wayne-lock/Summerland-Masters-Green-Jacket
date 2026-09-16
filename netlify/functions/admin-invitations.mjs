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

  const invitations =
    await readJSON(
      "invitations",
      {}
    );

  if (req.method === "GET") {
    return Response.json({
      invitations:
        Object.values(invitations)
    });
  }

  if (req.method === "POST") {
    const body =
      await req.json().catch(() => ({}));

    const firstName =
      String(body.firstName || "").trim();

    const lastName =
      String(body.lastName || "").trim();

    const email =
      String(body.email || "")
        .trim()
        .toLowerCase();

    if (!firstName || !lastName || !email) {
      return Response.json(
        {
          error:
            "First name, last name, and email are required."
        },
        { status: 400 }
      );
    }

    const key = email;

    invitations[key] = {
      firstName,
      lastName,
      email,
      status:
        invitations[key]?.status ||
        "Invited",
      createdAt:
        invitations[key]?.createdAt ||
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    };

    await writeJSON(
      "invitations",
      invitations
    );

    return Response.json({
      ok: true,
      invitation: invitations[key]
    });
  }

  if (req.method === "DELETE") {
    const body =
      await req.json().catch(() => ({}));

    const email =
      String(body.email || "")
        .trim()
        .toLowerCase();

    if (!email || !invitations[email]) {
      return Response.json(
        { error: "Invitation not found." },
        { status: 404 }
      );
    }

    delete invitations[email];

    await writeJSON(
      "invitations",
      invitations
    );

    return Response.json({
      ok: true,
      removed: email
    });
  }

  return Response.json(
    { error: "Method not allowed." },
    { status: 405 }
  );
};
