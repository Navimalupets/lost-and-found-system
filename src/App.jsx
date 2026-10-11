import { useState, useEffect } from "react";
import { lev, sim1, runMatch, sameness } from "./matching";

/* =====================  DATA  ===================== */
const KEY = "lf-system-v2";
const THRESHOLD = 45;
const CATEGORIES = ["Electronics", "Wallets & bags", "Accessories", "Clothing", "Personal items", "Books & supplies", "Other"];

function makeSeed() {
  const found = [
    { id: 1, name: "Black Umbrella", cat: "Accessories", color: "Black", brand: "Totes", desc: "Large folding umbrella with a wooden handle", loc: "Library entrance", dt: "2026-09-28T10:30", other: "Initials 'MR' written on the strap", status: "Available" },
    { id: 2, name: "Blue Water Bottle", cat: "Personal items", color: "Blue", brand: "Hydro Flask", desc: "Insulated bottle with a dented bottom and stickers", loc: "Gym", dt: "2026-10-01T15:10", other: "Sticker of a cat on the lid", status: "Available" },
    { id: 3, name: "Scientific Calculator", cat: "Electronics", color: "Gray", brand: "Casio", desc: "fx-991 calculator with a cracked cover", loc: "Room 204", dt: "2026-10-02T09:00", other: "Name tape inside battery cover", status: "Available" },
    { id: 4, name: "Red Wallet", cat: "Wallets & bags", color: "Red", brand: "Fossil", desc: "Small leather wallet with a zipper", loc: "Canteen", dt: "2026-10-03T12:20", other: "Contains a student ID and 2 library cards", status: "Available" },
    { id: 5, name: "USB-C Wall Charger", cat: "Electronics", color: "White", brand: "Anker", desc: "White 20W wall charger with a short cable", loc: "Computer Laboratory", dt: "2026-10-04T14:00", other: "Scratch near the plug", status: "Available" },
    { id: 6, name: "Blue Student Backpack", cat: "Wallets & bags", color: "Blue", brand: "", desc: "Blue backpack with a front zipper pocket", loc: "Academic Building hallway", dt: "2026-10-05T08:15", other: "Keychain shaped like a star", status: "Available" },
  ];
  const lostRaw = [
    { id: 7, item: "Umbrlla", cat: "Accessories", color: "Black", brand: "Totes", looks: "Big foldable umbrela with wooden handle", contents: "", where: "Library" },
    { id: 8, item: "Red walet", cat: "Wallets & bags", color: "Red", brand: "Fossil", looks: "Small leather wallet", contents: "Student ID", where: "Canteen" },
    { id: 9, item: "USB C wall charger", cat: "Electronics", color: "White", brand: "Anker", looks: "20W charger", contents: "", where: "Computer Laboratory" },
  ];
  const lost = lostRaw.map((l) => ({ ...l, matches: runMatch(l, found, THRESHOLD).matches }));
  return { found, lost, claims: [], nid: 10, thr: THRESHOLD };
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.found) return s;
  } catch (e) {}
  return makeSeed();
}

const allPairs = (S) =>
  S.lost
    .flatMap((l) =>
      l.matches.map((m) => ({ lost: l, found: S.found.find((f) => f.id === m.foundId), score: m.score }))
    )
    .filter((p) => p.found)
    .sort((a, b) => b.score - a.score);

/* =====================  NAV CONFIG  ===================== */
const NAV = [
  { section: "Your space", area: "Student & campus services", items: [["overview", "Overview", "home"], ["browse", "Browse reports", "search"], ["matches", "Possible matches", "heart"], ["mine", "My reports", "filePlus"]] },
  { section: "Guidance office", area: "Guidance office", items: [["claims", "Claims to review", "check"], ["log", "Log found item", "box"]] },
  { section: "System", area: "System", items: [["engine", "Matching engine", "sliders"]] },
];

const HEADS = {
  overview: ["Overview", "A quick look at what is lost, what has been found, and what needs a decision."],
  browse: ["Browse reports", "See what has been turned in and what others are looking for."],
  matches: ["Possible matches", "A shared place to report, search, and carefully reconnect campus belongings."],
  mine: ["My reports", "Track your lost item reports and the claims you have sent."],
  report: ["Report a lost item", "Answer a few questions. The system compares your answers with found items."],
  claims: ["Claims to review", "Compare each student's proof with the hidden details on record."],
  log: ["Log found item", "Record an item that was brought to the Guidance Office."],
  engine: ["Matching engine", "See how similarity is calculated and adjust how strict matching is."],
};

