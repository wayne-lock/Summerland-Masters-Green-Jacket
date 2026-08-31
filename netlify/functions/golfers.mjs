import { readJSON } from "./_store.mjs";

const demo = [
  "Adam Scott",
  "Akshay Bhatia",
  "Billy Horschel",
  "Brian Harman",
  "Brooks Koepka",
  "Bryson DeChambeau",
  "Cameron Smith",
  "Chris Kirk",
  "Collin Morikawa",
  "Corey Conners",
  "Denny McCarthy",
  "Dustin Johnson",
  "Hideki Matsuyama",
  "Jason Day",
  "Joaquin Niemann",
  "Jon Rahm",
  "Jordan Spieth",
  "Justin Rose",
  "Justin Thomas",
  "Keegan Bradley",
  "Ludvig Åberg",
  "Matt Fitzpatrick",
  "Matt McCarty",
  "Max Homa",
  "Min Woo Lee",
  "Patrick Cantlay",
  "Patrick Reed",
  "Rasmus Højgaard",
  "Rickie Fowler",
  "Robert MacIntyre",
  "Rory McIlroy",
  "Russell Henley",
  "Sam Burns",
  "Sahith Theegala",
  "Scottie Scheffler",
  "Sepp Straka",
  "Shane Lowry",
  "Si Woo Kim",
  "Sungjae Im",
  "Taylor Pendrith",
  "Tom Kim",
  "Tommy Fleetwood",
  "Tony Finau",
  "Tyrrell Hatton",
  "Viktor Hovland",
  "Will Zalatoris",
  "Wyndham Clark",
  "Xander Schauffele",
  "Aaron Rai",
  "Cameron Young",
  "Daniel Berger",
  "Harris English",
  "J.T. Poston",
  "Maverick McNealy",
  "Nick Taylor",
  "Nicolai Højgaard",
  "Sergio Garcia",
  "Thomas Detry",
  "Tom Hoge",
  "Willie Mack III"
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
