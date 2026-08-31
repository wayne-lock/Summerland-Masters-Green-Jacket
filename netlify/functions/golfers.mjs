import { readJSON } from "./_store.mjs";

const demo = [
  "Adam Scott",
  "Bryson DeChambeau",
  "Cameron Smith",
  "Collin Morikawa",
  "Corey Conners",
  "Hideki Matsuyama",
  "Jason Day",
  "Jon Rahm",
  "Jordan Spieth",
  "Justin Thomas",
  "Ludvig Åberg",
  "Patrick Cantlay",
  "Rory McIlroy",
  "Scottie Scheffler",
  "Shane Lowry",
  "Tommy Fleetwood",
  "Tony Finau",
  "Viktor Hovland",
  "Will Zalatoris",
  "Xander Schauffele"
]
.sort((a,b) => a.localeCompare(b))
.map((name,i) => ({
  id: `demo-${i+1}`,
  name,
  status: "active"
}));

export default async () => {
  const field = await readJSON("golfers", demo);

  return Response.json({
    golfers: field
  });
};
