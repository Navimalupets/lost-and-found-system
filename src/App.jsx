import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { detectType, TYPES, GENERIC, buildOther } from "./itemTypes";
import { lev, runMatch, sameness, keywords, textSim, explain, why, proofScore } from "./matching";

/* =====================  DATA  ===================== */
const KEY = "lf-system-v2";
const THRESHOLD = 70;   // minimum to appear as a possible match
const CLAIM_MIN = 85;   // lowest possible "verified" score
// the stricter the slider, the stricter "verified" gets too
const claimMinFor = (thr) => Math.min(99, Math.max(CLAIM_MIN, thr + 15));   // minimum to be allowed to submit a claim
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

// recompute the matches of one lost report with the current strictness.
// keeps matches that already have a claim, and skips ones marked "Not a match"
const rematch = (l, found, claims, thr) => {
  const dis = l.dismissed || [];
  const keep = l.matches.filter((m) => claims.some((c) => c.lostId === l.id && c.foundId === m.foundId));
  const fresh = runMatch(l, found.filter((f) => !dis.includes(f.id)), thr).matches.filter(
    (m) => !keep.some((k) => k.foundId === m.foundId)
  );
  return [...keep, ...fresh].sort((a, b) => b.score - a.score);
};

/* =====================  NAV CONFIG  ===================== */
const NAV = [
  { section: "Records", area: "Records", items: [["overview", "Dashboard", "home"], ["browse", "Browse reports", "search"], ["mine", "Lost reports", "filePlus"]] },
  { section: "Guidance office", area: "Guidance office", items: [["claims", "Claims to review", "check"], ["log", "Log found item", "box"]] },
  { section: "System", area: "System", items: [["engine", "Matching tester", "sliders"]] },
];

const HEADS = {
  overview: ["Dashboard", "A quick look at what is lost, what has been found, and what needs a decision."],
  browse: ["Browse reports", "Click a report to see its details and any possible matches."],
  mine: ["Lost reports", "Track each lost report and the claims recorded for it."],
  report: ["Log a lost report", "Fill in the details. The system compares them with found items."],
  claims: ["Claims to review", "Compare each student's proof with the hidden details on record."],
  log: ["Log found item", "Record an item that was brought to the Guidance Office."],
  engine: ["Matching tester", "Type a lost item and a found item to see how the system compares them. Nothing is saved."],
};

const areaOf = (page) => NAV.find((n) => n.items.some(([id]) => id === page))?.area ?? "Records";

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
  help: "M12 21a9 9 0 100-18 9 9 0 000 18zM9.1 9a3 3 0 015.8 1c0 2-3 2.5-3 4M12 17.5h.01",
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
            <div className="empty">No matches yet. Log a lost report to get started.</div>
          )}
        </div>
      </section>

      <div className="grid2">
          <button className="btn ghost" style={{ margin: 0, padding: 18, textAlign: "left" }} onClick={() => go("report")}>
          Log a lost report
        </button>
        <button className="btn ghost" style={{ margin: 0, padding: 18, textAlign: "left" }} onClick={() => go("browse", "found")}>
          Browse found items
        </button>
      </div>
    </div>
  );
}

