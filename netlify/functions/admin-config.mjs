import { readJSON, writeJSON } from "./_store.mjs";

const defaults = {
  year: 2027,
  entryFee: 20,
  teamSize: 14,
  title: "Summerland Masters Green Jacket",

  mastersStartDate: null,
  selectionOpen: null,
  selectionClose: null,
  rankingCutoff: null,

  top20Max: 4,
  next20Max: 4,
  third20Max: 5,

  cutLeaderPercent: 20,
  overallChampionPercent: 80,

  // Kept for compatibility with the
  // existing version of the pool.
  deadline: null
};

function authorized(req) {
  const adminPin = process.env.ADMIN_PIN;
  const suppliedPin =
    req.headers.get("x-admin-pin");

  return (
    adminPin &&
    suppliedPin &&
    suppliedPin === adminPin
  );
}

function validDate(value) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(
    date.getTime()
  );
}

function calculateRankingCutoff(
  mastersStartDate
) {
  if (!validDate(mastersStartDate)) {
    return null;
  }

  const date =
    new Date(mastersStartDate);

  date.setMonth(
    date.getMonth() - 1
  );

  return date.toISOString();
}

function calculateSelectionClose(
  mastersStartDate
) {
  if (!validDate(mastersStartDate)) {
    return null;
  }

  const source =
    new Date(mastersStartDate);

  const year =
    source.getFullYear();

  const month =
    String(
      source.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      source.getDate()
    ).padStart(2, "0");

  return (
    `${year}-${month}-${day}` +
    "T00:01:00"
  );
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

    const config =
      await readJSON(
        "config",
        defaults
      );

    return Response.json({
      ...defaults,
      ...config
    });
  }

  if (req.method === "POST") {

    const body =
      await req
        .json()
        .catch(() => ({}));

    const current =
      await readJSON(
        "config",
        defaults
      );

    const year =
      Number(body.year);

    const entryFee =
      Number(body.entryFee);

    const teamSize =
      Number(body.teamSize);

    const top20Max =
      Number(body.top20Max);

    const next20Max =
      Number(body.next20Max);

    const third20Max =
      Number(body.third20Max);

    const cutLeaderPercent =
      Number(
        body.cutLeaderPercent
      );

    const overallChampionPercent =
      Number(
        body.overallChampionPercent
      );

    if (
      !Number.isInteger(year) ||
      year < 2027 ||
      year > 2100
    ) {
      return Response.json(
        {
          error:
            "Enter a valid tournament year."
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(entryFee) ||
      entryFee < 0
    ) {
      return Response.json(
        {
          error:
            "Enter a valid entry fee."
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(teamSize) ||
      teamSize < 1 ||
      teamSize > 50
    ) {
      return Response.json(
        {
          error:
            "Golfers per team must be between 1 and 50."
        },
        { status: 400 }
      );
    }

    if (
      !validDate(
        body.mastersStartDate
      )
    ) {
      return Response.json(
        {
          error:
            "Enter the Masters start date."
        },
        { status: 400 }
      );
    }

    if (
      !validDate(
        body.selectionOpen
      )
    ) {
      return Response.json(
        {
          error:
            "Enter the golfer selection opening date and time."
        },
        { status: 400 }
      );
    }

    if (
      new Date(body.selectionOpen) >=
      new Date(body.mastersStartDate)
    ) {
      return Response.json(
        {
          error:
            "Golfer selections must open before the Masters begins."
        },
        { status: 400 }
      );
    }

    const groupMaximums = [
      top20Max,
      next20Max,
      third20Max
    ];

    if (
      groupMaximums.some(
        value =>
          !Number.isInteger(value) ||
          value < 0 ||
          value > 20
      )
    ) {
      return Response.json(
        {
          error:
            "Golfer group maximums must be between 0 and 20."
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(
        cutLeaderPercent
      ) ||
      cutLeaderPercent < 0 ||
      cutLeaderPercent > 100 ||
      !Number.isFinite(
        overallChampionPercent
      ) ||
      overallChampionPercent < 0 ||
      overallChampionPercent > 100
    ) {
      return Response.json(
        {
          error:
            "Prize percentages must be between 0 and 100."
        },
        { status: 400 }
      );
    }

    if (
      Math.abs(
        cutLeaderPercent +
        overallChampionPercent -
        100
      ) > 0.001
    ) {
      return Response.json(
        {
          error:
            "Cut Leader and Overall Champion prize percentages must total 100%."
        },
        { status: 400 }
      );
    }

    const mastersStartDate =
      body.mastersStartDate;

    const selectionOpen =
      body.selectionOpen;

    const selectionClose =
      calculateSelectionClose(
        mastersStartDate
      );

    const rankingCutoff =
      calculateRankingCutoff(
        mastersStartDate
      );

    const next = {
      ...current,

      year,
      entryFee,
      teamSize,

      title:
        String(
          body.title ||
          current.title ||
          defaults.title
        ).trim(),

      mastersStartDate,
      selectionOpen,
      selectionClose,
      rankingCutoff,

      top20Max,
      next20Max,
      third20Max,

      cutLeaderPercent,
      overallChampionPercent,

      // Keep the old deadline field
      // synchronized for existing code.
      deadline:
        selectionClose
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
