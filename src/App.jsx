import { useState, useEffect } from "react";
import { detectType, TYPES, GENERIC, buildOther } from "./itemTypes";
import { lev, runMatch, sameness, keywords, textSim, explain } from "./matching";

/* =====================  DATA  ===================== */
const KEY = "lf-system-v2";
const THRESHOLD = 60;   // minimum to appear as a possible match
const CLAIM_MIN = 80;   // minimum to be allowed to submit a claim
const YEAR_LEVELS = ["1st year", "2nd year", "3rd year", "4th year"];
const EMPTY_CLAIMER = { name: "", sid: "", course: "", year: "1st year", section: "", room: "" };
const CATEGORIES = ["Electronics", "Wallets & bags", "Accessories", "Clothing", "Personal items", "Books & supplies", "Other"];

function makeSeed() {
  const found = [
    { id: 1, name: "Black Umbrella", cat: "Personal items", color: "Black", brand: "Totes", desc: "Large folding umbrella with a wooden handle", loc: "Library entrance", dt: "2026-09-28T10:30", other: "Initials 'MR' written on the strap", status: "Available" },
    { id: 2, name: "Blue Water Bottle", cat: "Personal items", color: "Blue", brand: "Hydro Flask", desc: "Insulated bottle with a dented bottom and stickers", loc: "Gym", dt: "2026-10-01T15:10", other: "Sticker of a cat on the lid", status: "Available" },
    { id: 3, name: "Scientific Calculator", cat: "Electronics", color: "Gray", brand: "Casio", desc: "fx-991 calculator with a cracked cover", loc: "Room 204", dt: "2026-10-02T09:00", other: "Name tape inside battery cover", status: "Available" },
    { id: 4, name: "Red Wallet", cat: "Wallets & bags", color: "Red", brand: "Fossil", desc: "Small leather wallet with a zipper", loc: "Canteen", dt: "2026-10-03T12:20", other: "Contains a student ID and 2 library cards", status: "Available" },
    { id: 5, name: "USB-C Wall Charger", cat: "Electronics", color: "White", brand: "Anker", desc: "White 20W wall charger with a short cable", loc: "Computer Laboratory", dt: "2026-10-04T14:00", other: "Scratch near the plug", status: "Available" },
    { id: 6, name: "Blue Student Backpack", cat: "Wallets & bags", color: "Blue", brand: "", desc: "Blue backpack with a front zipper pocket", loc: "Academic Building hallway", dt: "2026-10-05T08:15", other: "Keychain shaped like a star", status: "Available" },
  ];
  const lostRaw = [
    { id: 7, item: "Umbrlla", cat: "Personal items", color: "Black", brand: "Totes", looks: "Big foldable umbrela with wooden handle", contents: "", where: "Library" },
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
  { section: "Your space", area: "Student & campus services", items: [["overview", "Overview", "home"], ["browse", "Browse reports", "search"], ["mine", "My reports", "filePlus"]] },
  { section: "Guidance office", area: "Guidance office", items: [["claims", "Claims to review", "check"], ["log", "Log found item", "box"]] },
  { section: "System", area: "System", items: [["engine", "Matching engine", "sliders"]] },
];

const HEADS = {
  overview: ["Overview", "A quick look at what is lost, what has been found, and what needs a decision."],
  browse: ["Browse reports", "Tap a report to see its details and any possible matches."],
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
  filePlus: "M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5M12 12v6M9 15h6",
  file: "M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5M9 13h6M9 17h4",
  check: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
  box: "M21 8l-9-5-9 5v8l9 5 9-5V8zM3.3 7.5L12 12l8.7-4.5M12 22V12",
  sliders: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
  menu: "M3 6h18M3 12h18M3 18h18",
  arrow: "M5 12h14M13 6l6 6-6 6",
  chevron: "M9 6l6 6-6 6",
  moon: "M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z",
  sun: "M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
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
          <button className="btn sm ghost" style={{ margin: 0 }} onClick={() => go("browse", "lost")}>See lost reports</button>
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
        <button className="btn ghost" style={{ margin: 0, padding: 18, textAlign: "left" }} onClick={() => go("browse", "found")}>
          Browse found items
        </button>
      </div>
    </div>
  );
}

