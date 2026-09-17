import {
  readJSON,
  writeJSON
} from "./_store.mjs";

const SUPABASE_URL =
  "https://rgdqzqbzqobzobahgbsq.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_cexIwuREWj_tQS-CMSkL7w_mdkx6YXF";

async function getSignedInUser(req) {
  const authorization =
    req.headers.get("authorization") || "";

  if (
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  const response =
    await fetch(
      `${SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          Authorization:
            authorization,
          apikey:
            SUPABASE_PUBLISHABLE_KEY
        }
      }
    );

  if (!response.ok) {
    return null;
  }

  const user =
    await response.json();

  return user || null;
}

export default async (req) => {
  if (req.method !== "POST") {
    return Response.json(
      {
        error:
          "Method not allowed."
      },
      { status: 405 }
    );
  }

  const user =
    await getSignedInUser(req);

  if (!user?.email) {
    return Response.json(
      {
        error:
          "Please sign in first."
      },
      { status: 401 }
    );
  }

  const email =
    String(user.email)
      .trim()
      .toLowerCase();

  const invitations =
    await readJSON(
      "invitations",
      {}
    );

  const invitation =
    invitations[email];

  if (!invitation) {
    return Response.json(
      {
        error:
          "Invitation not found."
      },
      { status: 404 }
    );
  }

  invitations[email] = {
    ...invitation,
    status:
      invitation.status ===
      "Team Submitted"
        ? "Team Submitted"
        : "Joined",
    updatedAt:
      new Date().toISOString()
  };

  await writeJSON(
    "invitations",
    invitations
  );

  return Response.json({
    ok: true,
    status:
      invitations[email].status
  });
};