const areaOf = (page) => NAV.find((n) => n.items.some(([id]) => id === page))?.area ?? "Student & campus services";

/* =====================  ICONS  ===================== */
const ICONS = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  heart: "M12 21s-7-4.5-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.5-9 9-9 9z",
  filePlus: "M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5M12 12v6M9 15h6",
  file: "M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5M9 13h6M9 17h4",
  check: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
  box: "M21 8l-9-5-9 5v8l9 5 9-5V8zM3.3 7.5L12 12l8.7-4.5M12 22V12",
  sliders: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
  plus: "M12 5v14M5 12h14",
  menu: "M3 6h18M3 12h18M3 18h18",
  arrow: "M5 12h14M13 6l6 6-6 6",
  chevron: "M9 6l6 6-6 6",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  help: "M12 22a10 10 0 100-20 10 10 0 000 20zM9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4",
};

function Icon({ name, size = 20, className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

const TAG_CLASS = { Approved: "ok", Released: "ok", Rejected: "bad", Pending: "warn" };
const Badge = ({ s }) => <span className={`tag ${TAG_CLASS[s] || ""}`}>{s}</span>;
const fmtDate = (dt) => new Date(dt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

function Field({ id, label, placeholder = "", value, onChange, textarea = false }) {
  return (
    <>
      <label htmlFor={id}>{label}</label>
      {textarea ? (
        <textarea id={id} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </>
  );
}

function PageHead({ page }) {
  const [title, sub] = HEADS[page];
  return (
    <div className="page-head">
      <div className="eyebrow">PDM Campus / Lost &amp; Found</div>
      <h1>{title}</h1>
      <p>{sub}</p>
    </div>
  );
}

/* =====================  POSSIBLE MATCHES  ===================== */
function PairCard({ pair, claim, onNotMine, onSendClaim }) {
  const { lost, found, score } = pair;
  const [open, setOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [proof, setProof] = useState("");
  const chips = sameness(lost, found);
  const toggle = () => setOpen((o) => !o);

  return (
    <article className="pair-card">
      <div
        className="pair"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
      >
        <div className="score"><b>{score}%</b><span>text similarity</span></div>
        <div className="side lost-side">
          <span className="kind lost">Lost</span>
          <h3>{lost.item}</h3>
          <p>{[lost.where, lost.cat].filter(Boolean).join(" · ")}</p>
        </div>
        <Icon name="arrow" className="arrow" />
        <div className="side found-side">
          <span className="kind found">Found</span>
          <h3>{found.name}</h3>
          <p>{[found.loc, found.cat].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="chips">{chips.map((c) => <span className="chip" key={c}>{c}</span>)}</div>
        <Icon name="chevron" className={`chev ${open ? "open" : ""}`} />
      </div>

      {open && (
        <div className="pair-detail">
          <div className="detail-cols">
            <div>
              <h4 className="eyebrow">What was reported lost</h4>
              <dl>
                <div><dt>Looks like</dt><dd>{lost.looks || "Not provided"}</dd></div>
                <div><dt>Color and brand</dt><dd>{[lost.color, lost.brand].filter(Boolean).join(", ") || "Not provided"}</dd></div>
                <div><dt>Contents</dt><dd>{lost.contents || "Not provided"}</dd></div>
              </dl>
            </div>
            <div>
              <h4 className="eyebrow">What was found</h4>
              <dl>
                <div><dt>Description</dt><dd>{found.desc || "Not provided"}</dd></div>
                <div><dt>Color and brand</dt><dd>{[found.color, found.brand].filter(Boolean).join(", ") || "Not provided"}</dd></div>
                <div><dt>Found at</dt><dd>{found.loc}, {fmtDate(found.dt)}</dd></div>
              </dl>
            </div>
          </div>
          <div className="bar"><i style={{ width: `${score}%` }} /></div>

          <div className="claim-zone">
            {claim ? (
              <>
                <p style={{ margin: 0 }}>Your claim: <Badge s={claim.status} /></p>
                {claim.note && <p className="sub" style={{ margin: "8px 0 0" }}>{claim.note}</p>}
                {claim.status === "Approved" && <p style={{ margin: "8px 0 0" }}><b>Visit the Guidance Office to receive your item.</b></p>}
                {claim.status === "Released" && <p style={{ margin: "8px 0 0" }}><b>Item received. Case closed.</b></p>}
              </>
            ) : found.status !== "Available" ? (
              <p style={{ margin: 0 }}><Badge s="Claimed" /> This item was claimed by another student.</p>
            ) : (
              <>
                <button className="btn sm" onClick={() => setClaiming(true)}>This is mine – submit claim</button>
                <button className="btn sm ghost" onClick={() => onNotMine(lost.id, found.id)}>Not mine</button>
                {claiming && (
                  <div>
                    <label htmlFor={`pf-${lost.id}-${found.id}`}>How can you prove it is yours?</label>
                    <textarea
                      id={`pf-${lost.id}-${found.id}`}
                      autoFocus
                      value={proof}
                      placeholder="Describe marks, contents, or details only the owner would know"
                      onChange={(e) => setProof(e.target.value)}
                    />
                    <button className="btn sm" onClick={() => onSendClaim(lost.id, found.id, proof)}>Send claim</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function MatchesPage({ S, go, onNotMine, onSendClaim }) {
  const pairs = allPairs(S);
  return (
    <div className="stack">
      <section className="hero">
        <span className="ico"><Icon name="sparkle" size={26} /></span>
        <div>
          <div className="eyebrow">Text comparison demo</div>
          <h2>Similar words can be a useful lead.</h2>
          <p>
            The Levenshtein algorithm counts the insertions, deletions, and substitutions needed to turn one word into another.
            Each pair below is a Lost report compared with a Found item. Every suggestion still needs a person to confirm it.
          </p>
        </div>
      </section>

      <div className="formula">
        <span className="lbl">Similarity</span>
        <span className="eq">(1 − edit distance ÷ longest string) × 100</span>
        <span className="note">Scores are illustrative and are not calibrated for real campus decisions.</span>
      </div>

      <div className="section-head">
        <div>
          <div className="eyebrow">Ranked candidates</div>
          <h2>{pairs.length} possible pair{pairs.length === 1 ? "" : "s"}</h2>
        </div>
        <span className="pill"><Icon name="shield" size={18} /> Staff verification required</span>
      </div>

      {pairs.length ? (
        <div className="pair-list" style={{ marginTop: 0 }}>
          {pairs.map((p) => (
            <PairCard
              key={`${p.lost.id}-${p.found.id}`}
              pair={p}
              claim={S.claims.find((c) => c.lostId === p.lost.id && c.foundId === p.found.id)}
              onNotMine={onNotMine}
              onSendClaim={onSendClaim}
            />
          ))}
        </div>
      ) : (
        <div className="empty">
          No possible matches yet.
          <div><button className="btn sm" onClick={() => go("report")}>Report a lost item</button></div>
        </div>
      )}
    </div>
  );
}

/* =====================  OVERVIEW  ===================== */
function Overview({ S, go }) {
  const pairs = allPairs(S);
  const returned = S.claims.filter((c) => c.status === "Released").length;
  const waiting = S.found.filter((f) => f.status === "Available").length;
  return (
    <div className="stack">
      <div className="stats">
        <div className="stat"><b>{S.lost.length}</b><span>Lost reports</span></div>
        <div className="stat"><b>{waiting}</b><span>Found items waiting for owners</span></div>
        <div className="stat"><b>{pairs.length}</b><span>Possible matches</span></div>
        <div className="stat"><b>{returned}</b><span>Items returned</span></div>
      </div>

      <section className="card">
        <div className="row">
          <div>
            <h2>Top possible matches</h2>
            <p className="sub" style={{ margin: 0 }}>The highest scoring pairs right now.</p>
          </div>
          <button className="btn sm ghost" style={{ margin: 0 }} onClick={() => go("matches")}>See all matches</button>
        </div>
        <div style={{ marginTop: 10 }}>
          {pairs.length ? (
            pairs.slice(0, 3).map((p) => (
              <div className="mini" key={`${p.lost.id}-${p.found.id}`}>
                <b className="s">{p.score}%</b>
                <span>{p.lost.item} → <b>{p.found.name}</b></span>
              </div>
            ))
          ) : (
            <div className="empty">No matches yet. Report a lost item to get started.</div>
          )}
        </div>
      </section>

      <div className="grid2">
        <button className="btn ghost" style={{ margin: 0, padding: 18, textAlign: "left" }} onClick={() => go("report")}>
          Report a lost item
        </button>
        <button className="btn ghost" style={{ margin: 0, padding: 18, textAlign: "left" }} onClick={() => go("browse")}>
          Browse found items
        </button>
      </div>
    </div>
  );
}

/* =====================  BROWSE  ===================== */
function Browse({ S }) {
  const [tab, setTab] = useState("found");
  return (
    <div>
      <div className="tabs" role="group" aria-label="Report type">
        <button className={tab === "found" ? "on" : ""} onClick={() => setTab("found")}>Found items ({S.found.length})</button>
        <button className={tab === "lost" ? "on" : ""} onClick={() => setTab("lost")}>Lost reports ({S.lost.length})</button>
      </div>

      <div className="grid2" style={{ marginTop: 14 }}>
        {tab === "found"
          ? S.found.map((f) => (
              <div className="item" key={f.id}>
                <div className="row">
                  <span className="kind found">Found</span>
                  <span className={`tag ${f.status === "Released" ? "ok" : ""}`}>{f.status}</span>
                </div>
                <h3 style={{ marginTop: 8 }}>{f.name}</h3>
                <p>{[f.cat, f.color, f.brand].filter(Boolean).join(" · ")}</p>
                <p>{f.desc}</p>
                <p>Found at {f.loc}, {fmtDate(f.dt)}</p>
              </div>
            ))
          : S.lost.length
          ? S.lost.slice().reverse().map((l) => (
              <div className="item" key={l.id}>
                <div className="row">
                  <span className="kind lost">Lost</span>
                  <span className="tag">{l.matches.length} possible match{l.matches.length === 1 ? "" : "es"}</span>
                </div>
                <h3 style={{ marginTop: 8 }}>{l.item}</h3>
                <p>{[l.cat, l.color, l.brand].filter(Boolean).join(" · ")}</p>
                <p>Lost near {l.where || "an unknown place"}</p>
              </div>
            ))
          : <div className="empty">No lost reports yet.</div>}
      </div>
    </div>
  );
}

/* =====================  MY REPORTS / REPORT FORM  ===================== */
function MyReports({ S, go }) {
  const mine = S.lost.slice().reverse();
  if (!mine.length)
    return (
      <div className="empty">
        You have not reported anything yet.
        <div><button className="btn sm" onClick={() => go("report")}>Report a lost item</button></div>
      </div>
    );
  return (
    <div className="stack">
      {mine.map((l) => {
        const claims = S.claims.filter((c) => c.lostId === l.id);
        return (
          <section className="card" key={l.id}>
            <div className="row">
              <h2 style={{ margin: 0 }}>{l.item}</h2>
              <span className="tag">{l.matches.length ? `${l.matches.length} possible match${l.matches.length > 1 ? "es" : ""}` : "No match found"}</span>
            </div>
            <p className="sub" style={{ marginTop: 6 }}>{[l.cat, l.color, l.brand, l.where].filter(Boolean).join(" · ")}</p>
            {l.matches.length ? (
              <div className="list">
                {l.matches.map((m) => {
                  const f = S.found.find((x) => x.id === m.foundId);
                  const c = claims.find((x) => x.foundId === m.foundId);
                  return (
                    <div className="item" key={m.foundId}>
                      <div className="row">
                        <h3>{f.name} <span style={{ color: "var(--gold)" }}>· {m.score}%</span></h3>
                        {c ? <Badge s={c.status} /> : <span className="tag">No claim yet</span>}
                      </div>
                      {c?.note && <p>{c.note}</p>}
                    </div>
                  );
                })}
                <div><button className="btn sm ghost" style={{ margin: 0 }} onClick={() => go("matches")}>Open in Possible matches</button></div>
              </div>
            ) : (
              <p className="sub" style={{ margin: 0 }}>Nothing similar has been turned in yet. Check back after Guidance logs new items.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

const EMPTY_LOST = { item: "", cat: "Other", color: "", brand: "", looks: "", contents: "", where: "" };

function ReportPage({ onSubmitLost, toast }) {
  const [form, setForm] = useState(EMPTY_LOST);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = () => {
    if (!form.item.trim()) return toast("Tell us what item you lost.");
    onSubmitLost(form);
    setForm(EMPTY_LOST);
  };
  return (
    <section className="card" style={{ maxWidth: 680 }}>
      <Field id="q-item" label="What item did you lose?" placeholder="e.g. black umbrella" value={form.item} onChange={set("item")} />
      <label htmlFor="q-cat">Category</label>
      <select id="q-cat" value={form.cat} onChange={(e) => set("cat")(e.target.value)}>
        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
      </select>
      <div className="cols">
        <div><Field id="q-color" label="What color is it?" value={form.color} onChange={set("color")} /></div>
        <div><Field id="q-brand" label="What brand?" value={form.brand} onChange={set("brand")} /></div>
      </div>
      <Field id="q-looks" label="What does it look like?" placeholder="Size, marks, condition" textarea value={form.looks} onChange={set("looks")} />
      <Field id="q-contents" label="What are its contents?" placeholder="Anything inside or attached" textarea value={form.contents} onChange={set("contents")} />
      <Field id="q-where" label="Where did you lose it?" placeholder="e.g. library" value={form.where} onChange={set("where")} />
      <button className="btn" onClick={submit}>Submit lost item details</button>
    </section>
  );
}

/* =====================  GUIDANCE  ===================== */
function ClaimCard({ claim, S, onApprove, onReject, onRelease }) {
  const f = S.found.find((x) => x.id === claim.foundId);
  const l = S.lost.find((x) => x.id === claim.lostId);
  return (
    <div className="item">
      <div className="row"><h3>{f.name}</h3><Badge s={claim.status} /></div>
      <div className="proof"><b>Student reported</b>{l.item}, {l.color}, {l.brand}: {l.looks}</div>
      <div className="proof"><b>Proof of ownership</b>{claim.proof}</div>
      <div className="proof"><b>Hidden details on record</b>{f.other || "None recorded"}</div>
      {claim.status === "Pending" ? (
        <>
          <p style={{ margin: "12px 0 0", fontWeight: 700, color: "var(--ink)" }}>Owner verified?</p>
          <button className="btn sm ok" onClick={() => onApprove(claim.id)}>Yes – approve claim</button>
          <button className="btn sm bad" onClick={() => onReject(claim.id)}>No – reject claim</button>
        </>
      ) : (
        <button className="btn sm" onClick={() => onRelease(claim.id)}>Release item</button>
      )}
    </div>
  );
}

function ClaimsPage({ S, onApprove, onReject, onRelease }) {
  const pend = S.claims.filter((c) => ["Pending", "Approved"].includes(c.status));
  return pend.length ? (
    <div className="stack">
      {pend.slice().reverse().map((c) => (
        <ClaimCard key={c.id} claim={c} S={S} onApprove={onApprove} onReject={onReject} onRelease={onRelease} />
      ))}
    </div>
  ) : (
    <div className="empty">No claims waiting.</div>
  );
}

const EMPTY_FOUND = { name: "", cat: "Electronics", color: "", brand: "", loc: "", desc: "", dt: "", other: "" };

function LogPage({ onSaveFound, toast }) {
  const [form, setForm] = useState(EMPTY_FOUND);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const save = () => {
    if (!form.name.trim()) return toast("Enter the item name.");
    onSaveFound(form);
    setForm(EMPTY_FOUND);
  };
  return (
    <section className="card" style={{ maxWidth: 680 }}>
      <Field id="f-name" label="Item name" value={form.name} onChange={set("name")} />
      <div className="cols">
        <div>
          <label htmlFor="f-cat">Category</label>
          <select id="f-cat" value={form.cat} onChange={(e) => set("cat")(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div><Field id="f-color" label="Color" value={form.color} onChange={set("color")} /></div>
      </div>
      <div className="cols">
        <div><Field id="f-brand" label="Brand" value={form.brand} onChange={set("brand")} /></div>
        <div><Field id="f-loc" label="Location found" value={form.loc} onChange={set("loc")} /></div>
      </div>
      <Field id="f-desc" label="Description" textarea value={form.desc} onChange={set("desc")} />
      <label htmlFor="f-dt">Date and time found</label>
      <input type="datetime-local" id="f-dt" value={form.dt} onChange={(e) => set("dt")(e.target.value)} />
      <Field id="f-other" label="Other identifying details" placeholder="Hidden from students; used to verify ownership" textarea value={form.other} onChange={set("other")} />
      <button className="btn" onClick={save}>Save found item record</button>
    </section>
  );
}

/* =====================  SYSTEM  ===================== */
function EnginePage({ S, log, onThreshold, onReset }) {
  const [a, setA] = useState("umbrlla");
  const [b, setB] = useState("umbrella");
  const la = a.toLowerCase(), lb = b.toLowerCase();
  return (
    <div className="stack">
      <section className="card">
        <h2>How matching works</h2>
        <p className="sub">When a lost item is submitted, each answer is compared with the same detail on every available found item. Scores are averaged by weight.</p>
        <p style={{ margin: "0 0 6px" }}>
          <b>Retrieve</b> records → <b>compare</b> → <b>Levenshtein distance</b> → <b>similarity</b> → <b>possible match?</b>
        </p>
        <label htmlFor="thr">Minimum similarity: {S.thr}%</label>
        <input type="range" id="thr" min="10" max="90" value={S.thr} onChange={(e) => onThreshold(+e.target.value)} />

        <h2 style={{ marginTop: 26 }}>Last comparison</h2>
        {log.length ? (
          <div className="list">
            {log.map((x, i) => (
              <div className="row" key={i}>
                <span>{x.name}</span>
                <span className={`tag ${x.ok ? "ok" : "bad"}`}>{x.score}% – {x.ok ? "possible match" : "no match"}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty" style={{ marginTop: 10 }}>Submit a lost item to see how each found item scored.</div>
        )}
        <button className="btn ghost" onClick={onReset}>Reset demo data</button>
      </section>

      <section className="card" style={{ maxWidth: 680 }}>
        <h2>Try Levenshtein distance</h2>
        <p className="sub">Type two words to see how many edits separate them.</p>
        <Field id="ta" label="Word A" value={a} onChange={setA} />
        <Field id="tb" label="Word B" value={b} onChange={setB} />
        <div className="lev">
          {!a && !b ? "Edits needed: –" : (
            <>
              Edits needed: <b>{lev(la, lb)}</b><br />
              Similarity: <b>{Math.round(sim1(la, lb) * 100)}%</b>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

/* =====================  APP  ===================== */
export default function App() {
  const [S, setS] = useState(load);
  const [page, setPage] = useState("matches");
  const [navOpen, setNavOpen] = useState(false);
  const [log, setLog] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }, [S]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 2400);
    return () => clearTimeout(t);
  }, [msg]);

    // stop the page behind the menu from scrolling on phones
  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [navOpen]);

  const toast = (m) => setMsg(m);
  const go = (p) => { setPage(p); setNavOpen(false); window.scrollTo(0, 0); };

  /* ----- actions ----- */
  const submitLost = (form) => {
    const l = { id: S.nid, ...form };
    const { matches, log: newLog } = runMatch(l, S.found, S.thr);
    l.matches = matches;
    setLog(newLog);
    setS((p) => ({ ...p, lost: [...p.lost, l], nid: p.nid + 1 }));
    toast(matches.length ? "Possible match found." : "No match found yet.");
    go(matches.length ? "matches" : "mine");
  };

  const notMine = (lostId, foundId) => {
    setS((p) => ({
      ...p,
      lost: p.lost.map((l) => (l.id === lostId ? { ...l, matches: l.matches.filter((m) => m.foundId !== foundId) } : l)),
    }));
    toast("Match dismissed.");
  };

  const sendClaim = (lostId, foundId, proof) => {
    if (!proof.trim()) return toast("Add your proof of ownership.");
    setS((p) => ({
      ...p,
      claims: [...p.claims, { id: p.nid, lostId, foundId, proof: proof.trim(), status: "Pending", note: "Waiting for Guidance to review." }],
      nid: p.nid + 1,
    }));
    toast("Claim submitted.");
  };

  const saveFound = (form) => {
    const f = { id: S.nid, ...form, dt: form.dt || new Date().toISOString().slice(0, 16), status: "Available" };
    setS((p) => ({ ...p, found: [...p.found, f], nid: p.nid + 1 }));
    toast("Found item saved.");
    go("browse");
  };

  const updateClaim = (claimId, patch, foundStatus) =>
    setS((p) => {
      const c = p.claims.find((x) => x.id === claimId);
      return {
        ...p,
        claims: p.claims.map((x) => (x.id === claimId ? { ...x, ...patch } : x)),
        found: foundStatus ? p.found.map((f) => (f.id === c.foundId ? { ...f, status: foundStatus } : f)) : p.found,
      };
    });

  const approve = (id) => { updateClaim(id, { status: "Approved", note: "Ownership verified. Collect your item at the Guidance Office." }, "Claimed"); toast("Claim approved."); };
  const reject = (id) => { updateClaim(id, { status: "Rejected", note: "Ownership could not be verified." }); toast("Claim rejected."); };
  const release = (id) => { updateClaim(id, { status: "Released", note: "" }, "Released"); toast("Item released to owner."); };

  const setThreshold = (thr) => setS((p) => ({ ...p, thr }));
  const reset = () => { setS(makeSeed()); setLog([]); toast("Demo data restored."); };

  const COUNTS = {
    matches: allPairs(S).length,
    claims: S.claims.filter((c) => c.status === "Pending").length,
  };

  const VIEWS = {
    overview: <Overview S={S} go={go} />,
    browse: <Browse S={S} />,
    matches: <MatchesPage S={S} go={go} onNotMine={notMine} onSendClaim={sendClaim} />,
    mine: <MyReports S={S} go={go} />,
    report: <ReportPage onSubmitLost={submitLost} toast={toast} />,
    claims: <ClaimsPage S={S} onApprove={approve} onReject={reject} onRelease={release} />,
    log: <LogPage onSaveFound={saveFound} toast={toast} />,
    engine: <EnginePage S={S} log={log} onThreshold={setThreshold} onReset={reset} />,
  };

  return (
    <div className="shell">
      <aside className={`sidebar ${navOpen ? "open" : ""}`}>
        <div className="brand">
          <span className="logo"><Icon name="file" size={22} /></span>
          <div><small>PDM</small><b>found</b></div>
        </div>

        <div className="campus">
          <b><i />Pambayang Dalubhasaan ng Marilao</b>
          <small>Campus service</small>
        </div>

        <nav aria-label="Main">
          {NAV.map((group) => (
            <div key={group.section}>
              <div className="eyebrow nav-label">{group.section}</div>
              {group.items.map(([id, label, icon]) => (
                <button key={id} className={`nav-item ${page === id ? "on" : ""}`} onClick={() => go(id)}>
                  <Icon name={icon} />
                  <span>{label}</span>
                  {COUNTS[id] > 0 && <span className="count">{COUNTS[id]}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="help">
          <span className="ico"><Icon name="help" /></span>
          <b>How matching works</b>
          <p>Small spelling differences can still point to a useful lead.</p>
          <button onClick={() => go("engine")}>See the demo <Icon name="arrow" size={16} /></button>
        </div>
        <div className="side-foot"><i /> Prototype, saved in this browser</div>
      </aside>
      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}

      <div className="content">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setNavOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <div className="crumbs eyebrow">
            <span>{areaOf(page)}</span>
            <Icon name="chevron" size={14} />
            <span className="cur">{HEADS[page][0]}</span>
          </div>
          <div className="top-actions">
            <span className="demo-flag"><i /> Browser-only demo</span>
            <button className="btn-primary" onClick={() => go("report")}><Icon name="filePlus" size={19} /> New report</button>
          </div>
        </header>

        <main className="page">
          <PageHead page={page} />
          {VIEWS[page]}
        </main>
      </div>

      <div id="toast" role="status" className={msg ? "show" : ""}>{msg}</div>
    </div>
  );
}