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

const norm = (s) =>
  String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);

export const sim1 = (a, b) => {
  const L = Math.max(a.length, b.length);
  return L ? 1 - lev(a, b) / L : 1;
};

export function textSim(a, b) {
  const A = norm(a), B = norm(b);
  if (!A.length || !B.length) return null;
  const dir = (X, Y) => X.reduce((s, x) => s + Math.max(...Y.map((y) => sim1(x, y))), 0) / X.length;
  return (dir(A, B) + dir(B, A)) / 2;
}

// [lost field, found field, weight]
const W = [
  ["item", "name", 0.3],
  ["color", "color", 0.15],
  ["brand", "brand", 0.15],
  ["looks", "desc", 0.15],
  ["contents", "other", 0.1],
  ["where", "loc", 0.15],
];

export function score(l, f) {
  let s = 0, w = 0;
  W.forEach(([lk, fk, wt]) => {
    const v = textSim(l[lk], f[fk]);
    if (v !== null) { s += v * wt; w += wt; }
  });
  return w ? Math.round((s / w) * 100) : 0;
}

// Returns { matches, log }
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

// Which details are the same between a lost report and a found item (for the chips)
export function sameness(l, f) {
  const out = [];
  if (l.cat && f.cat && l.cat === f.cat) out.push("Same category");
  if ((textSim(l.color, f.color) ?? 0) >= 0.8) out.push("Same color");
  if ((textSim(l.where, f.loc) ?? 0) >= 0.6) out.push("Same area");
  return out;
}