/* =====================  BROWSE  ===================== */
function ClaimZone({ lost, found, claim, canClaim, claimMin, onNotMine, onSendClaim }) {
  const [claiming, setClaiming] = useState(false);
  const [proof, setProof] = useState("");
  const [who, setWho] = useState(EMPTY_CLAIMER);
  const set = (k) => (v) => setWho((w) => ({ ...w, [k]: v }));
  const p = `${lost.id}-${found.id}`;

  useEffect(() => {
    if (!claiming) return;
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); setClaiming(false); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [claiming]);

  return (
    <div className="claim-zone">
      {claim ? (
        <>
          <p style={{ margin: 0 }}>Claim status: <Badge s={claim.status} /></p>
          {claim.claimer && <p className="sub" style={{ margin: "8px 0 0" }}>Submitted by {claim.claimer.name} ({claim.claimer.sid})</p>}
          {claim.note && <p className="sub" style={{ margin: "8px 0 0" }}>{claim.note}</p>}
          {claim.status === "Approved" && <p style={{ margin: "8px 0 0" }}><b>Approved. Ready for release to the owner.</b></p>}
          {claim.status === "Released" && <p style={{ margin: "8px 0 0" }}><b>Released to the owner. Case closed.</b></p>}
        </>
      ) : found.status !== "Available" ? (
        <p style={{ margin: 0 }}><Badge s="Claimed" /> This item has already been claimed</p>
      ) : (
        <>
          {canClaim ? (
            !claiming && <button className="btn sm" onClick={() => setClaiming(true)}>Record claim</button>
          ) : (
            <p className="sub" style={{ margin: "0 0 4px" }}>
              Match is below {claimMin}%. Verify with the owner before recording a claim.
            </p>
          )}
          {!claiming && <button className="btn sm ghost" onClick={() => onNotMine(lost.id, found.id)}>Not a match</button>}

           {claiming && createPortal(
            <div className="claim-scrim" onClick={(e) => { e.stopPropagation(); setClaiming(false); }}>
              <div className="claim-panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div className="claim-panel-head">
                  <div>
                    <span className="kind found">Found</span>
                    <h3>{found.name}</h3>
                  </div>
                  <button className="modal-x" onClick={() => setClaiming(false)} aria-label="Close">×</button>
                </div>

                <div className="claim-panel-body">
                  <h4 className="eyebrow" style={{ marginTop: 14 }}>Claimant information</h4>
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

                  <label htmlFor={`pf-${p}`}>Proof of ownership</label>
                  <textarea
                    id={`pf-${p}`}
                    value={proof}
                    placeholder="Describe marks, contents, or details only the owner would know"
                    onChange={(e) => setProof(e.target.value)}
                  />
                </div>

                <div className="claim-panel-foot">
                  <button className="btn sm" style={{ margin: 0 }} onClick={() => onSendClaim(lost.id, found.id, proof, who)}>Save claim</button>
                  <button className="btn sm ghost" style={{ margin: 0 }} onClick={() => setClaiming(false)}>Cancel</button>
                </div>
              </div>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}

function MatchBlock({ lost, found, score, rank, claim, claimMin, onNotMine, onSendClaim }) {
  const rows = explain(lost, found);
  const chips = sameness(lost, found);
  const strong = rows.filter((r) => r.pct >= 80).map((r) => r.label.toLowerCase());
  const weak = rows.filter((r) => r.pct < 50).map((r) => r.label.toLowerCase());
  const canClaim = score >= claimMin;
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
          <span className={`tag ${canClaim ? "ok" : ""}`}>{canClaim ? "Verified match" : "Similar item"}</span>
        </div>
      </div>
      <div className="bar"><i style={{ width: `${score}%` }} /></div>

      <h4 className="eyebrow" style={{ marginTop: 14 }}>Why this matches</h4>
      <p className="sub" style={{ margin: "6px 0 0" }}>
        {strong.length ? `Strong match: ${strong.join(", ")}.` : "No strongly matching detail."}
        {weak.length ? ` Different: ${weak.join(", ")}.` : ""}
      </p>
      {(chips.length > 0 || why(lost, found).length > 0) && (
        <div className="pair-meta" style={{ margin: "10px 0 0" }}>
          {chips.map((c) => <span className="chip" key={c}>{c}</span>)}
          {why(lost, found).map((x) => <span className="chip flag" key={x}>{x}</span>)}
        </div>
      )}
      <div className="compare">
        <div className="cmp-head">
          <div className="cmp-title cmp-title-found"><span className="kind found">Found item</span></div>
          <div className="cmp-mid-title">Match</div>
          <div className="cmp-title cmp-title-lost"><span className="kind lost">Lost report</span></div>
        </div>
        {rows.map((r) => (
          <div key={r.label} className={`cmp-row ${r.pct >= 80 ? "strong" : r.pct < 50 ? "weak" : ""}`}>
            <div className="cmp-side cmp-found">
              <small>{r.label}</small>
              <p>{r.hidden ? "Hidden detail on record" : r.found || "Not recorded"}</p>
            </div>

            <div className="cmp-mid">
              <b>{r.pct}%</b>
              {r.hidden ? (
                <em>{r.pct >= 60 ? "Matches record" : "No clear match"}</em>
              ) : r.shared.length ? (
                <div className="cmp-common">
                  {r.shared.map((w) => <mark key={w}>{w}</mark>)}
                </div>
              ) : (
                <em>No common word</em>
              )}
            </div>

            <div className="cmp-side cmp-lost">
              <small>{r.label}</small>
              <p>{r.lost || "Not provided"}</p>
            </div>
          </div>
        ))}
      </div>

      <ClaimZone lost={lost} found={found} claim={claim} canClaim={canClaim} claimMin={claimMin} onNotMine={onNotMine} onSendClaim={onSendClaim} />
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
  const [statusFilter, setStatusFilter] = useState("Available");
  const FILTERS = [["Available", "Available"], ["Claimed", "Claimed"], ["Released", "Released"]];
  const foundList = S.found.filter((f) => f.status === statusFilter);
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

      {tab === "found" && (
        <div className="filters" role="group" aria-label="Filter found items">
          {FILTERS.map(([val, label]) => (
            <button key={val} className={statusFilter === val ? "on" : ""} onClick={() => setStatusFilter(val)}>
              {label} ({S.found.filter((f) => f.status === val).length})
            </button>
          ))}
        </div>
      )}

      <div className="grid2" style={{ marginTop: 14 }}>
        {tab === "found"
          ? foundList.length ? foundList.map((f, i) => (
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
            : <div className="empty">No {statusFilter.toLowerCase()} items.</div>
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
                    Some identifying details are hidden on record to verify the real owner.
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
                          claimMin={claimMinFor(S.thr)}
                          claim={S.claims.find((c) => c.lostId === selected.id && c.foundId === f.id)}
                          onNotMine={onNotMine}
                          onSendClaim={onSendClaim}
                        />
                      );
                    })
                  ) : (
                    <p className="sub" style={{ margin: "8px 0 0" }}>
                      No similar found item has been logged yet.
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
        No lost reports yet.
        <div><button className="btn sm" onClick={() => go("report")}>Log a lost report</button></div>
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
              <p className="sub" style={{ margin: 0 }}>No similar found item has been logged yet.</p>
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
    if (!form.item.trim()) return toast("Enter the item that was lost.");
    const { extra, ...rest } = form;
    const xl = Object.fromEntries(type.fields.map((fd) => [fd.k, fd.label]));
    onSubmitLost({ ...rest, extra, xl, contents: details });
    setForm(EMPTY_LOST);
    setManual(false);
  };

  return (
    <section className="card" style={{ maxWidth: 680 }}>
      <Field id="q-item" label="Item lost" placeholder="e.g. black umbrella" value={form.item} onChange={onItem} />
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
<div><Field id="q-color" label="Color" placeholder="e.g. black" value={form.color} onChange={set("color")} /></div>
<div><Field id="q-brand" label="Brand" placeholder="e.g. Totes" value={form.brand} onChange={set("brand")} /></div>
      </div>
      <Field id="q-where" label="Where it was lost" placeholder="e.g. library" value={form.where} onChange={set("where")} />

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

      <Field id="q-looks" label="Other details about its look" placeholder="Optional: size, marks, condition" textarea value={form.looks} onChange={set("looks")} />

      <label htmlFor="q-details">Summary of the item</label>
      <textarea
        id="q-details"
        placeholder="Written automatically as you fill in the details above"
        value={details}
        onChange={(e) => { setManual(true); set("contents")(e.target.value); }}
        style={{ minHeight: 110 }}
      />
      <p className="sub" style={{ margin: "6px 0 0" }}>Written automatically. You can still edit it.</p>
      {manual && <button className="btn sm ghost" onClick={() => setManual(false)}>Regenerate from details</button>}

      <button className="btn" onClick={submit}>Save lost report</button>
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
  const proofPct = proofScore(claim.proof, f);
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
      <div className="proof"><b>Lost report on file</b>{l.item}, {l.color}, {l.brand}: {l.looks}</div>
      <div className="proof">
        <b>Proof of ownership</b>{claim.proof}
        <div style={{ marginTop: 8 }}>
          {proofPct === null
            ? <span className="tag">Not enough details to compare</span>
            : <span className={`tag ${proofPct >= claimMinFor(S.thr) ? "ok" : proofPct >= 50 ? "warn" : "bad"}`}>{proofPct}% of the proof matches the hidden details</span>}
        </div>
      </div>
      <div className="proof"><b>Hidden details on record</b>{f.other || "None recorded"}</div>
      {claim.status === "Pending" ? (
        <>
          <p style={{ margin: "12px 0 0", fontWeight: 700, color: "var(--ink)" }}>Verify ownership</p>
          <button className="btn sm ok" onClick={() => onApprove(claim.id)}>Approve claim</button>
          <button className="btn sm bad" onClick={() => onReject(claim.id)}>Reject claim</button>
        </>
      ) : (
        <button className="btn sm" onClick={() => onRelease(claim.id)}>Mark as released</button>
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
    const xl = Object.fromEntries(type.fields.map((fd) => [fd.k, fd.label]));
    onSaveFound({ ...rest, extra, xl, other });
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
/* =====================  MATCHING TESTER  ===================== */
const SIZE_OPTS = ["small", "medium", "large"];
const COND_OPTS = ["like new", "worn", "scratched", "cracked", "dented", "torn", "faded"];
const fText = (k, label, ph = "") => ({ k, label, ph });
const fPick = (k, label, opts) => ({ k, label, opts });

// details shown when the item name is not recognised, based on the chosen category
const CAT_FIELDS = {
  Electronics: [
    fText("model", "Model", "e.g. Galaxy A14"),
    fText("case", "Case or cover", "e.g. clear silicone case"),
    fPick("condition", "Condition", COND_OPTS),
    fText("marks", "Stickers or marks", "e.g. a cat sticker on the back"),
  ],
  "Wallets & bags": [
    fPick("size", "Size", SIZE_OPTS),
    fText("material", "Material", "e.g. leather"),
    fPick("condition", "Condition", COND_OPTS),
    fText("contents", "Contents", "e.g. 2 student IDs"),
    fText("marks", "Marks, keychain or initials", "e.g. a star-shaped keychain"),
  ],
  Accessories: [
    fText("material", "Material", "e.g. metal"),
    fPick("condition", "Condition", COND_OPTS),
    fText("marks", "Marks or engraving", "e.g. initials “MR”"),
  ],
  Clothing: [
    fPick("size", "Size", SIZE_OPTS),
    fText("kind", "Type", "e.g. hoodie"),
    fPick("condition", "Condition", COND_OPTS),
    fText("owner", "Name written on it", "e.g. Juan D."),
  ],
  "Personal items": [
    fText("material", "Material", "e.g. plastic"),
    fPick("condition", "Condition", COND_OPTS),
    fText("marks", "Stickers or marks", "e.g. a cat sticker on the lid"),
  ],
  "Books & supplies": [
    fText("subject", "Title or subject", "e.g. Math"),
    fText("owner", "Name written on it", "e.g. Juan D."),
    fPick("condition", "Condition", COND_OPTS),
    fText("marks", "Marks or stickers", "e.g. initials “MR”"),
  ],
};

// which details to show: the detected item type (if it fits the category), else the category's details
const resolveType = (name, cat) => {
  const k = detectType(name);
  if (k && TYPES[k].cat === cat) return { title: TYPES[k].title, fields: TYPES[k].fields, detected: true };
  if (CAT_FIELDS[cat]) return { title: cat, fields: CAT_FIELDS[cat], detected: false };
  return { title: "Item", fields: GENERIC.fields, detected: false };
};

// only keep the answers that belong to the details currently shown
const sideRecord = (d) => {
  const t = resolveType(d.name, d.cat);
  return {
    type: t,
    extra: Object.fromEntries(t.fields.map((fd) => [fd.k, d.extra[fd.k] || ""])),
    xl: Object.fromEntries(t.fields.map((fd) => [fd.k, fd.label])),
  };
};

const EMPTY_SIDE = { name: "", cat: "Other", color: "", brand: "", place: "", desc: "", extra: {} };
const WEIGHTS = { Item: 25, Color: 15, Location: 15, Brand: 10, Description: 10 };

// random examples: some match closely, some only partly, some do not match
const EXAMPLES = [
  {
    note: "Same wallet. Only the spelling of the name is different.",
    lost: { name: "Red walet", cat: "Wallets & bags", color: "Red", brand: "Fossil", place: "Canteen", desc: "Small leather wallet",
      extra: { size: "small", material: "leather", condition: "worn", ids: "2 student IDs", marks: "initials MR inside" } },
    found: { name: "Red Wallet", cat: "Wallets & bags", color: "Red", brand: "Fossil", place: "Canteen", desc: "Small leather wallet with a zipper",
      extra: { size: "small", material: "leather", condition: "worn", ids: "2 student IDs", marks: "initials MR inside" } },
  },
  {
    note: "Same umbrella. The place is written a little differently and the found record has one extra detail.",
    lost: { name: "Black umbrlla", cat: "Personal items", color: "Black", brand: "Totes", place: "Library", desc: "Big foldable umbrella",
      extra: { kind: "folding", size: "large", handle: "wooden", marks: "initials MR on the strap" } },
    found: { name: "Black Umbrella", cat: "Personal items", color: "Black", brand: "Totes", place: "Library entrance", desc: "Large folding umbrella with a wooden handle",
      extra: { kind: "folding", size: "large", handle: "wooden", condition: "worn", marks: "initials MR on the strap" } },
  },
  {
    note: "Same charger. The place is abbreviated and the description is shorter.",
    lost: { name: "USB C wall charger", cat: "Electronics", color: "White", brand: "Anker", place: "Computer Laboratory", desc: "20W charger",
      extra: { kind: "wall", rating: "20W", cable: "attached", condition: "scratched", marks: "scratch near the plug" } },
    found: { name: "USB-C Wall Charger", cat: "Electronics", color: "White", brand: "Anker", place: "Computer Lab", desc: "White 20W wall charger with a short cable",
      extra: { kind: "wall", rating: "20W", cable: "attached", condition: "scratched", marks: "scratch near the plug" } },
  },
  {
    note: "Same laptop. The color is written in another spelling and the place is more specific.",
    lost: { name: "Gray laptop", cat: "Electronics", color: "Gray", brand: "Acer", place: "Library", desc: "Acer Aspire laptop",
      extra: { model: "Acer Aspire 5", case: "gray sleeve", lock: "a mountain", charger: "with charger" } },
    found: { name: "Grey Laptop", cat: "Electronics", color: "Silver", brand: "Acer", place: "Library entrance", desc: "Laptop in a gray sleeve",
      extra: { model: "Acer Aspire 5", case: "gray sleeve", lock: "mountain wallpaper", charger: "with charger" } },
  },
  {
    note: "Same phone, but the place and the screen condition are different.",
    lost: { name: "Black phone", cat: "Electronics", color: "Black", brand: "Samsung", place: "Library", desc: "Phone with a clear case",
      extra: { model: "Galaxy A14", case: "clear silicone case", screen: "cracked", lock: "a photo of a dog" } },
    found: { name: "Black Phone", cat: "Electronics", color: "Black", brand: "Samsung", place: "Hallway", desc: "Black phone in a clear case",
      extra: { model: "Galaxy A14", case: "clear case", screen: "scratched", lock: "a photo of a dog" } },
  },
  {
    note: "Same keys, but the place and the tag number are different.",
    lost: { name: "Keys", cat: "Personal items", color: "Silver", brand: "", place: "Hallway", desc: "Set of keys with a star keychain",
      extra: { count: "3", keychain: "star-shaped keychain", tag: "Locker 24" } },
    found: { name: "Keys", cat: "Personal items", color: "Gray", brand: "", place: "Stairs", desc: "Three keys on a star keychain",
      extra: { count: "3", keychain: "star-shaped keychain", tag: "Locker 42" } },
  },
  {
    note: "Different items. Almost nothing matches.",
    lost: { name: "Blue water bottle", cat: "Personal items", color: "Blue", brand: "Hydro Flask", place: "Gym", desc: "Insulated bottle with stickers",
      extra: { capacity: "750 ml", material: "stainless steel", condition: "worn", marks: "cat sticker on the lid" } },
    found: { name: "Red lunch box", cat: "Personal items", color: "Red", brand: "Lock&Lock", place: "Canteen", desc: "Plastic lunch box with a latch",
      extra: { material: "plastic", contents: "rice and a spoon", condition: "scratched", marks: "name MR written on the lid" } },
  },
  {
    note: "Same kind of bag, but the color, brand, place and details are different.",
    lost: { name: "Black backpack", cat: "Wallets & bags", color: "Black", brand: "Jansport", place: "Library", desc: "Large backpack",
      extra: { kind: "backpack", size: "large", condition: "worn", contents: "two notebooks", nametag: "Juan D." } },
    found: { name: "Blue backpack", cat: "Wallets & bags", color: "Blue", brand: "Eastpak", place: "Gym", desc: "Medium backpack with a front pocket",
      extra: { kind: "backpack", size: "medium", condition: "torn", contents: "a lunch box", nametag: "Maria S." } },
  },
];

function TestSide({ kind, data, onChange }) {
  const lost = kind === "lost";
  const set = (k) => (v) => onChange({ ...data, [k]: v });
  const setExtra = (k, v) => onChange({ ...data, extra: { ...data.extra, [k]: v } });
  const type = resolveType(data.name, data.cat);

  const onName = (v) => {
    const k = detectType(v);
    const cat = k ? TYPES[k].cat : data.cat;
    onChange({ ...data, name: v, cat, extra: cat === data.cat ? data.extra : {} });
  };
  const onCat = (c) => onChange({ ...data, cat: c, extra: c === data.cat ? data.extra : {} });

  return (
    <section className="card">
      <span className={`kind ${kind}`}>{lost ? "Lost item" : "Found item"}</span>
      <Field id={`${kind}-name`} label="Item" placeholder={lost ? "e.g. red walet" : "e.g. Red Wallet"} value={data.name} onChange={onName} />
      {data.name.trim() && (
        <p className="sub" style={{ margin: "8px 0 0" }}>
          <span className={`tag ${type.detected ? "ok" : ""}`}>{type.detected ? `Detected: ${type.title}` : "Item not recognised"}</span>{" "}
          {type.detected ? "Showing the important details for this item." : `Showing ${data.cat} details.`}
        </p>
      )}

      <label htmlFor={`${kind}-cat`}>Category</label>
      <select id={`${kind}-cat`} value={data.cat} onChange={(e) => onCat(e.target.value)}>
        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
      </select>
      <div className="cols">
        <div><Field id={`${kind}-color`} label="Color" placeholder="e.g. red" value={data.color} onChange={set("color")} /></div>
        <div><Field id={`${kind}-brand`} label="Brand" placeholder="e.g. Fossil" value={data.brand} onChange={set("brand")} /></div>
      </div>
      <Field id={`${kind}-place`} label={lost ? "Where it was lost" : "Where it was found"} placeholder="e.g. canteen" value={data.place} onChange={set("place")} />

      <h4 className="eyebrow" style={{ marginTop: 24 }}>{type.title} details</h4>
      <div className="cols">
        {type.fields.map((fd) =>
          fd.opts ? (
            <div key={fd.k}>
              <label htmlFor={`${kind}-x-${fd.k}`}>{fd.label}</label>
              <select id={`${kind}-x-${fd.k}`} value={data.extra[fd.k] || ""} onChange={(e) => setExtra(fd.k, e.target.value)}>
                <option value="">Select</option>
                {fd.opts.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ) : (
            <div key={fd.k}>
              <Field id={`${kind}-x-${fd.k}`} label={fd.label} placeholder={fd.ph} value={data.extra[fd.k] || ""} onChange={(v) => setExtra(fd.k, v)} />
            </div>
          )
        )}
      </div>

      <Field id={`${kind}-desc`} label="Description" placeholder="e.g. small leather wallet" textarea value={data.desc} onChange={set("desc")} />
    </section>
  );
}

function EnginePage({ S, onThreshold, onReset }) {
  const [lostT, setLostT] = useState(EMPTY_SIDE);
  const [foundT, setFoundT] = useState(EMPTY_SIDE);
  const [lastEx, setLastEx] = useState(-1);
  const [note, setNote] = useState("");
  const ready = lostT.name.trim() && foundT.name.trim();

  const loadExample = () => {
    let i;
    do { i = Math.floor(Math.random() * EXAMPLES.length); } while (i === lastEx && EXAMPLES.length > 1);
    setLastEx(i);
    setLostT({ ...EMPTY_SIDE, ...EXAMPLES[i].lost });
    setFoundT({ ...EMPTY_SIDE, ...EXAMPLES[i].found });
    setNote(EXAMPLES[i].note);
  };
  const clearAll = () => { setLostT(EMPTY_SIDE); setFoundT(EMPTY_SIDE); setNote(""); };

  let out = null;
  if (ready) {
    const L = sideRecord(lostT), F = sideRecord(foundT);
    const lost = { item: lostT.name, cat: lostT.cat, color: lostT.color, brand: lostT.brand, where: lostT.place, looks: lostT.desc, contents: "", extra: L.extra, xl: L.xl };
    const found = { id: 0, status: "Available", name: foundT.name, cat: foundT.cat, color: foundT.color, brand: foundT.brand, loc: foundT.place, desc: foundT.desc, other: "", extra: F.extra, xl: F.xl };

    const base = explain(lost, found);
    const specN = base.filter((r) => r.hidden).length || 1;
    const rows = base.map((r) => {
      const fk = r.hidden ? Object.keys(F.xl).find((k) => F.xl[k] === r.label) : null;
      return {
        ...r,
        found: r.hidden ? (fk ? F.extra[fk] : "") : r.found,
        wt: r.hidden ? 25 / specN : WEIGHTS[r.label] || 0,
      };
    });
    const wSum = rows.reduce((a, r) => a + r.wt, 0);
    out = {
      final: runMatch(lost, [found], 0).log[0].score,
      raw: wSum ? Math.round(rows.reduce((a, r) => a + r.pct * r.wt, 0) / wSum) : 0,
      rows,
      flags: why(lost, found),
    };
  }
  const verdict = !out ? null : out.final >= claimMinFor(S.thr) ? ["Verified match", "ok"] : out.final >= S.thr ? ["Possible match", "warn"] : ["No match", "bad"];

  return (
    <div className="stack">
      <section className="card">
        <h2>Try the matching</h2>
        <p className="sub">
          Type a lost item on the left and a found item on the right. The details below change with the item and category.
          The system compares them the same way it does for real reports. Nothing is saved.
        </p>
        <button className="btn sm" style={{ margin: 0 }} onClick={loadExample}>Load an example</button>
        <button className="btn sm ghost" style={{ margin: "0 0 0 8px" }} onClick={clearAll}>Clear</button>
        {note && <p className="sub" style={{ margin: "12px 0 0" }}>Example: {note}</p>}
      </section>

      <div className="grid2">
        <TestSide kind="lost" data={lostT} onChange={setLostT} />
        <TestSide kind="found" data={foundT} onChange={setFoundT} />
      </div>

      <section className="card">
        <h2>Result</h2>
        {!out ? (
          <div className="empty">Type the item name on both sides to see the result.</div>
        ) : (
          <>
            <div className="row">
              <b style={{ fontSize: 44, lineHeight: 1, color: "var(--ink)" }}>{out.final}%</b>
              <span className={`tag ${verdict[1]}`}>{verdict[0]}</span>
            </div>
            <div className="bar"><i style={{ width: `${out.final}%` }} /></div>
            <p className="sub" style={{ margin: "8px 0 0" }}>
              {claimMinFor(S.thr)}% or higher: verified match · {S.thr}% or higher: possible match · lower: no match
            </p>

            <p style={{ margin: "14px 0 0" }}>
              Score from the details: <b>{out.raw}%</b>
              {out.final < out.raw && <> · Lowered to <b>{out.final}%</b> because of the mistakes below.</>}
            </p>
            {out.flags.length > 0 && (
              <div className="pair-meta" style={{ margin: "10px 0 0" }}>
                {out.flags.map((x) => <span className="chip flag" key={x}>{x}</span>)}
              </div>
            )}

            <ul className="why">
              {out.rows.map((r) => {
                const wt = Number(r.wt.toFixed(1));
                return (
                  <li key={r.label} className={r.pct >= 80 ? "strong" : ""}>
                    <div className="why-head"><span>{r.label} · counts {wt}%</span><span>{r.pct}%</span></div>
                    <p>Lost: “{r.lost || "blank"}” · Found: “{r.found || "blank"}”</p>
                    <p>Points earned: {((r.pct * r.wt) / 100).toFixed(1)} of {wt}</p>
                  </li>
                );
              })}
            </ul>
            <p className="sub" style={{ margin: "12px 0 0" }}>Details left blank on either side are skipped.</p>
          </>
        )}
      </section>

      <section className="card">
        <h2>Settings</h2>
        <label htmlFor="thr">Minimum similarity for a possible match: {S.thr}%</label>
        <input type="range" id="thr" min="50" max="95" value={S.thr} onChange={(e) => onThreshold(+e.target.value)} />
        <div className="thr-scale"><span>50% · Loose</span><span>95% · Strict</span></div>
        <p className="sub" style={{ margin: "8px 0 0" }}>
          A verified match now needs <b>{claimMinFor(S.thr)}%</b> or higher. This setting applies to the whole system: every lost report is updated right away as you move the slider.
        </p>
        <button className="btn ghost" onClick={() => window.confirm("Reset all data to the sample data?") && onReset()}>Reset demo data</button>
      </section>
    </div>
  );
}
/* old page, no longer used (safe to delete later) */
function EnginePageOld({ S, log, onThreshold, onReset }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const ka = keywords(a), kb = keywords(b);
  const simPct = Math.round((textSim(a, b) ?? 0) * 100);
  return (
    <div className="stack">
      <section className="card">
               <h2>About this page</h2>
        <p className="sub">
          This page controls how the system decides that a lost report and a found item are a possible match.
          You do not need it for daily work. Use it to adjust how strict matching is, or to show how the algorithm works.
        </p>

        <h2 style={{ marginTop: 26 }}>1. Matching strictness</h2>
        <p className="sub">Choose the lowest score a found item needs to appear as a possible match.</p>
        <label htmlFor="thr">Minimum similarity: {S.thr}%</label>
        <input type="range" id="thr" min="50" max="95" value={S.thr} onChange={(e) => onThreshold(+e.target.value)} />
        <div className="thr-scale"><span>50% · Loose</span><span>95% · Strict</span></div>
        <p className="sub" style={{ margin: "8px 0 0" }}>
          {S.thr >= 75
            ? "Strict: only very close matches will show up."
            : S.thr >= 50
            ? "Balanced: close matches show up and weak ones are hidden."
            : "Loose: many matches will show up, including weak ones."}{" "}
          This only applies to lost reports saved after the change. Existing reports keep their results.
        </p>

        <h2 style={{ marginTop: 26 }}>2. Last comparison</h2>
        <p className="sub">After a lost report is saved, this list shows the score of every available found item. It updates as you move the slider.</p>
        {log.length ? (
          <div className="list">
            {log.map((x, i) => {
              const label = x.score >= CLAIM_MIN ? "verified match" : x.score >= S.thr ? "possible match" : "no match";
              return (
                <div className="row" key={i}>
                  <span>{x.name}</span>
                  <span className={`tag ${x.score >= S.thr ? "ok" : "bad"}`}>{x.score}% – {label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty" style={{ marginTop: 10 }}>Nothing to show yet. Save a lost report and the scores will appear here until the page is reloaded.</div>
        )}
                <h2 style={{ marginTop: 26 }}>3. Reset</h2>
        <p className="sub">Deletes everything that was added and brings back the sample data.</p>
        <button className="btn ghost" onClick={() => window.confirm("Reset all data to the sample data?") && onReset()}>Reset demo data</button>
      </section>

      <section className="card" style={{ maxWidth: 680 }}>
        <h2>4. Test the algorithm</h2>
        <p className="sub">Type two words or sentences to see how similar the system thinks they are. Try a typo, like "walet" and "wallet". Only item words such as things, colors, and places are compared.</p>
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


/* =====================  HELP  ===================== */
const HELP_BUTTONS = [
  ["Dashboard", "A summary of lost reports, found items, possible matches, and items returned."],
  ["Browse reports", "View all found items (filter by Available, Claimed, or Released) and all lost reports."],
  ["Lost reports", "Track each lost report and the claims recorded for it."],
  ["Claims to review", "Check each claimant's proof, then approve or reject the claim."],
  ["Log found item", "Record an item that was turned in to the Guidance Office."],
  ["Matching tester", "Type a lost item and a found item side by side and see the score."],
];

const HELP_STEPS = [
  ["Levenshtein distance", "Counts how many letters must change to turn one word into another. Fewer changes means more similar, so a typo like \"walet\" still matches \"wallet\"."],
  ["Compare the details", "Every detail is graded like a school subject and has its own weight: Item 25%, Color 15%, Location 15%, Brand 10%, Description 10%, and specific details (size, material, marks, and so on) 25%. If a detail clearly differs, the score is capped, and every extra mistake lowers it more."],
  ["Show the results", "A score at or above the strictness setting appears as a possible match. A verified match needs 15 points more (at least 85%) and allows a claim to be recorded."],
];

function HelpModal({ onClose }) {
  const [tab, setTab] = useState("buttons");
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="kind found">Help</span>
            <h2>How the system works</h2>
          </div>
          <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          <div className="tabs" role="group" aria-label="Help topics" style={{ marginTop: 16 }}>
            <button className={tab === "buttons" ? "on" : ""} onClick={() => setTab("buttons")}>Sidebar</button>
            <button className={tab === "algo" ? "on" : ""} onClick={() => setTab("algo")}>Algorithm</button>
          </div>

          {tab === "buttons" ? (
            <ul className="help-list">
              {HELP_BUTTONS.map(([name, text]) => (
                <li key={name}><b>{name}</b><p>{text}</p></li>
              ))}
            </ul>
          ) : (
            <>
              <p className="sub" style={{ margin: "14px 0 0" }}>
                Matching uses the Levenshtein distance algorithm to give each found item a percentage.
              </p>
              <ol className="help-list help-steps">
                {HELP_STEPS.map(([name, text]) => (
                  <li key={name}><b>{name}</b><p>{text}</p></li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
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
  const [helpOpen, setHelpOpen] = useState(false);
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
      lost: p.lost.map((l) =>
        l.id === lostId
          ? { ...l, dismissed: [...(l.dismissed || []), foundId], matches: l.matches.filter((m) => m.foundId !== foundId) }
          : l
      ),
    }));
    toast("Match dismissed.");
  };

  const sendClaim = (lostId, foundId, proof, who) => {
    const missing = ["name", "sid", "course", "section", "room"].some((k) => !who[k].trim());
    if (missing) return toast("Fill in all claimant information.");
    if (!proof.trim()) return toast("Add the claimant's proof of ownership.");
    const claimer = Object.fromEntries(Object.entries(who).map(([k, v]) => [k, v.trim()]));
    setS((p) => ({
      ...p,
      claims: [...p.claims, { id: p.nid, lostId, foundId, claimer, proof: proof.trim(), status: "Pending", note: "Awaiting verification." }],
      nid: p.nid + 1,
    }));
    toast("Claim recorded.");
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

  const approve = (id) => { updateClaim(id, { status: "Approved", note: "Ownership verified. Ready for release." }, "Claimed"); toast("Claim approved."); };
  const reject = (id) => { updateClaim(id, { status: "Rejected", note: "Ownership could not be verified." }); toast("Claim rejected."); };
  const release = (id) => { updateClaim(id, { status: "Released", note: "" }, "Released"); toast("Item released to owner."); };

const setThreshold = (thr) =>
  setS((p) => ({
    ...p,
    thr,
    lost: p.lost.map((l) => ({ ...l, matches: rematch(l, p.found, p.claims, thr) })),
  }));
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
            <button className="theme-btn" onClick={() => setHelpOpen(true)} aria-label="Help" title="Help">
              <Icon name="help" />
            </button>
            <button
              className="theme-btn"
              onClick={() => setDark((d) => !d)}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              title={dark ? "Light mode" : "Dark mode"}
            >
              <Icon name={dark ? "sun" : "moon"} />
            </button>
            <button className="btn-primary" aria-label="Log lost report" onClick={() => go("report")}><Icon name="filePlus" size={19} /> <span className="btn-label">Log lost report</span></button>
          </div>
        </header>

        <main className="page">
          <PageHead page={page} />
          {VIEWS[page]}
        </main>
      </div>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}

      <div id="toast" role="status" className={msg ? "show" : ""}>{msg}</div>
    </div>
  );
}