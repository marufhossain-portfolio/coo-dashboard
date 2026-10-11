// ALEL COO Dashboard — Machine Idle / Under-performance report
// Live data from Google Sheet "Production Dashboard" -> Production_Data
// Three clearly separated states per line-hour:
//   IDLE        = a working hour with NO production entry at all  (line not running)
//   BELOW TARGET= a running hour whose Achievement % < 100        (under-performance)
//   ON TARGET   = a running hour at/above target
// No build step, no dependencies.

const SHEET_ID = "1HeKJ0XueH0WeAxLrJpNaNz_pvPuxRDElQmHcPd7QfOQ";
const SHEET_TAB = "Production_Data";
const RANGE = "A1:O7000";
const WORKING_SLOTS = 11;   // 08 AM - 07 PM (the 12th slot, 08 PM-09 PM, is never used by any line)

let ALL = [];
let DATES = [];
let CAT = "all";            // all | idle | below | ontarget

const $ = (s) => document.querySelector(s);

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = "gvizcb_" + Math.random().toString(36).slice(2);
    const s = document.createElement("script");
    window[cb] = (data) => { resolve(data); try { delete window[cb]; } catch (e) {} s.remove(); };
    s.src = url + (url.includes("?") ? "&" : "?") + "tqx=responseHandler:" + cb + "&nocache=" + Date.now();
    s.onerror = () => { reject(new Error("network")); s.remove(); };
    document.body.appendChild(s);
  });
}

function cellVal(c) {
  if (!c) return "";
  if (c.f != null && c.f !== "") return String(c.f);
  if (c.v == null) return "";
  return String(c.v);
}
function num(v) {
  const t = String(v == null ? "" : v).replace(/[%,]/g, "").trim();
  if (t === "" || t === "-") return null;
  const n = Number(t);
  return isNaN(n) ? null : n;
}
function isDate(s) { return /^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(String(s || "").trim()); }
function dateMs(s) { const p = String(s).split("-"); return new Date(p[1] + " " + p[0] + ", " + p[2]).getTime(); }
function fmtDate(d) {
  const mn = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return d.getDate() + "-" + mn[d.getMonth()] + "-" + d.getFullYear();
}

async function load() {
  setStatus("Loading live data from the Google Sheet…");
  const url = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/gviz/tq?sheet=" + encodeURIComponent(SHEET_TAB) + "&range=" + RANGE;
  const data = await jsonp(url);
  const rows = (data && data.table && data.table.rows) || [];
  ALL = [];
  for (const r of rows) {
    const c = r.c || [];
    const date = cellVal(c[0]).trim();
    if (!isDate(date)) continue;
    ALL.push({
      date,
      line: cellVal(c[3]).trim(),
      time: cellVal(c[4]).trim(),
      prod: num(cellVal(c[6])) || 0,
      ach: num(cellVal(c[9])),
      remarks: cellVal(c[13]).trim(),
    });
  }
  DATES = [...new Set(ALL.map(x => x.date))].sort((a, b) => dateMs(b) - dateMs(a));
  fillDates();
  setStatus(ALL.length.toLocaleString("en-US") + " rows · " + DATES.length + " dates · live");
}

function fillDates() {
  const sel = $("#dateSel");
  sel.innerHTML = "";
  DATES.forEach(d => { const o = document.createElement("option"); o.value = d; o.textContent = d; sel.appendChild(o); });
  const todayStr = fmtDate(new Date());
  sel.value = DATES.find(d => d !== todayStr) || DATES[0] || "";
}

function compute(date) {
  const rows = ALL.filter(x => x.date === date);
  const lines = [...new Set(rows.map(x => x.line))];
  const res = lines.map(L => {
    const rs = rows.filter(x => x.line === L);
    const slots = [...new Set(rs.map(x => x.time))];
    const below = rs.filter(x => x.ach != null && x.ach < 100);
    const belowSlots = [...new Set(below.map(x => x.time))];
    const reasons = [...new Set(below.map(x => x.remarks).filter(Boolean))];
    return {
      line: L,
      hoursRun: slots.length,
      notRunning: Math.max(0, WORKING_SLOTS - slots.length),   // IDLE
      below: belowSlots.length,                                // BELOW TARGET
      onTarget: Math.max(0, slots.length - belowSlots.length), // ON TARGET
      prod: rs.reduce((s, x) => s + (x.prod || 0), 0),
      reasons,
    };
  }).sort((a, b) => (b.notRunning + b.below) - (a.notRunning + a.below));

  const possible = res.length * WORKING_SLOTS;
  const runHours = res.reduce((s, x) => s + x.hoursRun, 0);
  const idleHours = res.reduce((s, x) => s + x.notRunning, 0);
  const belowHours = res.reduce((s, x) => s + x.below, 0);
  const onTargetHours = res.reduce((s, x) => s + x.onTarget, 0);
  return {
    date, lines: res, possible, runHours, idleHours, belowHours, onTargetHours,
    idlePctOfPossible: possible ? Math.round(idleHours / possible * 100) : 0,
    belowPctOfRun: runHours ? Math.round(belowHours / runHours * 100) : 0,
    linesWithIdle: res.filter(r => r.notRunning > 0).length,
    linesWithBelow: res.filter(r => r.below > 0).length,
    linesOnTarget: res.filter(r => r.onTarget > 0).length,
  };
}

function applyFilter(lines) {
  if (CAT === "idle") return lines.filter(r => r.notRunning > 0).sort((a, b) => b.notRunning - a.notRunning || b.below - a.below);
  if (CAT === "below") return lines.filter(r => r.below > 0).sort((a, b) => b.below - a.below || b.notRunning - a.notRunning);
  if (CAT === "ontarget") return lines.filter(r => r.onTarget > 0).sort((a, b) => b.onTarget - a.onTarget);
  return lines.slice();
}
function catLabel() {
  return { all: "All lines", idle: "IDLE — line not running", below: "RUNNING BELOW TARGET", ontarget: "ON / ABOVE TARGET" }[CAT] || "All lines";
}

