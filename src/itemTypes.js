import { lookup } from "./matching";

const SIZES = ["small", "medium", "large"];
const CONDITIONS = ["like new", "worn", "scratched", "cracked", "dented", "torn", "faded"];

/* ---------- small helpers for writing clean English ---------- */
// empty answers like "N/A", "none", "wala" or "-" are treated as blank
const t = (v) => {
  const s = v == null ? "" : String(v).trim();
  return /^(n\/?a|none|wala|-+)$/i.test(s) ? "" : s;
};
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const low = (v) => t(v).toLowerCase();
const art = (w) => (/^[aeiou]/i.test(w) ? "an" : "a");

// capital first letter + period at the end
const sentence = (s) => {
  s = t(s);
  if (!s) return "";
  s = s[0].toUpperCase() + s.slice(1);
  return /[.!?]$/.test(s) ? s : s + ".";
};
const join = (arr) => arr.map(sentence).filter(Boolean).join(" ");

// ["a", "b", "c"] -> "a, b and c"
const list = (a) => (a.length < 2 ? a[0] || "" : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);

// describe(["small", "red"], "wallet") -> "a small red wallet"
const describe = (parts, noun) => {
  const w = [...parts.map(t).filter(Boolean), noun].join(" ");
  return `${art(w)} ${w}`;
};

const looks = (c) => (t(c) ? `it looks ${t(c)}` : "");
const marked = (m) => (t(m) ? `marked with ${t(m)}` : "");

const text = (k, label, ph = "") => ({ k, label, ph });
const pick = (k, label, opts) => ({ k, label, opts });

/* ---------- one entry per kind of item ---------- */
export const TYPES = {
  wallet: {
    title: "Wallet",
    cat: "Wallets & bags",
    fields: [
      pick("size", "Size", SIZES),
      pick("material", "Material", ["leather", "fabric", "plastic", "canvas"]),
      pick("condition", "Condition", CONDITIONS),
      text("ids", "IDs inside", "e.g. 2 student IDs"),
      text("cash", "Cash inside", "e.g. ₱300"),
      text("cards", "Cards inside", "e.g. 1 ATM card"),
      text("marks", "Marks or initials", "e.g. initials “MR” inside"),
    ],
    build: ({ color, brand, e }) => {
      const inside = list([t(e.ids), t(e.cash) && `${t(e.cash)} in cash`, t(e.cards)].filter(Boolean));
      return join([
        describe([e.size, low(color), e.material, brand], "wallet"),
        looks(e.condition),
        inside && `it contains ${inside}`,
        marked(e.marks),
      ]);
    },
  },

  umbrella: {
    title: "Umbrella",
    cat: "Personal items",
    fields: [
      pick("kind", "Type", ["folding", "long", "compact", "golf"]),
      pick("size", "Size", SIZES),
      pick("handle", "Handle", ["wooden", "plastic", "metal", "rubber"]),
      pick("condition", "Condition", CONDITIONS),
      text("marks", "Marks or initials", "e.g. initials “MR” on the strap"),
    ],
    build: ({ color, brand, e }) =>
      join([
        describe([e.size, low(color), e.kind, brand], "umbrella"),
        e.handle && `it has ${art(e.handle)} ${e.handle} handle`,
        looks(e.condition),
        marked(e.marks),
      ]),
  },

  bag: {
    title: "Bag",
    cat: "Wallets & bags",
    fields: [
      pick("kind", "Type", ["backpack", "sling bag", "tote bag", "handbag", "drawstring bag", "pouch"]),
      pick("size", "Size", SIZES),
      pick("condition", "Condition", CONDITIONS),
      pick("zipper", "Zipper", ["working fine", "broken", "stuck"]),
      text("contents", "Contents", "e.g. two notebooks and a calculator"),
      text("marks", "Keychain, stickers or marks", "e.g. a star-shaped keychain"),
      text("nametag", "Name tag reads", "e.g. Juan D."),
    ],
    build: ({ color, brand, e }) =>
      join([
        describe([e.size, low(color), brand], e.kind || "bag"),
        looks(e.condition),
        e.zipper && `its zipper is ${e.zipper}`,
        t(e.contents) && `it contains ${t(e.contents)}`,
        marked(e.marks),
        t(e.nametag) && `it has a name tag that reads “${t(e.nametag)}”`,
      ]),
  },

  phone: {
    title: "Phone",
    cat: "Electronics",
    fields: [
      text("model", "Model", "e.g. Galaxy A14"),
      text("case", "Case", "e.g. clear silicone case"),
      pick("screen", "Screen", ["intact", "scratched", "cracked"]),
      text("lock", "Lock screen shows", "e.g. a photo of a dog"),
      text("marks", "Stickers or marks", "e.g. a cat sticker on the back"),
    ],
    build: ({ color, brand, e }) =>
      join([
        describe([low(color), brand, e.model], "phone"),
        t(e.case) && `it is in ${art(t(e.case))} ${t(e.case)}`,
        e.screen && `the screen is ${e.screen}`,
        t(e.lock) && `the lock screen shows ${t(e.lock)}`,
        marked(e.marks),
      ]),
  },

  calculator: {
    title: "Calculator",
    cat: "Electronics",
    fields: [
      text("model", "Model", "e.g. fx-991"),
      pick("condition", "Condition", CONDITIONS),
      text("marks", "Name tape or initials", "e.g. name tape inside the battery cover"),
    ],
    build: ({ color, brand, e }) =>
      join([describe([low(color), brand, e.model], "calculator"), looks(e.condition), marked(e.marks)]),
  },

  bottle: {
    title: "Water bottle",
    cat: "Personal items",
    fields: [
      text("capacity", "Capacity", "e.g. 750 ml"),
      pick("material", "Material", ["plastic", "stainless steel", "glass", "aluminum"]),
      pick("condition", "Condition", CONDITIONS),
      text("marks", "Stickers or marks", "e.g. a cat sticker on the lid"),
    ],
    build: ({ color, brand, e }) =>
      join([
        describe([low(color), e.material, brand], "bottle"),
        t(e.capacity) && `it holds ${t(e.capacity)}`,
        looks(e.condition),
        marked(e.marks),
      ]),
  },

  keys: {
    title: "Keys",
    cat: "Personal items",
    fields: [
      text("count", "Number of keys", "e.g. 3"),
      text("keychain", "Keychain", "e.g. star-shaped keychain"),
      text("tag", "Tag reads", "e.g. Locker 24"),
      text("marks", "Other marks", "e.g. a red rubber cover on one key"),
    ],
    build: ({ color, e }) => {
      const first = `a set of ${[t(e.count), low(color)].filter(Boolean).join(" ")} keys`.replace("of  keys", "of keys");
      return join([
        first,
        t(e.keychain) && `they are attached to ${art(t(e.keychain))} ${t(e.keychain)}`,
        t(e.tag) && `a tag that reads “${t(e.tag)}” is attached`,
        marked(e.marks),
      ]);
    },
  },
};

