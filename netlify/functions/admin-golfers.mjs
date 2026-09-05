import { readJSON, writeJSON } from "./_store.mjs";

function authorized(req) {
  const adminPin =
    process.env.ADMIN_PIN;

  const suppliedPin =
    req.headers.get("x-admin-pin");

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
  return cleanName(value)
    .toLowerCase();
}

function validRank(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const rank =
    Number(value);

  if (
    !Number.isInteger(rank) ||
    rank < 1
  ) {
    return null;
  }

  return rank;
}

function groupFromRank(rank) {

  if (!rank) {
    return "remaining";
  }

  if (rank <= 20) {
    return "top20";
  }

  if (rank <= 40) {
    return "next20";
  }

  if (rank <= 60) {
    return "third20";
  }

  return "remaining";
}

function validGroup(value) {

  const groups =
    new Set([
      "top20",
      "next20",
      "third20",
      "remaining"
    ]);

  return groups.has(value)
    ? value
    : null;
}

function selectionsHaveOpened(
  config
) {

  if (!config?.selectionOpen) {
    return false;
  }

  const opening =
    new Date(
      config.selectionOpen
    );

  if (
    Number.isNaN(
      opening.getTime()
    )
  ) {
    return false;
  }

  return Date.now() >=
    opening.getTime();
}

export default async (req) => {

  if (!authorized(req)) {

    return Response.json(
      {
        error:
          "Incorrect admin PIN."
      },
      { status: 401 }
    );
  }

  if (req.method === "GET") {

    const golfers =
      await readJSON(
        "golfers",
        []
      );

    return Response.json({
      golfers,
      count:
        golfers.length
    });
  }

  if (req.method === "POST") {

    const config =
      await readJSON(
        "config",
        {}
      );

    if (
      selectionsHaveOpened(
        config
      )
    ) {
      return Response.json(
        {
          error:
            "The golfer field is locked because selections have opened."
        },
        { status: 423 }
      );
    }

    const body =
      await req
        .json()
        .catch(() => ({}));

    const current =
      await readJSON(
        "golfers",
        []
      );

    const existingByName =
      new Map(
        current.map(
          golfer => [
            nameKey(
              golfer.name
            ),
            golfer
          ]
        )
      );

    let incoming = [];

    /*
      New structured import format.

      Example:
      {
        golfers: [
          {
            name: "Scottie Scheffler",
            rank: 1
          }
        ]
      }
    */

    if (
      Array.isArray(
        body.golfers
      )
    ) {

      incoming =
        body.golfers
          .map(item => {

            const name =
              cleanName(
                item?.name
              );

            const rank =
              validRank(
                item?.rank
              );

            const manualGroup =
              validGroup(
                item?.group
              );

            return {
              name,
              rank,
              group:
                manualGroup ||
                groupFromRank(
                  rank
                )
            };

          })
          .filter(
            item =>
              Boolean(
                item.name
              )
          );

    }

    /*
      Existing name-only format.

      This keeps the current Admin
      page compatible until the new
      import screen is built.
    */

    else if (
      Array.isArray(
        body.names
      )
    ) {

      incoming =
        body.names
          .map(name => {

            const cleaned =
              cleanName(name);

            const existing =
              existingByName.get(
                nameKey(
                  cleaned
                )
              );

            const rank =
              validRank(
                existing?.rank
              );

            return {
              name:
                cleaned,

              rank,

              group:
                validGroup(
                  existing?.group
                ) ||
                groupFromRank(
                  rank
                )
            };

          })
          .filter(
            item =>
              Boolean(
                item.name
              )
          );

    }

    else {

      return Response.json(
        {
          error:
            "Golfer data is required."
        },
        { status: 400 }
      );

    }

    const uniqueGolfers = [];
    const seen =
      new Set();

    for (
      const golfer
      of incoming
    ) {

      const key =
        nameKey(
          golfer.name
        );

      if (
        seen.has(key)
      ) {
        continue;
      }

      seen.add(key);

      uniqueGolfers.push(
        golfer
      );
    }

    if (
      !uniqueGolfers.length
    ) {

      return Response.json(
        {
          error:
            "Enter at least one golfer."
        },
        { status: 400 }
      );

    }

    let nextNumber = 1;

    const now =
      Date.now();

    const golfers =
      uniqueGolfers
        .map(golfer => {

          const existing =
            existingByName.get(
              nameKey(
                golfer.name
              )
            );

          const rank =
            validRank(
              golfer.rank
            );

          const group =
            validGroup(
              golfer.group
            ) ||
            groupFromRank(
              rank
            );

          if (existing) {

            return {
              ...existing,

              name:
                golfer.name,

              rank,

              group,

              status:
                "active"
            };

          }

          return {
            id:
              `admin-${now}-${nextNumber++}`,

            name:
              golfer.name,

            rank,

            group,

            status:
              "active"
          };

        })
        .sort(
          (a, b) => {

            const rankA =
              a.rank ??
              Number.MAX_SAFE_INTEGER;

            const rankB =
              b.rank ??
              Number.MAX_SAFE_INTEGER;

            if (
              rankA !== rankB
            ) {
              return (
                rankA -
                rankB
              );
            }

            return a.name
              .localeCompare(
                b.name
              );

          }
        );

    await writeJSON(
      "golfers",
      golfers
    );

    return Response.json({
      ok: true,

      golfers,

      count:
        golfers.length,

      groups: {
        top20:
          golfers.filter(
            g =>
              g.group ===
              "top20"
          ).length,

        next20:
          golfers.filter(
            g =>
              g.group ===
              "next20"
          ).length,

        third20:
          golfers.filter(
            g =>
              g.group ===
              "third20"
          ).length,

        remaining:
          golfers.filter(
            g =>
              g.group ===
              "remaining"
          ).length
      }
    });
  }

  return new Response(
    "Method not allowed",
    { status: 405 }
  );
};
