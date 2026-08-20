// lib/objectMap.ts
// Maps a COCO-SSD class label to a friendly name + "put it here" suggestion.
// This covers all 80 categories COCO-SSD can detect, grouped by how a kid
// tidying a room should respond to each one — most items get picked up
// and put away, some furniture just gets tidied around, and living
// things (people, pets) obviously don't get "put away" anywhere!

export interface Suggestion {
  name: string;
  dest: string;
  tip?: string;
}

// ---------------------------------------------------------------------
// Everyday clutter: things that should actually be picked up and moved.
// ---------------------------------------------------------------------
const PUT_AWAY: Record<string, Suggestion> = {
  backpack:        { name: "Backpack",   dest: "Hook by the door" },
  umbrella:        { name: "Umbrella",   dest: "Umbrella stand near the entrance" },
  handbag:         { name: "Bag",        dest: "Shelf in the closet" },
  suitcase:        { name: "Suitcase",   dest: "Under the bed or in the closet" },
  tie:             { name: "Tie",        dest: "Tie rack in the wardrobe" },
  book:            { name: "Book",       dest: "Bookshelf, spine facing out" },
  clock:           { name: "Clock",      dest: "Nightstand or wall shelf" },
  vase:            { name: "Vase",       dest: "Windowsill or shelf" },
  scissors:        { name: "Scissors",   dest: "Desk drawer or pencil case" },
  "teddy bear":    { name: "Stuffed toy", dest: "Toy bin or bed shelf" },
  toothbrush:      { name: "Toothbrush", dest: "Bathroom cup by the sink" },
  "hair drier":    { name: "Hair dryer", dest: "Bathroom cabinet" },
  bottle:          { name: "Bottle",     dest: "Kitchen counter or recycling bin" },
  "wine glass":    { name: "Glass",      dest: "Kitchen sink" },
  cup:             { name: "Mug",        dest: "Kitchen sink" },
  bowl:            { name: "Bowl",       dest: "Kitchen sink" },
  fork:            { name: "Fork",       dest: "Kitchen sink" },
  knife:           { name: "Knife",      dest: "Kitchen sink" },
  spoon:           { name: "Spoon",      dest: "Kitchen sink" },
  "cell phone":    { name: "Phone",      dest: "Charging spot on the desk" },
  laptop:          { name: "Laptop",     dest: "Desk" },
  keyboard:        { name: "Keyboard",   dest: "Desk" },
  mouse:           { name: "Mouse",      dest: "Desk" },
  remote:          { name: "Remote",     dest: "Coffee table tray" },
  "sports ball":   { name: "Ball",       dest: "Toy bin" },
  frisbee:         { name: "Frisbee",    dest: "Toy bin" },
  skateboard:      { name: "Skateboard", dest: "By the front door or garage" },
  "tennis racket": { name: "Racket",     dest: "Sports gear closet" },
  "baseball glove":{ name: "Glove",      dest: "Sports gear closet" },
  "baseball bat":  { name: "Bat",        dest: "Sports gear closet" },
  skis:            { name: "Skis",       dest: "Garage or gear closet" },
  snowboard:       { name: "Snowboard",  dest: "Garage or gear closet" },
  surfboard:       { name: "Surfboard",  dest: "Garage or gear closet" },
  kite:            { name: "Kite",       dest: "Toy bin or garage" },
};

// ---------------------------------------------------------------------
// Leftover food/snacks — same idea, different destination.
// ---------------------------------------------------------------------
const FOOD: Record<string, Suggestion> = {
  banana:   { name: "Banana",   dest: "Kitchen — eat it or the fruit bowl" },
  apple:    { name: "Apple",    dest: "Kitchen — eat it or the fruit bowl" },
  orange:   { name: "Orange",   dest: "Kitchen — eat it or the fruit bowl" },
  broccoli: { name: "Broccoli", dest: "Kitchen — finish it or the fridge" },
  carrot:   { name: "Carrot",   dest: "Kitchen — finish it or the fridge" },
  sandwich: { name: "Sandwich", dest: "Kitchen — finish it or wrap it up" },
  "hot dog":{ name: "Hot dog",  dest: "Kitchen — finish it up!" },
  pizza:    { name: "Pizza",    dest: "Kitchen — finish it or box it up" },
  donut:    { name: "Donut",    dest: "Kitchen — finish it or a plate" },
  cake:     { name: "Cake",     dest: "Kitchen — finish it or a plate" },
};