/* ---------- compact builder for the simpler items ---------- */
const S = pick("size", "Size", SIZES);
const adjp = (k, label, opts) => ({ ...pick(k, label, opts), adj: true }); // goes before the noun
const say = (fd, fn) => ({ ...fd, say: fn });                              // gets its own sentence

const make = (title, cat, noun, fields) => {
  const all = [
    ...fields,
    pick("condition", "Condition", CONDITIONS),
    text("marks", "Marks, stickers or initials", "e.g. initials “MR” on the side"),
  ];
  return {
    title,
    cat,
    fields: all,
    build: ({ color, brand, e }) => {
      const adj = all.filter((f) => f.adj).map((f) => low(e[f.k]));
      const rest = all.filter((f) => f.say && t(e[f.k])).map((f) => f.say(t(e[f.k])));
      return join([
        describe([e.size, low(color), ...adj, brand], noun),
        ...rest,
        looks(e.condition),
        marked(e.marks),
      ]);
    },
  };
};

Object.assign(TYPES, {
  /* ----- Books & supplies ----- */
  book: make("Book", "Books & supplies", "book", [
    say(text("subject", "Title or subject", "e.g. Calculus textbook"), (v) => `its title or subject is ${v}`),
    say(text("owner", "Name written inside", "e.g. Juan D."), (v) => `the name written inside reads “${v}”`),
  ]),
  notebook: make("Notebook", "Books & supplies", "notebook", [
    adjp("kind", "Type", ["spiral", "composition", "ruled", "binder"]),
    say(text("subject", "Subject or label", "e.g. Math"), (v) => `it is labelled “${v}”`),
    say(text("owner", "Name written on it", "e.g. Juan D."), (v) => `the name written on it reads “${v}”`),
  ]),
  pen: make("Pen or marker", "Books & supplies", "pen", [
    say(text("count", "How many", "e.g. 3 pens"), (v) => `there are ${v}`),
  ]),
  pencil: make("Pencil or pencil case", "Books & supplies", "pencil case", [
    adjp("material", "Material", ["fabric", "plastic", "leather", "canvas"]),
    say(text("contents", "Contents", "e.g. 2 pens and a ruler"), (v) => `it contains ${v}`),
  ]),
  folder: make("Folder", "Books & supplies", "folder", [
    adjp("kind", "Type", ["plastic envelope", "clear book", "long", "expanding"]),
    say(text("contents", "Papers inside", "e.g. printed activity sheets"), (v) => `it contains ${v}`),
  ]),
  ruler: make("Ruler", "Books & supplies", "ruler", [
    adjp("material", "Material", ["plastic", "metal", "wooden"]),
    say(text("length", "Length", "e.g. 30 cm"), (v) => `it measures ${v}`),
  ]),
  scissors: make("Scissors", "Books & supplies", "pair of scissors", [
    say(text("handle", "Handle color", "e.g. red"), (v) => `it has ${art(v)} ${v} handle`),
  ]),

  /* ----- Personal items ----- */
  lunchbox: make("Lunch box", "Personal items", "lunch box", [
    adjp("material", "Material", ["plastic", "metal", "insulated"]),
    say(text("contents", "Food or items inside", "e.g. rice and a spoon"), (v) => `it contains ${v}`),
  ]),
  id: make("ID or lanyard", "Personal items", "ID", [
    say(text("owner", "Name on the ID", "e.g. Juan D."), (v) => `the name on it reads “${v}”`),
    say(text("number", "ID number", "e.g. 2024-00123"), (v) => `the ID number is ${v}`),
  ]),
  towel: make("Towel or handkerchief", "Personal items", "towel", [
    say(text("pattern", "Pattern", "e.g. striped"), (v) => `it has ${art(v)} ${v} pattern`),
  ]),
  fan: make("Handheld fan", "Personal items", "fan", [
    adjp("kind", "Type", ["handheld", "clip-on", "foldable", "rechargeable"]),
  ]),

  /* ----- Electronics ----- */
  charger: make("Charger", "Electronics", "charger", [
    adjp("kind", "Type", ["wall", "wireless", "car"]),
    say(text("rating", "Wattage or model", "e.g. 20W"), (v) => `its rating or model is ${v}`),
    say(pick("cable", "Cable", ["attached", "none"]), (v) => (v === "attached" ? "it has a cable attached" : "it has no cable")),
  ]),
  earphones: make("Earphones", "Electronics", "pair of earphones", [
    adjp("kind", "Type", ["wired", "wireless", "earbuds", "over-ear"]),
    say(text("case", "Case", "e.g. white charging case"), (v) => `it comes with ${art(v)} ${v}`),
  ]),
  flashdrive: make("Flash drive", "Electronics", "flash drive", [
    say(text("capacity", "Capacity", "e.g. 16 GB"), (v) => `its capacity is ${v}`),
    say(text("label", "Label on it", "e.g. “Thesis”"), (v) => `it is labelled “${v}”`),
  ]),
  laptop: make("Laptop", "Electronics", "laptop", [
    say(text("model", "Model", "e.g. Acer Aspire 5"), (v) => `its model is ${v}`),
    say(text("case", "Sleeve or case", "e.g. gray sleeve"), (v) => `it is inside ${art(v)} ${v}`),
    say(text("lock", "Wallpaper shows", "e.g. a mountain"), (v) => `the wallpaper shows ${v}`),
    say(pick("charger", "Charger", ["with charger", "without charger"]), (v) => `it was found ${v}`),
  ]),
  tablet: make("Tablet", "Electronics", "tablet", [
    say(text("model", "Model", "e.g. iPad 9th gen"), (v) => `its model is ${v}`),
    say(text("case", "Case", "e.g. blue folio case"), (v) => `it is in ${art(v)} ${v}`),
    say(text("lock", "Lock screen shows", "e.g. a photo of a cat"), (v) => `the lock screen shows ${v}`),
  ]),
  mouse: make("Computer mouse", "Electronics", "computer mouse", [
    adjp("kind", "Type", ["wired", "wireless"]),
    say(text("model", "Model", "e.g. Logitech M185"), (v) => `its model is ${v}`),
  ]),

  /* Ring & Necklace-- */
  glasses: make("Eyeglasses", "Accessories", "pair of eyeglasses", [
    adjp("frame", "Frame", ["metal", "plastic"]),
    say(pick("lens", "Lenses", ["clear", "tinted", "cracked"]), (v) => `the lenses are ${v}`),
    say(pick("case", "Case", ["with case", "without case"]), (v) => `it was found ${v}`),
  ]),  
  ring: make("Ring", "Accessories", "ring", [
    adjp("material", "Material", ["gold", "silver", "metal"]),
    say(text("stone", "Stone or design", "e.g. small blue stone"), (v) => `it has ${art(v)} ${v}`),
  ]),
  necklace: make("Necklace", "Accessories", "necklace", [
    adjp("material", "Material", ["gold", "silver", "metal", "beaded"]),
    say(text("pendant", "Pendant", "e.g. heart-shaped pendant"), (v) => `it has ${art(v)} ${v}`),
  ]),

  watch: make("Watch", "Accessories", "watch", [
    adjp("kind", "Type", ["digital", "analog", "smart"]),
    say(pick("strap", "Strap", ["leather", "rubber", "metal", "fabric"]), (v) => `it has ${art(v)} ${v} strap`),
  ]),
  cap: make("Cap", "Accessories", "cap", [
    adjp("kind", "Type", ["baseball", "bucket", "visor"]),
  ]),
  helmet: make("Helmet", "Accessories", "helmet", [
    adjp("kind", "Type", ["full-face", "half-face", "bicycle"]),
  ]),

  /* ----- Clothing ----- */
  jacket: make("Jacket", "Clothing", "jacket", [
    S,
    adjp("kind", "Type", ["hoodie", "windbreaker", "denim", "cardigan"]),
    say(text("pocket", "Items in the pockets", "e.g. a pair of earphones"), (v) => `the pockets contain ${v}`),
  ]),
  uniform: make("Uniform", "Clothing", "uniform", [
    S,
    adjp("kind", "Type", ["polo", "blouse", "pants", "skirt", "PE shirt"]),
    say(text("name", "Name embroidered", "e.g. Juan D."), (v) => `the name embroidered on it reads “${v}”`),
  ]),
  labgown: make("Lab gown", "Clothing", "lab gown", [
    S,
    say(text("name", "Name written inside", "e.g. Juan D."), (v) => `the name written inside reads “${v}”`),
  ]),
  shoes: make("Shoes", "Clothing", "pair of shoes", [
    say(pick("kind", "Type", ["sneakers", "school shoes", "sandals", "slippers"]), (v) => `they are ${v}`),
    say(text("num", "Shoe size", "e.g. 8"), (v) => `the shoe size is ${v}`),
  ]),
});
export const GENERIC = {
  title: "Item",
  cat: null,
  fields: [
    pick("size", "Size", SIZES),
    text("material", "Material", "e.g. plastic"),
    pick("condition", "Condition", CONDITIONS),
    text("marks", "Marks, stickers or initials", "e.g. initials “MR” on the side"),
  ],
  build: ({ name, color, brand, e }) => {
    const n = low(name);
    if (!n) return "";
    const c = low(color);
    return join([
      describe([e.size, c && !n.includes(c) ? c : "", low(e.material), brand], n),
      looks(e.condition),
      marked(e.marks),
    ]);
  },
};

/* ---------- recognise the item from what staff typed ---------- */
// works with typos and Tagalog too ("walet", "pitaka", "payong")
export function detectType(name) {
  const words = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  for (const w of words) {
    const c = lookup(w);
    if (c && TYPES[c]) return c;
  }
  return null;
}

// mode "found" -> "Found at the gym."   mode "lost" -> "Lost near the gym."
export function buildOther(type, form, mode = "found") {
  const base = type.build({
    name: form.name || form.item,
    color: form.color,
    brand: titleCase(t(form.brand)),
    e: form.extra || {},
  });
  const place = t(mode === "found" ? form.loc : form.where);
  const where = place ? sentence(`${mode === "found" ? "found at" : "lost near"} ${place}`) : "";
  return [base, where].filter(Boolean).join(" ");
}