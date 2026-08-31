import { readJSON } from "./_store.mjs";

export default async () => {
  const config = await readJSON("config", {
    year: 2027,
    entryFee: 20,
    deadline: null,
    title: "Summerland Masters Green Jacket"
  });

  return Response.json(config);
};
