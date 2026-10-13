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
  atrium: ["foyer"],
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
    // 80% needed: blocks "note" -> "tote" (75%) but accepts "blck" -> "black", "gren" -> "green" (80%)
    if (bs >= 0.8) return CANON[best];
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

/* ---------- GRADE SHEET: every detail has a weight, like grades in school ---------- */
// [lost field, found field, weight, loose?, label]
const W = [
  ["item", "name", 0.25, false, "Item"],
  ["color", "color", 0.15, false, "Color"],
  ["where", "loc", 0.15, false, "Location"],
  ["brand", "brand", 0.1, true, "Brand"],
  ["looks", "desc", 0.1, false, "Description"],
];
const SPECIFIC_W = 0.25; // shared by the item-specific details (size, material, condition, marks...)
const MIN_GROUPS = 4;    // fewer compared parts than this can never be "verified"

// [must reach, highest total score if it does not, message]
const CAPS = {
  item: [0.5, 40, "Item is different"],
  color: [0.5, 70, "Color is different"],
  brand: [0.5, 75, "Brand is different"],
  looks: [0.5, 80, "Description does not match"],
  where: [0.4, 80, "Place is different"],
};

const blank = (v) => {
  const s = v == null ? "" : String(v).trim();
  return !s || /^(n\/?a|none|wala|-+)$/i.test(s);
};
const STOP = new Set(["a", "an", "the", "on", "of", "with", "in", "at", "and", "it", "is"]);
const tokens = (s) =>
  String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w));

// compare two specific details word by word (typos allowed).
// strict = true: anything under 80% similar counts as 0%
function detailSim(a, b, strict = true) {
  const A = tokens(a), B = tokens(b);
  if (!A.length || !B.length) return null;
  const [S, L] = A.length <= B.length ? [A, B] : [B, A];
  const cover = S.filter((x) => L.some((y) => sim1(x, y) >= 0.8)).length / S.length;
  return strict && cover < 0.8 ? 0 : cover;
}

// one row for every specific detail answered on BOTH sides (size, material, marks...)
function specificRows(l, f) {
  const le = l.extra || {}, fe = f.extra || {};
  const rows = [];
  Object.keys(le).forEach((k) => {
    if (blank(le[k]) || blank(fe[k])) return;
    const v = detailSim(le[k], fe[k]);
    if (v === null) return;
    rows.push({ label: (l.xl && l.xl[k]) || (f.xl && f.xl[k]) || k, v, lost: String(le[k]) });
  });
  if (rows.length) return rows;
  // older records without separate answers: compare the written summary instead
  const v = textSim(l.contents, f.other);
  return v === null ? [] : [{ label: "Hidden details", v, lost: l.contents, fb: true }];
}

function evaluate(l, f) {
  const parts = [];
  W.forEach(([lk, fk, wt, loose, label]) => {
    const v = textSim(l[lk], f[fk], loose);
    if (v !== null) parts.push({ k: lk, label, v, wt, lost: l[lk], found: f[fk], loose });
  });
  const spec = specificRows(l, f);
  spec.forEach((r) =>
    parts.push({ k: "spec", label: r.label, v: r.v, wt: SPECIFIC_W / spec.length, lost: r.lost, found: "", hidden: true, fb: r.fb })
  );

  let s = 0, w = 0;
  parts.forEach((p) => { s += p.v * p.wt; w += p.wt; });
  let total = w ? (s / w) * 100 : 0;

  const flags = [];
  let cap = 100;
  parts.forEach((p) => {
    if (p.k === "spec") {
      if (p.v < 0.5) { flags.push(p.fb ? "Hidden details do not match" : `${p.label} is different`); cap = Math.min(cap, 80); }
      return;
    }
    const c = CAPS[p.k];
    if (c && p.v < c[0]) { flags.push(c[2]); cap = Math.min(cap, c[1]); }
  });
  if (l.cat && f.cat && l.cat !== f.cat) { flags.push("Category is different"); cap = Math.min(cap, 75); }

  total = Math.min(total, cap);
  if (flags.length > 1) total -= 5 * (flags.length - 1); // every extra mistake lowers it more
  const groups = parts.filter((p) => p.k !== "spec").length + (spec.length ? 1 : 0);
  if (groups < MIN_GROUPS) { flags.push("Not enough details to verify"); total = Math.min(total, 84); }

  return { score: Math.max(0, Math.round(total)), flags, parts };
}

export const score = (l, f) => evaluate(l, f).score;
export const why = (l, f) => evaluate(l, f).flags;

// how much of the claimant's proof appears in the hidden details on record
export function proofScore(proof, f) {
  const v = detailSim(proof, f.other, false);
  return v === null ? null : Math.round(v * 100);
}

// breakdown per detail: why a lost report matches a found item
export function explain(l, f) {
  return evaluate(l, f).parts.map((p) => {
    const hidden = !!p.hidden; // hidden details on the found item are not shown
    const A = hidden ? [] : keywords(p.lost, p.loose), B = hidden ? [] : keywords(p.found, p.loose);
    const shared = A.filter((a) => B.some((b) => sim1(a, b) >= 0.75));
    return { label: p.label, pct: Math.round(p.v * 100), lost: p.lost, found: hidden ? "" : p.found, shared, hidden };
  });
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