function render() {
  const date = $("#dateSel").value;
  if (!date) { setStatus("No dates found in the sheet."); return; }
  const d = compute(date);
  window.__last = d;

  $("#kDate").textContent = d.date;
  $("#kLines").textContent = d.lines.length;
  $("#kIdle").textContent = d.idleHours + " hrs";
  $("#kIdlePct").textContent = d.idlePctOfPossible + "% of possible hours";
  $("#kBelow").textContent = d.belowHours + " hrs";
  $("#kBelowPct").textContent = d.belowPctOfRun + "% of running hours";
  $("#kOntarget").textContent = d.onTargetHours + " hrs";

  const rows = applyFilter(d.lines);
  window.__filtered = rows;

  const tb = $("#tbody");
  tb.innerHTML = "";
  if (!rows.length) {
    tb.innerHTML = "<tr><td colspan='8' class='empty'>No lines in this category for " + esc(d.date) + ".</td></tr>";
  }
  rows.forEach((r, i) => {
    const tr = document.createElement("tr");
    const worst = r.notRunning + r.below;
    if (worst === 0) tr.className = "ok";
    else if (r.notRunning >= 4 || r.below >= 8) tr.className = "bad";
    else tr.className = "warn";
    const hi = (col) => (CAT === col ? " hit" : "");
    tr.innerHTML =
      "<td>" + (i + 1) + "</td>" +
      "<td class='ln'>" + esc(r.line) + "</td>" +
      "<td class='n'>" + r.hoursRun + "</td>" +
      "<td class='n strong idlecol" + hi("idle") + "'>" + (r.notRunning || "0") + "</td>" +
      "<td class='n strong" + hi("below") + "'>" + (r.below || "0") + "</td>" +
      "<td class='n okcol" + hi("ontarget") + "'>" + (r.onTarget || "0") + "</td>" +
      "<td class='n'>" + r.prod.toLocaleString("en-US") + "</td>" +
      "<td class='rs'>" + (r.reasons.length ? esc(r.reasons.join(" | ")) : "<span class='muted'>— (no remark)</span>") + "</td>";
    tb.appendChild(tr);
  });
  $("#rowCount").textContent = rows.length;
  $("#catNote").textContent = CAT === "all" ? "" : "filtered: " + catLabel();
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function buildText() {
  const d = window.__last;
  if (!d) return "";
  const rows = window.__filtered || d.lines;
  const L = [];
  L.push("MACHINE IDLE / UNDER-PERFORMANCE REPORT — " + d.date);
  if (CAT !== "all") L.push("Filter: " + catLabel());
  L.push("");
  L.push("WHAT THE NUMBERS MEAN");
  L.push("  IDLE (line not running) = a working hour with NO production at all.");
  L.push("  BELOW TARGET            = the line WAS running but output was under target (Achievement < 100%).");
  L.push("  ON / ABOVE TARGET       = the line ran and met or beat target.");
  L.push("  These are different hours — an hour is counted in only one of them.");
  L.push("");
  L.push("SUMMARY");
  L.push("  Lines reviewed                 : " + d.lines.length);
  L.push("  Working hours per line         : " + WORKING_SLOTS);
  L.push("  Possible line-hours            : " + d.possible);
  L.push("  Hours actually running         : " + d.runHours);
  L.push("  -- IDLE (line not running)     : " + d.idleHours + " hrs  (" + d.idlePctOfPossible + "% of possible hours)");
  L.push("  -- RUNNING BELOW TARGET        : " + d.belowHours + " hrs  (" + d.belowPctOfRun + "% of running hours)");
  L.push("  -- ON / ABOVE TARGET           : " + d.onTargetHours + " hrs");
  L.push("");
  L.push("DETAILS" + (CAT !== "all" ? " (" + catLabel() + ")" : " (highest impact first)"));
  if (!rows.length) L.push("  (no lines in this category)");
  rows.forEach((r, i) => {
    const rs = r.reasons.length ? r.reasons.join(" | ") : "no remark recorded";
    L.push("  " + (i + 1) + ". " + r.line);
    L.push("       Idle (not running): " + r.notRunning + " hrs   |   Below target: " + r.below + " hrs   |   On target: " + r.onTarget + " hrs   |   Output: " + r.prod.toLocaleString("en-US") + " pcs");
    L.push("       Reason: " + rs);
  });
  return L.join("\n");
}

function setStatus(t) { const e = $("#status"); if (e) e.textContent = t; }
function flash(msg) { const e = $("#toast"); if (!e) return; e.textContent = msg; e.classList.add("show"); setTimeout(() => e.classList.remove("show"), 1800); }

document.addEventListener("DOMContentLoaded", () => {
  $("#dateSel").addEventListener("change", render);
  $("#catSel").addEventListener("change", (e) => { CAT = e.target.value; render(); });
  $("#copyBtn").addEventListener("click", async () => {
    const txt = buildText();
    try { await navigator.clipboard.writeText(txt); flash("Copied to clipboard ✅"); }
    catch (e) {
      const ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); flash("Copied ✅"); } catch (e2) { flash("Copy failed — select manually"); }
      ta.remove();
    }
  });
  $("#dlBtn").addEventListener("click", () => {
    const blob = new Blob([buildText()], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "idle-report-" + (window.__last ? window.__last.date : "report") + ".txt";
    a.click();
  });
  load().then(render).catch(err => {
    console.error(err);
    setStatus("Could not load the sheet. Check internet / sheet sharing. (" + err.message + ")");
  });
});
