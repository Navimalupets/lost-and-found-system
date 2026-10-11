/* ---------- Levenshtein + similarity ---------- */
export function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let p = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const c = [i];
    for (let j = 1; j <= n; j++)
      c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    p = c;
  }
  return p[n];
}

export const sim1 = (a, b) => {
  const L = Math.max(a.length, b.length);
  return L ? 1 - lev(a, b) / L : 1;
};

/* ---------- WHITELIST: only these words are kept ----------
   format:  canonical English word: [other spellings, Tagalog, typos]
   Anything not listed here is ignored (filler, numbers, etc.). */
const GROUPS = {
  /* ===== ITEMS ===== */
  wallet: ["walet", "pitaka", "coinpurse", "purse"],
  umbrella: ["payong", "umbrela"],
  bag: ["backpack", "bagpack", "sling", "handbag", "supot", "tote", "pouch", "sling bag"],
  bottle: ["tumbler", "bote", "flask", "hydroflask", "thermos"],
  calculator: ["kalkulator", "calc"],
  charger: ["adapter", "cable", "powerbank", "wire"],
  phone: ["cellphone", "cp", "selpon", "mobile", "smartphone", "iphone", "android"],
  laptop: ["kompyuter", "macbook", "chromebook"],
  tablet: ["ipad"],
  keys: ["key", "susi", "keychain"],
  id: ["identification", "lanyard"],
  notebook: ["note", "kuwaderno", "notepad", "journal"],
  book: ["libro", "textbook", "module"],
  pen: ["ballpen", "bolpen", "ballpoint", "marker", "highlighter"],
  pencil: ["lapis"],
  shoes: ["sapatos", "sneakers", "sandals", "tsinelas", "slippers"],
  jacket: ["dyaket", "hoodie", "sweater", "cardigan"],
  uniform: ["polo", "blouse", "shirt", "damit"],
  cap: ["sombrero", "hat"],
  earphones: ["headphones", "earbuds", "airpods"],
  glasses: ["eyeglasses", "salamin", "shades", "sunglasses"],
  watch: ["relo", "orasan"],
  ring: ["singsing"],
  necklace: ["kwintas"],
  flashdrive: ["thumbdrive", "usbdrive"],
  mouse: ["mouse"],
  ruler: ["rula"],
  folder: ["envelope", "clearbook", "fastener"],
  lunchbox: ["baon", "tupperware", "lunchbag", "lunch"],
  towel: ["tuwalya", "bimpo", "handkerchief", "panyo"],
  fan: ["pamaypay", "minifan", "electricfan"],
  labgown: ["gown", "labcoat", "apron"],
  helmet: ["helmet"],
  scissors: ["gunting", "cutter"],
  lunchbox: ["baon", "tupperware", "lunchbag", "lunch"],
  /* ===== CONTENTS (dropped if a real item is also named) ===== */
  card: ["atm", "debit", "credit"],
  cash: ["money", "peso", "php", "pera", "barya", "coin"],

  /* ===== COLORS ===== */
  black: ["itim"],
  white: ["puti"],
  red: ["pula", "maroon"],
  blue: ["asul", "bughaw", "navy"],
  green: ["berde", "luntian"],
  yellow: ["dilaw"],
  gray: ["grey", "abo", "silver"],
  brown: ["kayumanggi", "tan", "beige"],
  pink: ["rosas"],
  orange: ["kahel"],
  purple: ["violet", "lila"],
  gold: ["ginto"],
  clear: ["transparent"],

  /* ===== PLACES ===== */
  canteen: ["kantina", "cafeteria", "kainan"],
  library: ["aklatan", "silid-aklatan"],
  gym: ["gymnasium", "court"],
  hallway: ["pasilyo", "corridor", "lobby"],
  classroom: ["room", "silid", "silid-aralan"],
  laboratory: ["lab"],
  restroom: ["cr", "banyo", "palikuran", "comfort", "toilet"],
  guard: ["guardhouse", "gate", "tarangkahan", "entrance"],
  stairs: ["hagdan", "hagdanan", "stairway"],
  field: ["oval", "grounds", "quadrangle", "quad"],
  parking: ["parkingan"],
  office: ["opisina", "registrar", "guidance", "clinic"],
  building: ["gusali", "bldg"],
  auditorium: ["theater", "theatre", "hall"],
};

// "ids" -> "id", "keys" -> "key"
const singular = (w) => (w.length >= 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);