/* =====================  BROWSE  ===================== */
function ClaimZone({ lost, found, claim, canClaim, onNotMine, onSendClaim }) {
  const [claiming, setClaiming] = useState(false);
  const [proof, setProof] = useState("");
  const [who, setWho] = useState(EMPTY_CLAIMER);
  const set = (k) => (v) => setWho((w) => ({ ...w, [k]: v }));
  const p = `${lost.id}-${found.id}`;

  return (
    <div className="claim-zone">
      {claim ? (
        <>
          <p style={{ margin: 0 }}>Your claim: <Badge s={claim.status} /></p>
          {claim.claimer && <p className="sub" style={{ margin: "8px 0 0" }}>Submitted by {claim.claimer.name} ({claim.claimer.sid})</p>}
          {claim.note && <p className="sub" style={{ margin: "8px 0 0" }}>{claim.note}</p>}
          {claim.status === "Approved" && <p style={{ margin: "8px 0 0" }}><b>Visit the Guidance Office to receive your item.</b></p>}
          {claim.status === "Released" && <p style={{ margin: "8px 0 0" }}><b>Item received. Case closed.</b></p>}
        </>
      ) : found.status !== "Available" ? (
        <p style={{ margin: 0 }}><Badge s="Claimed" /> This item was claimed by another student.</p>
      ) : (
        <>
          {canClaim ? (
            !claiming && <button className="btn sm" onClick={() => setClaiming(true)}>This is mine – submit claim</button>
          ) : (
            <p className="sub" style={{ margin: "0 0 4px" }}>
              This is only a similar item. Claiming opens at {CLAIM_MIN}% or higher. Visit the Guidance Office if you think it is yours.
            </p>
          )}
          {!claiming && <button className="btn sm ghost" onClick={() => onNotMine(lost.id, found.id)}>Not mine</button>}

          {claiming && (
            <div>
              <h4 className="eyebrow" style={{ marginTop: 6 }}>Claimant information</h4>
              <Field id={`cn-${p}`} label="Full name" placeholder="Last name, First name M.I." value={who.name} onChange={set("name")} />
              <div className="cols">
                <div><Field id={`cs-${p}`} label="Student ID" value={who.sid} onChange={set("sid")} /></div>
                <div><Field id={`cc-${p}`} label="Course" placeholder="e.g. BSIT" value={who.course} onChange={set("course")} /></div>
              </div>
              <div className="cols">
                <div>
                  <label htmlFor={`cy-${p}`}>Year level</label>
                  <select id={`cy-${p}`} value={who.year} onChange={(e) => set("year")(e.target.value)}>
                    {YEAR_LEVELS.map((y) => <option key={y}>{y}</option>)}
                  </select>
                </div>
                <div><Field id={`cx-${p}`} label="Section" value={who.section} onChange={set("section")} /></div>
              </div>
              <Field id={`cr-${p}`} label="Room number" value={who.room} onChange={set("room")} />

              <label htmlFor={`pf-${p}`}>How can you prove it is yours?</label>
              <textarea
                id={`pf-${p}`}
                value={proof}
                placeholder="Describe marks, contents, or details only the owner would know"
                onChange={(e) => setProof(e.target.value)}
              />
              <button className="btn sm" onClick={() => onSendClaim(lost.id, found.id, proof, who)}>Send claim</button>
              <button className="btn sm ghost" onClick={() => setClaiming(false)}>Cancel</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MatchBlock({ lost, found, score, rank, claim, onNotMine, onSendClaim }) {
  const rows = explain(lost, found);
  const chips = sameness(lost, found);
  const strong = rows.filter((r) => r.pct >= 80).map((r) => r.label.toLowerCase());
  const weak = rows.filter((r) => r.pct < 50).map((r) => r.label.toLowerCase());
  const canClaim = score >= CLAIM_MIN;
  return (
    <div className={`match-block ${canClaim ? "best" : ""}`}>
      <div className="match-top">
        <div>
          <span className="kind found">Found</span>
          <h3>{found.name}</h3>
          <p>{found.loc} · {fmtDate(found.dt)}</p>
        </div>
        <div className="match-score">
          <b>{score}%</b>
          <span className={`tag ${canClaim ? "ok" : ""}`}>{canClaim ? "Strong match" : "Similar item"}</span>
        </div>
      </div>
      <div className="bar"><i style={{ width: `${score}%` }} /></div>

      <h4 className="eyebrow" style={{ marginTop: 14 }}>Why this matches</h4>
      <p className="sub" style={{ margin: "6px 0 0" }}>
        {strong.length ? `Strong match: ${strong.join(", ")}.` : "No strongly matching detail."}
        {weak.length ? ` Different: ${weak.join(", ")}.` : ""}
      </p>
      {chips.length > 0 && (
        <div className="pair-meta" style={{ margin: "10px 0 0" }}>
          {chips.map((c) => <span className="chip" key={c}>{c}</span>)}
        </div>
      )}
      <ul className="why">
        {rows.map((r) => (
          <li key={r.label} className={r.pct >= 80 ? "strong" : ""}>
            <div className="why-head"><span>{r.label}</span><span>{r.pct}%</span></div>
            {r.hidden ? (
              <p>{r.pct >= 60 ? "Matches the hidden details on record." : "Does not clearly match the hidden details on record."}</p>
            ) : (
              <>
                <p>You wrote “{r.lost}” · Found: “{r.found || "not recorded"}”</p>
                <p>
                  {r.shared.length
                    ? <>Common: {r.shared.map((w) => <mark key={w}>{w}</mark>)}</>
                    : "No common word."}
                </p>
              </>
            )}
          </li>
        ))}
      </ul>

      <ClaimZone lost={lost} found={found} claim={claim} canClaim={canClaim} onNotMine={onNotMine} onSendClaim={onSendClaim} />
    </div>
  );
}

function Facts({ rows }) {
  return (
    <dl className="facts">
      {rows.map(([k, v]) => (
        <div key={k}><dt>{k}</dt><dd>{v || "Not provided"}</dd></div>
      ))}
    </dl>
  );
}

function Browse({ S, tab, setTab, openId, setOpenId, onNotMine, onSendClaim }) {
  const close = () => setOpenId(null);
  const switchTab = (t) => { setTab(t); setOpenId(null); };
  const keyOpen = (id) => (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenId(id); }
  };

  const selected =
    openId == null ? null : tab === "found" ? S.found.find((f) => f.id === openId) : S.lost.find((l) => l.id === openId);

  // close with Esc, and stop the page behind from scrolling
  useEffect(() => {
    if (!selected) return;
    const onKey = (e) => { if (e.key === "Escape") setOpenId(null); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [selected, setOpenId]);

  return (
    <div>
      <div className="tabs" role="group" aria-label="Report type">
        <button className={tab === "found" ? "on" : ""} onClick={() => switchTab("found")}>Found items ({S.found.length})</button>
        <button className={tab === "lost" ? "on" : ""} onClick={() => switchTab("lost")}>Lost reports ({S.lost.length})</button>
      </div>

      <div className="grid2" style={{ marginTop: 14 }}>
        {tab === "found"
          ? S.found.map((f, i) => (
              <div className="item browse-card" key={f.id} style={{ animationDelay: `${i * 50}ms` }}>
                <div className="card-top" role="button" tabIndex={0} onClick={() => setOpenId(f.id)} onKeyDown={keyOpen(f.id)}>
                  <div className="row">
                    <span className="kind found">Found</span>
                    <span className={`tag ${f.status === "Released" ? "ok" : ""}`}>{f.status}</span>
                  </div>
                  <h3 style={{ marginTop: 8 }}>{f.name}</h3>
                  <p>{[f.cat, f.color, f.brand].filter(Boolean).join(" · ")}</p>
                  <p>Found at {f.loc}, {fmtDate(f.dt)}</p>
                  <Icon name="arrow" className="go" />
                </div>
              </div>
            ))
          : S.lost.length
          ? S.lost.slice().reverse().map((l, i) => {
              const best = l.matches[0];
              return (
                <div className="item browse-card" key={l.id} style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="card-top" role="button" tabIndex={0} onClick={() => setOpenId(l.id)} onKeyDown={keyOpen(l.id)}>
                    <div className="row">
                      <span className="kind lost">Lost</span>
                      {best
                        ? <span className="tag ok">{best.score}% · {l.matches.length} possible match{l.matches.length === 1 ? "" : "es"}</span>
                        : <span className="tag">No match yet</span>}
                    </div>
                    <h3 style={{ marginTop: 8 }}>{l.item}</h3>
                    <p>{[l.cat, l.color, l.brand].filter(Boolean).join(" · ")}</p>
                    <p>Lost near {l.where || "an unknown place"}</p>
                    <Icon name="arrow" className="go" />
                  </div>
                </div>
              );
            })
          : <div className="empty">No lost reports yet.</div>}
      </div>

      {selected && (
        <div className="modal-scrim" onClick={close}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className={`kind ${tab}`}>{tab === "found" ? "Found" : "Lost"}</span>
                <h2>{tab === "found" ? selected.name : selected.item}</h2>
              </div>
              <button className="modal-x" onClick={close} aria-label="Close">×</button>
            </div>

            <div className="modal-body">
              {tab === "found" ? (
                <>
                  <Facts rows={[
                    ["Category", selected.cat],
                    ["Color", selected.color],
                    ["Brand", selected.brand],
                    ["Status", selected.status],
                    ["Found at", selected.loc],
                    ["Date found", fmtDate(selected.dt)],
                    ["Description", selected.desc],
                  ]} />
                  <p className="sub" style={{ margin: "16px 0 0" }}>
                    Some identifying details are kept private by the Guidance Office to verify the real owner.
                  </p>
                </>
              ) : (
                <>
                  <Facts rows={[
                    ["Category", selected.cat],
                    ["Color", selected.color],
                    ["Brand", selected.brand],
                    ["Lost near", selected.where],
                    ["Looks like", selected.looks],
                    ["Summary", selected.contents],
                  ]} />

                  <h4 className="eyebrow" style={{ marginTop: 24 }}>
                    {selected.matches.length ? `Possible matches (${selected.matches.length})` : "Possible matches"}
                  </h4>
                  {selected.matches.length ? (
                    selected.matches.map((m, i) => {
                      const f = S.found.find((x) => x.id === m.foundId);
                      if (!f) return null;
                      return (
                        <MatchBlock
                          key={m.foundId}
                          lost={selected}
                          found={f}
                          score={m.score}
                          rank={i}
                          claim={S.claims.find((c) => c.lostId === selected.id && c.foundId === f.id)}
                          onNotMine={onNotMine}
                          onSendClaim={onSendClaim}
                        />
                      );
                    })
                  ) : (
                    <p className="sub" style={{ margin: "8px 0 0" }}>
                      Nothing similar has been turned in yet. Check back after Guidance logs new items.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
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
                  if (!f) return null;
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
                <div><button className="btn sm ghost" style={{ margin: 0 }} onClick={() => go("browse", "lost", l.id)}>See details and why it matches</button></div>
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

const EMPTY_LOST = { item: "", cat: "Other", color: "", brand: "", looks: "", contents: "", where: "", extra: {} };

function LostForm({ onSubmitLost, toast }) {
  const [form, setForm] = useState(EMPTY_LOST);
  const [manual, setManual] = useState(false); // true once the student edits the sentence by hand
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const setExtra = (k, v) => setForm((f) => ({ ...f, extra: { ...f.extra, [k]: v } }));

  const typeKey = detectType(form.item);
  const type = typeKey ? TYPES[typeKey] : GENERIC;
  const auto = buildOther(type, form, "lost");
  const details = manual ? form.contents : auto;

  const onItem = (v) =>
    setForm((f) => {
      const k = detectType(v);
      return { ...f, item: v, cat: k ? TYPES[k].cat : f.cat };
    });

  const submit = () => {
    if (!form.item.trim()) return toast("Tell us what item you lost.");
    const { extra, ...rest } = form;
    onSubmitLost({ ...rest, contents: details });
    setForm(EMPTY_LOST);
    setManual(false);
  };

  return (
    <section className="card" style={{ maxWidth: 680 }}>
      <Field id="q-item" label="What item did you lose?" placeholder="e.g. black umbrella" value={form.item} onChange={onItem} />
      {form.item.trim() && (
        <p className="sub" style={{ margin: "8px 0 0" }}>
          <span className={`tag ${typeKey ? "ok" : ""}`}>{typeKey ? `Detected: ${type.title}` : "Item not recognised"}</span>{" "}
          {typeKey ? "Showing the important details for this item." : "Showing general details."}
        </p>
      )}

      <label htmlFor="q-cat">Category</label>
      <select id="q-cat" value={form.cat} onChange={(e) => set("cat")(e.target.value)}>
        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
      </select>
      <div className="cols">
<div><Field id="q-color" label="What color is it?" placeholder="e.g. black" value={form.color} onChange={set("color")} /></div>
<div><Field id="q-brand" label="What brand?" placeholder="e.g. Totes" value={form.brand} onChange={set("brand")} /></div>
      </div>
      <Field id="q-where" label="Where did you lose it?" placeholder="e.g. library" value={form.where} onChange={set("where")} />

      <h4 className="eyebrow" style={{ marginTop: 24 }}>{type.title} details</h4>
      <div className="cols">
        {type.fields.map((fd) =>
          fd.opts ? (
            <div key={fd.k}>
              <label htmlFor={`qx-${fd.k}`}>{fd.label}</label>
              <select id={`qx-${fd.k}`} value={form.extra[fd.k] || ""} onChange={(e) => setExtra(fd.k, e.target.value)}>
               <option value="">Select</option>
                {fd.opts.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ) : (
            <div key={fd.k}>
              <Field id={`qx-${fd.k}`} label={fd.label} placeholder={fd.ph} value={form.extra[fd.k] || ""} onChange={(v) => setExtra(fd.k, v)} />
            </div>
          )
        )}
      </div>

      <Field id="q-looks" label="Anything else about how it looks?" placeholder="Optional: size, marks, condition" textarea value={form.looks} onChange={set("looks")} />

      <label htmlFor="q-details">Summary of your item</label>
      <textarea
        id="q-details"
        placeholder="Written automatically as you fill in the details above"
        value={details}
        onChange={(e) => { setManual(true); set("contents")(e.target.value); }}
        style={{ minHeight: 110 }}
      />
      <p className="sub" style={{ margin: "6px 0 0" }}>Written automatically. You can still edit it.</p>
      {manual && <button className="btn sm ghost" onClick={() => setManual(false)}>Regenerate from details</button>}

      <button className="btn" onClick={submit}>Submit lost item details</button>
    </section>
  );
}

function ReportPage({ onSubmitLost, toast }) {
  return <LostForm onSubmitLost={onSubmitLost} toast={toast} />;
}

/* =====================  GUIDANCE  ===================== */
function ClaimCard({ claim, S, onApprove, onReject, onRelease }) {
  const f = S.found.find((x) => x.id === claim.foundId);
  const l = S.lost.find((x) => x.id === claim.lostId);
  return (
    <div className="item">
      <div className="row"><h3>{f.name}</h3><Badge s={claim.status} /></div>
      {claim.claimer && (
        <div className="proof">
          <b>Claimed by</b>
          {claim.claimer.name}<br />
          Student ID: {claim.claimer.sid} · {claim.claimer.course}, {claim.claimer.year}<br />
          Section: {claim.claimer.section} · Room: {claim.claimer.room}
        </div>
      )}
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

const EMPTY_FOUND = { name: "", cat: "Electronics", color: "", brand: "", loc: "", desc: "", dt: "", other: "", extra: {} };

function LogPage({ onSaveFound, toast }) {
  const [form, setForm] = useState(EMPTY_FOUND);
  const [manual, setManual] = useState(false); // true once staff edit the sentence by hand
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const setExtra = (k, v) => setForm((f) => ({ ...f, extra: { ...f.extra, [k]: v } }));

  const typeKey = detectType(form.name);
  const type = typeKey ? TYPES[typeKey] : GENERIC;
  const auto = buildOther(type, form);
  const other = manual ? form.other : auto;

  const onName = (v) =>
    setForm((f) => {
      const k = detectType(v);
      return { ...f, name: v, cat: k ? TYPES[k].cat : f.cat };
    });

  const save = () => {
    if (!form.name.trim()) return toast("Enter the item name.");
    const { extra, ...rest } = form;
    onSaveFound({ ...rest, other });
    setForm(EMPTY_FOUND);
    setManual(false);
  };

  return (
    <section className="card" style={{ maxWidth: 680 }}>
      <Field id="f-name" label="Item name" placeholder="e.g. red wallet" value={form.name} onChange={onName} />
      {form.name.trim() && (
        <p className="sub" style={{ margin: "8px 0 0" }}>
          <span className={`tag ${typeKey ? "ok" : ""}`}>{typeKey ? `Detected: ${type.title}` : "Item not recognised"}</span>{" "}
          {typeKey ? "Showing the important details for this item." : "Showing general details."}
        </p>
      )}

      <div className="cols">
        <div>
          <label htmlFor="f-cat">Category</label>
          <select id="f-cat" value={form.cat} onChange={(e) => set("cat")(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
<div><Field id="f-color" label="Color" placeholder="e.g. red" value={form.color} onChange={set("color")} /></div>
      </div>
      <div className="cols">
<div><Field id="f-brand" label="Brand" placeholder="e.g. Fossil" value={form.brand} onChange={set("brand")} /></div>
<div><Field id="f-loc" label="Location found" placeholder="e.g. canteen" value={form.loc} onChange={set("loc")} /></div>
      </div>

      <h4 className="eyebrow" style={{ marginTop: 24 }}>{type.title} details</h4>
      <div className="cols">
        {type.fields.map((fd) =>
          fd.opts ? (
            <div key={fd.k}>
              <label htmlFor={`x-${fd.k}`}>{fd.label}</label>
              <select id={`x-${fd.k}`} value={form.extra[fd.k] || ""} onChange={(e) => setExtra(fd.k, e.target.value)}>
                <option value="">Select</option>
                {fd.opts.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ) : (
            <div key={fd.k}>
              <Field id={`x-${fd.k}`} label={fd.label} placeholder={fd.ph} value={form.extra[fd.k] || ""} onChange={(v) => setExtra(fd.k, v)} />
            </div>
          )
        )}
      </div>

      <Field id="f-desc" label="Description" textarea value={form.desc} onChange={set("desc")} />
      <label htmlFor="f-dt">Date and time found</label>
      <input type="datetime-local" id="f-dt" value={form.dt} onChange={(e) => set("dt")(e.target.value)} />

      <label htmlFor="f-other">Other identifying details</label>
      <textarea
        id="f-other"
        placeholder="Written automatically as you fill in the details above"
        value={other}
        onChange={(e) => { setManual(true); set("other")(e.target.value); }}
        style={{ minHeight: 110 }}
      />
      <p className="sub" style={{ margin: "6px 0 0" }}>
        Hidden from students. Written automatically; you can still edit it.
      </p>
      {manual && <button className="btn sm ghost" onClick={() => setManual(false)}>Regenerate from details</button>}

      <button className="btn" onClick={save}>Save found item record</button>
    </section>
  );
}

/* =====================  SYSTEM  ===================== */
function EnginePage({ S, log, onThreshold, onReset }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const ka = keywords(a), kb = keywords(b);
  const simPct = Math.round((textSim(a, b) ?? 0) * 100);
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
        <p className="sub">Type a word or a whole sentence, in English or Tagalog. Only the item details are compared.</p>
        <Field id="ta" label="Text A" value={a} onChange={setA} textarea />
        <Field id="tb" label="Text B" value={b} onChange={setB} textarea />
        <div className="lev">
          {!a.trim() && !b.trim() ? (
            "Type something to compare."
          ) : (
            <>
              Details found in A: <b>{ka.join(", ") || "none recognized"}</b><br />
              Details found in B: <b>{kb.join(", ") || "none recognized"}</b><br />
              {ka.length && kb.length ? (
                <>
                  Edits needed: <b>{lev([...ka].sort().join(" "), [...kb].sort().join(" "))}</b><br />
                  Similarity: <b>{simPct}%</b>
                </>
              ) : (
                "Both texts need at least one recognized item detail to compare."
              )}
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
  const [page, setPage] = useState("browse");
  const [browseTab, setBrowseTab] = useState("found");
  const [openId, setOpenId] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [log, setLog] = useState([]);
  const [msg, setMsg] = useState("");
  const [dark, setDark] = useState(() => {
    try {
      const t = localStorage.getItem("lf-theme");
      if (t) return t === "dark";
    } catch (e) {}
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try { localStorage.setItem("lf-theme", dark ? "dark" : "light"); } catch (e) {}
  }, [dark]);

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
  // go(page, browseTab?, openId?)
  const go = (p, tab, id) => {
    if (tab) setBrowseTab(tab);
    if (id !== undefined) setOpenId(id);
    else if (p === "browse") setOpenId(null);
    setPage(p);
    setNavOpen(false);
    window.scrollTo(0, 0);
  };

  /* ----- actions ----- */
  const submitLost = (form) => {
    const l = { id: S.nid, ...form };
    const { matches, log: newLog } = runMatch(l, S.found, S.thr);
    l.matches = matches;
    setLog(newLog);
    setS((p) => ({ ...p, lost: [...p.lost, l], nid: p.nid + 1 }));
    toast(matches.length ? "Possible match found." : "No match found yet.");
    go("browse", "lost", l.id);
  };

  const notMine = (lostId, foundId) => {
    setS((p) => ({
      ...p,
      lost: p.lost.map((l) => (l.id === lostId ? { ...l, matches: l.matches.filter((m) => m.foundId !== foundId) } : l)),
    }));
    toast("Match dismissed.");
  };

  const sendClaim = (lostId, foundId, proof, who) => {
    const missing = ["name", "sid", "course", "section", "room"].some((k) => !who[k].trim());
    if (missing) return toast("Please fill in all your information.");
    if (!proof.trim()) return toast("Add your proof of ownership.");
    const claimer = Object.fromEntries(Object.entries(who).map(([k, v]) => [k, v.trim()]));
    setS((p) => ({
      ...p,
      claims: [...p.claims, { id: p.nid, lostId, foundId, claimer, proof: proof.trim(), status: "Pending", note: "Waiting for Guidance to review." }],
      nid: p.nid + 1,
    }));
    toast("Claim submitted.");
  };

  const saveFound = (form) => {
    const f = { id: S.nid, ...form, dt: form.dt || new Date().toISOString().slice(0, 16), status: "Available" };
    setS((p) => ({ ...p, found: [...p.found, f], nid: p.nid + 1 }));
    toast("Found item saved.");
    go("browse", "found", f.id);
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
    claims: S.claims.filter((c) => c.status === "Pending").length,
  };

  const VIEWS = {
    overview: <Overview S={S} go={go} />,
    browse: (
      <Browse
        S={S}
        tab={browseTab}
        setTab={setBrowseTab}
        openId={openId}
        setOpenId={setOpenId}
        onNotMine={notMine}
        onSendClaim={sendClaim}
      />
    ),
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
      </aside>
      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}

      <div className="content">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setNavOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <div className="crumbs eyebrow">
            <span className="crumb-area">{areaOf(page)}</span>
            <Icon name="chevron" size={14} className="crumb-sep" />
            <span className="cur">{HEADS[page][0]}</span>
          </div>
          <div className="top-actions">
            <button
              className="theme-btn"
              onClick={() => setDark((d) => !d)}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              title={dark ? "Light mode" : "Dark mode"}
            >
              <Icon name={dark ? "sun" : "moon"} />
            </button>
            <button className="btn-primary" aria-label="New report" onClick={() => go("report")}><Icon name="filePlus" size={19} /> <span className="btn-label">New report</span></button>
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