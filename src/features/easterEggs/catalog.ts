import type { Point } from "../exploration/engine";

const searchEggs = [
  ["here be dragons", "Here Be Dragons", "The dragons are out on a walk. They left no forwarding coordinates."],
  ["treasure map", "Buried Treasure", "X marks the coffee shop. The treasure was a very good pastry."],
  ["map goblin", "Map Goblin", "It only comes out when you zoom in one level too far."],
  ["the moon", "One Small Step", "Walking directions are currently unavailable."],
  ["flat earth", "Fold Line", "Maps are flat because globes are awkward to fold."],
  ["42", "The Answer", "The question was how many times you can recalculate the same route."],
  ["lost sock", "The Other Sock", "Last seen near the washing machine. The trail has gone cold."],
  ["warp speed", "Warp Speed", "Your feet are currently rated for approximately walking speed."],
  ["side quest", "Side Quest", "Take the next turn you usually walk past."],
  ["x marks the spot", "The Spot", "Somewhere between the X and the spot, the cartographer got distracted."],
  ["secret tunnel", "Secret Tunnel", "The first rule of secret tunnels is to take a flashlight."],
  ["coffee compass", "Coffee Compass", "North temporarily points toward the nearest good espresso."],
  ["outer space", "Out of Coverage", "There are no sidewalks beyond the atmosphere."],
  ["rubber duck", "The Rubber Duck", "It knows the route. It is waiting for you to ask nicely."],
  ["bigfoot", "Unconfirmed Sighting", "Large footprints. Excellent walking pace. Refused to share coordinates."],
  ["wrong turn", "Scenic Route", "Take enough wrong turns and eventually one becomes your favorite."],
  ["do not press", "You Pressed It", "The map remains intact. Your curiosity is under investigation."],
  ["mapmine", "You Are Here", "Searching for the map from inside the map is a respectable hobby."],
] as const;

const coordinateEggs = [
  { id: "null-island", title: "Null Island", text: "Population: a lot of misplaced map pins.", latitude: 0, longitude: 0 },
  { id: "dateline", title: "Between Yesterdays", text: "Your calendar is recalculating its route.", latitude: 0, longitude: 180 },
  { id: "greenwich", title: "Time Zero", text: "The longitude has nothing to declare.", latitude: 51.4779, longitude: 0 },
  { id: "point-nemo", title: "Point Nemo", text: "The nearest neighbors are sometimes astronauts.", latitude: -48.8767, longitude: -123.3933 },
] as const;

export const interfaceEggs = {
  logo: { id: "logo", title: "Signature Edition", text: "The MapMine seal has passed its very unofficial inspection." },
  compass: { id: "compass", title: "North Again", text: "North called to say it appreciates the attention." },
  activity: { id: "activity", title: "Chart Topper", text: "Seven days, seven bars, and one very inquisitive explorer." },
  achievements: { id: "achievements", title: "Achievement About Achievements", text: "An award for investigating the awards. We have to stop somewhere." },
  places: { id: "places", title: "The Bookmark", text: "Every favorite place started as somewhere you hadn't been." },
  journal: { id: "journal", title: "The Field Journal", text: "Cartographers write things in the margins. You found the margins." },
} as const;

export type Egg = { id: string; title: string; text: string };

export const eggs: readonly Egg[] = [
  ...searchEggs.map(([phrase, title, text]) => ({ id: "search:" + phrase, title, text })),
  ...coordinateEggs,
  ...Object.values(interfaceEggs),
];

export function eggForSearch(query: string) {
  const id = "search:" + query.trim().toLowerCase().replace(/\s+/g, " ");
  return eggs.find(egg => egg.id === id);
}

export function eggForPoint(point: Point) {
  return coordinateEggs.find(egg => egg.latitude === point.latitude &&
    (egg.longitude === point.longitude || (egg.id === "dateline" && point.longitude === -180)));
}