// every spelling (and its singular form) points to its canonical word
const CANON = {};
Object.entries(GROUPS).forEach(([c, list]) =>
  [c, ...list].forEach((w) => {
    w.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).forEach((part) => {
      CANON[part] = c;
      CANON[singular(part)] = c;
    });
  })
);
const DICT_KEYS = Object.keys(CANON).filter((k) => k.length >= 4);

// returns the canonical word, or null if the word is not in the whitelist
export function lookup(w) {
  if (CANON[w]) return CANON[w];
  if (w.length >= 4) {
    let best = null, bs = 0;
    for (const k of DICT_KEYS) {
      const s = sim1(w, k);
      if (s > bs) { bs = s; best = k; }
    }
    // 4-letter words need an exact match (1 typo = 75%, too loose: "note" -> "tote")
    if (bs >= (w.length <= 4 ? 0.9 : 0.75)) return CANON[best];
  }
  return null;
}


const NUMWORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  isa: 1, dalawa: 2, tatlo: 3, apat: 4, lima: 5, anim: 6, pito: 7, walo: 8, siyam: 9, sampu: 10 };

export function keywords(s, loose = false) {
  const words = String(s || "")
    .toLowerCase()
    .replace(/[₱$]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (loose) return [...new Set(words)];

  const out = [];
  words.forEach((w, i) => {
    const c = lookup(w);
    if (!c) return;
    // number just before the word ("3 id") or just after it ("250 pesos", "pesos 250")
    const num = (x) => (x === undefined ? null : /^\d+$/.test(x) ? x : NUMWORDS[x] ?? null);
    let n = num(words[i - 1]);
    if (n === null && c === "cash") n = num(words[i + 1]);
    // skip the "valid" style filler between number and item: "3 valid id"
    if (n === null && words[i - 1] === "valid") n = num(words[i - 2]);
    out.push(n !== null && (c === "id" || c === "card" || c === "cash") ? `${n} ${c}` : c);
  });
  return [...new Set(out)];
}

export function textSim(a, b, loose = false) {
  const A = keywords(a, loose), B = keywords(b, loose);
  if (!A.length || !B.length) return null;
  const dir = (X, Y) => X.reduce((s, x) => s + Math.max(...Y.map((y) => sim1(x, y))), 0) / X.length;
  // short text vs long sentence: how much of the short one is covered by the long one
  const [S, Lg] = A.length <= B.length ? [A, B] : [B, A];
  const cover = dir(S, Lg);
  const sym = (dir(A, B) + dir(B, A)) / 2;
  return 0.7 * cover + 0.3 * sym;
}

// [lost field, found field, weight, loose?]
const W = [
  ["item", "name", 0.3],
  ["color", "color", 0.15],
  ["brand", "brand", 0.15, true],
  ["looks", "desc", 0.15],
  ["contents", "other", 0.1],
  ["where", "loc", 0.15],
];

export function score(l, f) {
  let s = 0, w = 0;
  W.forEach(([lk, fk, wt, loose]) => {
    const v = textSim(l[lk], f[fk], loose);
    if (v !== null) { s += v * wt; w += wt; }
  });
  return w ? Math.round((s / w) * 100) : 0;
}

const LABELS = { item: "Item", color: "Color", brand: "Brand", looks: "Description", contents: "Contents", where: "Location" };

// breakdown per field: why a lost report matches a found item
export function explain(l, f) {
  return W.map(([lk, fk, wt, loose]) => {
    const v = textSim(l[lk], f[fk], loose);
    if (v === null) return null;
    const hidden = lk === "contents"; // found "other" details are hidden from students
    const A = keywords(l[lk], loose), B = keywords(f[fk], loose);
    const shared = hidden ? [] : A.filter((a) => B.some((b) => sim1(a, b) >= 0.75));
    return { label: LABELS[lk], pct: Math.round(v * 100), lost: l[lk], found: hidden ? "" : f[fk], shared, hidden };
  }).filter(Boolean);
}

export function runMatch(lost, found, thr) {
  const r = found
    .filter((f) => f.status === "Available")
    .map((f) => ({ foundId: f.id, name: f.name, score: score(lost, f) }));
  const log = r.map((x) => ({ name: x.name, score: x.score, ok: x.score >= thr }));
  const matches = r
    .filter((x) => x.score >= thr)
    .sort((a, b) => b.score - a.score)
    .map(({ foundId, score }) => ({ foundId, score }));
  return { matches, log };
}

export function sameness(l, f) {
  const out = [];
  if (l.cat && f.cat && l.cat === f.cat) out.push("Same category");
  if ((textSim(l.color, f.color) ?? 0) >= 0.8) out.push("Same color");
  if ((textSim(l.where, f.loc) ?? 0) >= 0.6) out.push("Same area");
  return out;
}