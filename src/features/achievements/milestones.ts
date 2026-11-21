export type Metrics = {
  cells: number; meters: number; squareMeters: number; places: number; streak: number; discoveryDays: number;
  landmarks: number;
};

export const coreMilestones = [
  { id: "first", name: "Stray Cat", description: "Discover your first territory", metric: "cells", target: 1, xp: 50 },
  { id: "wanderer", name: "Chronic Loiterer", description: "Travel 10 kilometres", metric: "meters", target: 10_000, xp: 150 },
  { id: "cartographer", name: "Landlord (Delusional)", description: "Discover 1 square kilometre", metric: "squareMeters", target: 1_000_000, xp: 250 },
  { id: "explorer", name: "Certified Outside Person", description: "Discover 100 unique cells", metric: "cells", target: 100, xp: 100 },
  { id: "nomad", name: "Everyone Knows My Order", description: "Visit 50 unique places", metric: "places", target: 50, xp: 250 },
  { id: "consistent", name: "Touch Grass Any%", description: "Build a seven-day exploration streak", metric: "streak", target: 7, xp: 200 },
  { id: "uncharted", name: "New Map, Who Dis?", description: "Discover new territory on five different days", metric: "discoveryDays", target: 5, xp: 100 },
  { id: "first-landmark", name: "Dora With Receipts", description: "Unlock your first landmark", metric: "landmarks", target: 1, xp: 100 },
  { id: "side-quest", name: "Side Quest Gremlin", description: "Unlock 3 landmarks", metric: "landmarks", target: 3, xp: 120 },
  { id: "errand-goblin", name: "Errand Goblin", description: "Visit 5 unique saved places", metric: "places", target: 5, xp: 125 },
  { id: "offline-behavior", name: "Suspiciously Offline", description: "Build a 14-day exploration streak", metric: "streak", target: 14, xp: 425 },
  { id: "map-addict", name: "GPS Gremlin Supreme", description: "Discover 5,000 unique cells", metric: "cells", target: 5_000, xp: 450 },
] as const;

export const advancedMilestones = [
  { id: "century", name: "Homeless Era", description: "Travel 100 kilometres", metric: "meters", target: 100_000, xp: 600 },
  { id: "long-haul", name: "My Feet Filed a Complaint", description: "Travel 500 kilometres", metric: "meters", target: 500_000, xp: 1800 },
  { id: "thousand-k", name: "Google Maps Is Concerned", description: "Travel 1,000 kilometres", metric: "meters", target: 1_000_000, xp: 3200 },
  { id: "territory-surveyor", name: "Real Estate Menace", description: "Discover 25 square kilometres", metric: "squareMeters", target: 25_000_000, xp: 1200 },
  { id: "atlas-maker", name: "Rich Bitch", description: "Discover 100 square kilometres", metric: "squareMeters", target: 100_000_000, xp: 4200 },
  { id: "grid-master", name: "Chronically Mapped", description: "Discover 50,000 unique cells", metric: "cells", target: 50_000, xp: 1900 },
  { id: "regular", name: "Local Celebrity Allegedly", description: "Visit 150 unique saved places", metric: "places", target: 150, xp: 1500 },
  { id: "month-streak", name: "Delulu but Disciplined", description: "Build a 30-day exploration streak", metric: "streak", target: 30, xp: 1250 },
  { id: "season-streak", name: "Outside Is My Full-Time Job", description: "Build a 90-day exploration streak", metric: "streak", target: 90, xp: 4000 },
  { id: "hundred-days", name: "The Fog Has Beef With Me", description: "Discover new territory on 100 different days", metric: "discoveryDays", target: 100, xp: 2500 },
  { id: "grand-tour", name: "Main Character on Tour", description: "Unlock 25 landmarks", metric: "landmarks", target: 25, xp: 1450 },
  { id: "world-collector", name: "Passport Needs Therapy", description: "Unlock 100 landmarks", metric: "landmarks", target: 100, xp: 3600 },
  { id: "pavement-bitch", name: "Pavement Bitch", description: "Travel 25 kilometres", metric: "meters", target: 25000, xp: 235 },
  { id: "marathon-whore", name: "Marathon Whore", description: "Travel 42.195 kilometres", metric: "meters", target: 42195, xp: 420 },
  { id: "gaslight-gps", name: "Gaslight, Gatekeep, GPS", description: "Travel 75 kilometres", metric: "meters", target: 75000, xp: 540 },
  { id: "leg-day-bitch", name: "Leg Day, Bitch", description: "Travel 150 kilometres", metric: "meters", target: 150000, xp: 750 },
  { id: "travel-whore", name: "Certified Travel Whore", description: "Travel 250 kilometres", metric: "meters", target: 250000, xp: 1000 },
  { id: "road-trip-bitch", name: "Road Trip Bitch", description: "Travel 750 kilometres", metric: "meters", target: 750000, xp: 2500 },
  { id: "unhinged-mileage", name: "Unhinged Mileage", description: "Travel 2,000 kilometres", metric: "meters", target: 2000000, xp: 5000 },
  { id: "fog-whore", name: "Fog Whore", description: "Discover 2.5 square kilometres", metric: "squareMeters", target: 2500000, xp: 390 },
  { id: "delulu-estate", name: "Delulu Estate Holdings", description: "Discover 5 square kilometres", metric: "squareMeters", target: 5000000, xp: 550 },
  { id: "rent-free-bitch", name: "Rent-Free Bitch", description: "Discover 10 square kilometres", metric: "squareMeters", target: 10000000, xp: 800 },
  { id: "property-whore", name: "Property Whore", description: "Discover 50 square kilometres", metric: "squareMeters", target: 50000000, xp: 2300 },
  { id: "nosy-bitch", name: "Nosy Bitch", description: "Visit 10 unique saved places", metric: "places", target: 10, xp: 220 },
  { id: "errand-whore", name: "Errand Whore", description: "Visit 25 unique saved places", metric: "places", target: 25, xp: 330 },
  { id: "landmark-slut", name: "Landmark Slut", description: "Unlock 10 landmarks", metric: "landmarks", target: 10, xp: 330 },
  { id: "tourist-bitch", name: "Tourist Trap Bitch", description: "Unlock 50 landmarks", metric: "landmarks", target: 50, xp: 2250 },
  { id: "passport-whore", name: "Passport Whore", description: "Unlock 250 landmarks", metric: "landmarks", target: 250, xp: 6500 },
] as const;

export const milestones = [...coreMilestones, ...advancedMilestones] as const;
export type Milestone = (typeof milestones)[number];

export function earnedMilestones(metrics: Metrics, unlocked: ReadonlySet<string>) {
  return milestones.filter(item => metrics[item.metric] >= item.target && !unlocked.has(item.id));
}

export function levelFor(xp: number) {
  return 1 + Math.floor(xp / 250);
}