// ---------------------------------------------------------------------
// Furniture / fixtures: these stay put, so the tip is about tidying
// around them rather than moving them.
// ---------------------------------------------------------------------
const STAYS_PUT: Record<string, Suggestion> = {
  chair:          { name: "Chair",       dest: "Already in place — just clear what's on it" },
  bench:          { name: "Bench",       dest: "Already in place — just clear what's on it" },
  couch:          { name: "Couch",       dest: "Already in place — fluff the cushions and clear it off" },
  bed:            { name: "Bed",         dest: "Already in place — straighten the sheets" },
  "dining table": { name: "Table",       dest: "Already in place — clear what's on top" },
  "potted plant": { name: "Plant",       dest: "Already in place — check if it needs water" },
  tv:             { name: "TV",          dest: "Already in place — tidy the cables behind it" },
  refrigerator:   { name: "Fridge",      dest: "Already in place" },
  oven:           { name: "Oven",        dest: "Already in place" },
  microwave:      { name: "Microwave",   dest: "Already in place — wipe it down" },
  toaster:        { name: "Toaster",     dest: "Already in place — clear crumbs around it" },
  toilet:         { name: "Toilet",      dest: "Already in place" },
  sink:           { name: "Sink",        dest: "Already in place — clear anything sitting in it" },
};

// ---------------------------------------------------------------------
// Living things: never "put away" — a kid tapping a pet or a person in
// frame should get something friendly, not tidying instructions.
// ---------------------------------------------------------------------
const LIVING_THINGS: Record<string, Suggestion> = {
  person: { name: "Person", dest: "That's a person, not clutter — say hi! 👋" },
  cat:    { name: "Cat",     dest: "Pets don't need tidying — maybe a head scratch?" },
  dog:    { name: "Dog",     dest: "Pets don't need tidying — maybe a head scratch?" },
  bird:   { name: "Bird",    dest: "Best left alone — no tidying needed here!" },
  horse:  { name: "Horse",   dest: "If that's a real animal, definitely not something to tidy!" },
  sheep:  { name: "Sheep",   dest: "If that's a real animal, definitely not something to tidy!" },
  cow:    { name: "Cow",     dest: "If that's a real animal, definitely not something to tidy!" },
  elephant:{ name: "Elephant", dest: "Probably a toy or poster — toy bin if it's a stuffed one!" },
  bear:   { name: "Bear",    dest: "Probably a stuffed toy — into the toy bin if so!" },
  zebra:  { name: "Zebra",   dest: "Probably a toy or poster — toy bin if it's a stuffed one!" },
  giraffe:{ name: "Giraffe", dest: "Probably a toy or poster — toy bin if it's a stuffed one!" },
};

// ---------------------------------------------------------------------
// Vehicles & outdoor/street objects: unlikely to genuinely be in a
// bedroom, but COCO-SSD sometimes flags toy versions, posters, or a
// background window view. Kept light and honest about the uncertainty.
// ---------------------------------------------------------------------
const VEHICLES_AND_OUTDOOR: Record<string, Suggestion> = {
  bicycle:         { name: "Bike",         dest: "Bike rack, garage, or entryway" },
  car:             { name: "Car",          dest: "Garage — or the toy bin if it's a toy!" },
  motorcycle:      { name: "Motorcycle",   dest: "Garage — or the toy bin if it's a toy!" },
  truck:           { name: "Truck",        dest: "Garage — or the toy bin if it's a toy!" },
  bus:             { name: "Bus",          dest: "Probably a toy — into the toy bin!" },
  train:           { name: "Train",        dest: "Probably a toy — into the toy bin!" },
  airplane:        { name: "Airplane",     dest: "Probably a toy — into the toy bin!" },
  boat:             { name: "Boat",         dest: "Probably a toy — into the toy bin!" },
  "traffic light": { name: "Traffic light", dest: "That's unusual indoors — might be a photo or poster!" },
  "fire hydrant":  { name: "Fire hydrant",  dest: "That's unusual indoors — might be a photo or poster!" },
  "stop sign":     { name: "Stop sign",     dest: "That's unusual indoors — might be a photo or poster!" },
  "parking meter": { name: "Parking meter", dest: "That's unusual indoors — might be a photo or poster!" },
};

const ALL_SUGGESTIONS: Record<string, Suggestion> = {
  ...PUT_AWAY,
  ...FOOD,
  ...STAYS_PUT,
  ...LIVING_THINGS,
  ...VEHICLES_AND_OUTDOOR,
};

const DEFAULT_SUGGESTION: Suggestion = {
  name: "Item",
  dest: "Find its home and put it there",
};

export function getSuggestion(label: string): Suggestion {
  const key = label.toLowerCase();
  const match = ALL_SUGGESTIONS[key];
  if (match) return match;
  return { ...DEFAULT_SUGGESTION, name: label.charAt(0).toUpperCase() + label.slice(1) };
}
