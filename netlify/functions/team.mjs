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
    req.headers.get(
      "authorization"
    ) || "";

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

function validDate(value) {

  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

function selectionsNotOpen(
  config
) {

  const opening =
    validDate(
      config.selectionOpen
    );

  if (!opening) {
    return false;
  }

  return (
    Date.now() <
    opening.getTime()
  );
}

function selectionDeadline(
  config
) {

  return (
    validDate(
      config.selectionClose
    ) ||
    validDate(
      config.deadline
    )
  );
}

function deadlinePassed(
  config
) {

  const deadline =
    selectionDeadline(
      config
    );

  if (!deadline) {
    return false;
  }

  return (
    Date.now() >=
    deadline.getTime()
  );
}

function selectionsLocked(
  config
) {

  return (
    selectionsNotOpen(
      config
    ) ||
    deadlinePassed(
      config
    )
  );
}

function groupMaximum(
  value,
  fallback
) {

  const number =
    Number(value);

  if (
    !Number.isInteger(number) ||
    number < 0
  ) {
    return fallback;
  }

  return number;
}

function countGroups(
  selectedGolfers
) {

  const counts = {
    top20: 0,
    next20: 0,
    third20: 0,
    remaining: 0
  };

  for (
    const golfer
    of selectedGolfers
  ) {

    const group =
      golfer.group;

    if (
      group === "top20" ||
      group === "next20" ||
      group === "third20"
    ) {

      counts[group]++;

    }
    else {

      counts.remaining++;

    }

  }

  return counts;
}

export default async (req) => {

  const config =
    await readJSON(
      "config",
      {
        entryFee: 20,
        teamSize: 14,

        selectionOpen:
          null,

        selectionClose:
          null,

        deadline:
          null,

        top20Max: 4,
        next20Max: 4,
        third20Max: 5
      }
    );

  if (
    req.method === "GET"
  ) {

    const user =
      await getSignedInUser(
        req
      );

    if (!user) {

      return Response.json(
        {
          error:
            "Please sign in first."
        },
        { status: 401 }
      );

    }

    const teams =
      await readJSON(
        "teams",
        {}
      );

    const team =
      teams[user.id];

    if (!team) {

      return Response.json({
        found: false,

        locked:
          selectionsLocked(
            config
          ),

        selectionsOpen:
          !selectionsNotOpen(
            config
          ) &&
          !deadlinePassed(
            config
          )
      });

    }

    return Response.json({
      found: true,

      locked:
        selectionsLocked(
          config
        ),

      selectionsOpen:
        !selectionsNotOpen(
          config
        ) &&
        !deadlinePassed(
          config
        ),

      name:
        team.name,

      golferIds:
        team.golferIds,

      submittedAt:
        team.submittedAt,

      updatedAt:
        team.updatedAt
    });

  }

  if (
    req.method === "POST"
  ) {

    const user =
      await getSignedInUser(
        req
      );

    if (!user) {

      return Response.json(
        {
          error:
            "Please sign in first."
        },
        { status: 401 }
      );

    }

    if (
      selectionsNotOpen(
        config
      )
    ) {

      return Response.json(
        {
          error:
            "Golfer selections are not open yet."
        },
        { status: 423 }
      );

    }

    if (
      deadlinePassed(
        config
      )
    ) {

      return Response.json(
        {
          error:
            "The selection deadline has passed. Teams are locked."
        },
        { status: 423 }
      );

    }

    const body =
      await req
        .json()
        .catch(
          () => ({})
        );

    const firstName =
      String(
        user
          .user_metadata
          ?.first_name ||
        ""
      ).trim();

    const lastName =
      String(
        user
          .user_metadata
          ?.last_name ||
        ""
      ).trim();

    const name =
      String(
        user
          .user_metadata
          ?.player_name ||

        `${firstName} ${lastName}`
          .trim() ||

        user.email
          ?.split("@")[0] ||

        ""
      ).trim();

    const golferIds =
      Array.isArray(
        body.golferIds
      )
        ? [
            ...new Set(
              body.golferIds
                .map(String)
            )
          ]
        : [];

    const teamSize =
      Number(
        config.teamSize
      );

    if (
      name.length < 2
    ) {

      return Response.json(
        {
          error:
            "Player name is missing from your account."
        },
        { status: 400 }
      );

    }

    if (
      golferIds.length !==
      teamSize
    ) {

      return Response.json(
        {
          error:
            `Exactly ${teamSize} golfers are required.`
        },
        { status: 400 }
      );

    }

    const field =
      await readJSON(
        "golfers",
        []
      );

    const fieldById =
      new Map(
        field.map(
          golfer => [
            String(
              golfer.id
            ),
            golfer
          ]
        )
      );

    if (
      field.length &&
      golferIds.some(
        id =>
          !fieldById.has(
            id
          )
      )
    ) {

      return Response.json(
        {
          error:
            "One or more golfer selections are invalid."
        },
        { status: 400 }
      );

    }

    const selectedGolfers =
      golferIds
        .map(
          id =>
            fieldById.get(
              id
            )
        )
        .filter(Boolean);

    if (
      field.length &&
      selectedGolfers.length !==
        golferIds.length
    ) {

      return Response.json(
        {
          error:
            "One or more golfer selections could not be found."
        },
        { status: 400 }
      );

    }

    const groupCounts =
      countGroups(
        selectedGolfers
      );

    const top20Max =
      groupMaximum(
        config.top20Max,
        4
      );

    const next20Max =
      groupMaximum(
        config.next20Max,
        4
      );

    const third20Max =
      groupMaximum(
        config.third20Max,
        5
      );

    if (
      groupCounts.top20 >
      top20Max
    ) {

      return Response.json(
        {
          error:
            `You may select no more than ${top20Max} golfers from Top 20.`
        },
        { status: 400 }
      );

    }

    if (
      groupCounts.next20 >
      next20Max
    ) {

      return Response.json(
        {
          error:
            `You may select no more than ${next20Max} golfers from the first Next 20 group.`
        },
        { status: 400 }
      );

    }

    if (
      groupCounts.third20 >
      third20Max
    ) {

      return Response.json(
        {
          error:
            `You may select no more than ${third20Max} golfers from the second Next 20 group.`
        },
        { status: 400 }
      );

    }

    /*
      Remaining Field intentionally has
      no group maximum.
    */

    const teams =
      await readJSON(
        "teams",
        {}
      );

    const now =
      new Date()
        .toISOString();

    const existing =
      teams[user.id];

    teams[user.id] = {

      userId:
        user.id,

      email:
        user.email ||
        null,

      name,

      golferIds,

      submittedAt:
        existing
          ?.submittedAt ||
        now,

      updatedAt:
        now
    };

    await writeJSON(
      "teams",
      teams
    );

    return Response.json({

      ok: true,

      name,

      golferIds,

      groupCounts,

      submittedAt:
        teams[user.id]
          .submittedAt,

      updatedAt:
        now
    });

  }

  return new Response(
    "Method not allowed",
    { status: 405 }
  );
};
