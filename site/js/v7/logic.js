/* v7 pure logic: no DOM; also require()-able in Node. */
var V7_DIMS = ["frame", "hero", "blame", "cause", "cons", "aff", "sol", "moral", "start"];

function trFold(s) {
  return String(s == null ? "" : s).replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase()
    .replace(/ı/g, "i").replace(/ç/g, "c").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ö/g, "o").replace(/ü/g, "u");
}
function trCmp(a, b) { return String(a).localeCompare(String(b), "tr"); }

function weekEvents(N, NW, week, ok) {
  var w = (NW || []).filter(function (x) { return x.k === week; })[0];
  if (!w) return [];
  var sc = function (k) { var v = N[k] && N[k].score; return typeof v === "number" ? v : null; };
  return w.keys.filter(function (k) { return ok(k); }).sort(function (a, b) {
    var x = sc(a), y = sc(b);
    if (x === null && y === null) return a < b ? -1 : a > b ? 1 : 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return y - x || (a < b ? -1 : a > b ? 1 : 0);
  });
}

/* Which week to show: an existing week stays selected even when empty (empty:true); unknown/v1 -> latest non-empty. */
function pickWeek(NW, N, ok, wanted) {
  var weeks = (NW || []).filter(function (w) { return w.k !== "v1"; });
  var has = function (w) { return weekEvents(N, NW, w.k, ok).length > 0; };
  var hit = weeks.filter(function (w) { return w.k === wanted; })[0];
  if (hit) return { week: hit.k, empty: !has(hit) };
  var full = weeks.filter(has);
  return full.length ? { week: full[full.length - 1].k, empty: false } : { week: null, empty: true };
}

function narrGroups(rows, dim) {
  var m = {};
  rows.forEach(function (r) {
    var v = String(r[dim] == null ? "" : r[dim]).trim();
    (m[v] = m[v] || []).push(r.s);
  });
  return Object.keys(m).map(function (v) { return { value: v, outlets: m[v] }; }).sort(function (a, b) {
    if ((a.value === "") !== (b.value === "")) return a.value === "" ? 1 : -1;
    return b.outlets.length - a.outlets.length || trCmp(a.value, b.value);
  });
}

function orderOutlets(rows, lean) {
  return rows.map(function (r) { var l = lean(r.s); return { r: r, l: typeof l === "number" ? l : null }; })
    .sort(function (a, b) {
      if (a.l === null && b.l === null) return a.r.s < b.r.s ? -1 : a.r.s > b.r.s ? 1 : 0;
      if (a.l === null) return 1;
      if (b.l === null) return -1;
      return a.l - b.l || (a.r.s < b.r.s ? -1 : a.r.s > b.r.s ? 1 : 0);
    }).map(function (x) { return x.r; });
}

function dimShares(N, keys) {
  var out = {};
  V7_DIMS.forEach(function (d) {
    var n = keys.filter(function (k) { return N[k] && (N[k].focus || []).indexOf(d) >= 0; }).length;
    out[d] = keys.length ? n / keys.length : 0;
  });
  return out;
}

function blameByBloc(N, keys, bloc) {
  var m = {};
  keys.forEach(function (k) {
    ((N[k] && N[k].rows) || []).forEach(function (r) {
      var v = String(r.blame == null ? "" : r.blame).trim();
      if (!v) return;
      var o = m[v] = m[v] || { value: v, left: 0, mid: 0, right: 0, none: 0 };
      var b = bloc(r.s);
      o[b === "left" || b === "mid" || b === "right" ? b : "none"]++;
    });
  });
  var tot = function (o) { return o.left + o.mid + o.right + o.none; };
  return Object.keys(m).map(function (v) { return m[v]; })
    .sort(function (a, b) { return tot(b) - tot(a) || trCmp(a.value, b.value); });
}

function firstSentence(t) { t = String(t || "").trim(); var i = t.indexOf(". "); return i < 0 ? t : t.slice(0, i + 1); }

function yzText(f, review) {
  if (review && review.status === "rejected") return null;
  if (review && review.status === "corrected") return { noticed: review.note || "", why: "", editor: true };
  if (f.explain) return { noticed: f.explain.noticed, why: f.explain.why, editor: false };
  var pick = function (list, role) { return (list || []).filter(function (x) { return x.role === role; })[0]; };
  var adv = pick(f.mechanisms, "advocate"), sk = pick(f.alternatives, "skeptic");
  return { noticed: firstSentence(adv && adv.text), why: firstSentence((sk || adv || {}).text), editor: false };
}

function ilanSearch(items, q) {
  q = q || {};
  var t = q.text ? trFold(q.text) : "";
  return items.filter(function (i) {
    return (!t || trFold(i.t).indexOf(t) >= 0) && (!q.family || i.family === q.family) && (!q.src || i.s === q.src) &&
      (!q.from || i.d >= q.from) && (!q.to || i.d <= q.to);
  }).sort(function (a, b) { return a.d < b.d ? 1 : a.d > b.d ? -1 : 0; });
}

/* Yöntem anchors: new ids pass through; the numeric ones other pages used before 7.0 map onto them. */
var YONTEM_OLD = { "2": "veri", "3": "olay", "4": "dil", "5": "olay", "6": "anlati", "7": "dil", "8": "veri", "9": "sinir", "10": "veri",
  "11": "yz", "12": "yzicerik", "v5": "veri", "kutuphane": "kavramlar" };
function yontemAnchor(s) {
  s = s == null ? "" : String(s);
  return Object.prototype.hasOwnProperty.call(YONTEM_OLD, s) ? YONTEM_OLD[s] : s;
}

var NAV_SUB = { "/olaylar": "Bütün olaylar, arama ve kör noktalar", "/anlati": "Kurumlar bir olayı nasıl çerçeveledi",
  "/oruntu": "Haberlerde tekrar eden farklar", "/kurumlar": "Kim nasıl yazıyor, yan yana", "/yontem": "Yöntem, sözlük ve sınırlar" };
/* Homepage feed: events first reported in the 7 days ending lastDay, covered by a left- and a right-placed outlet. */
function weeklySplits(events, lastDay, opt) {
  opt = opt || {};
  var cov = opt.cov || function (e) { return e.cov || [0, 0, 0]; }, ex = opt.exclude || [];
  var end = Date.parse(lastDay + "T00:00:00Z"), from = new Date(end - 6 * 864e5).toISOString().slice(0, 10);
  return events.filter(function (e) {
    var d = e.f ? e.f.slice(0, 10) : "", c = cov(e);
    return d && d >= from && d <= lastDay && c[0] >= 1 && c[2] >= 1 && e.s.length >= 6 && ex.indexOf(e.i) < 0;
  }).sort(function (a, b) { return b.p - a.p || b.s.length - a.s.length; });
}
function whatDiffers(e, narr) {
  var seen = {}, n = 0;
  ((narr && narr.rows) || []).forEach(function (r) { if (r.blame && !seen[r.blame]) { seen[r.blame] = 1; n++; } });
  if (n > 1) return "Sorumlu tutulan farklı";
  if (e.p >= 40) return "Birinde belirgin biçimde daha sert bir dil var";
  if (e.p >= 20) return "Birinde daha yüklü bir dil var";
  return "Aynı olay, farklı sözcükler";
}
var KURUM_TABS = { liste: 1, karsilastir: 1, kayit: 1 };

function redirectRoute(path, params) {
  params = params || {};
  if (path.indexOf("/bulgular") === 0) return "/oruntu?q=secim";
  if (path.indexOf("/yanlilik") === 0) return params.t === "kutuphane" ? "/yontem?s=kavramlar" : "/oruntu?q=dil";
  if (path === "/harita") return "/kurumlar?t=liste&v=harita";
  if (path === "/karsilastir") return "/kurumlar?t=karsilastir";
  if (path === "/ilan") return "/olaylar?t=ilan";
  if (path === "/olaylar") {
    if (params.t === "konular") return "/olaylar?t=liste&f=konu";
    if (params.t === "kapsama") return "/yontem?s=kapsama";
  }
  if (path === "/kurumlar" && params.t !== undefined) {
    if (params.t === "guven") return "/kurumlar?t=kayit";
    if (!Object.prototype.hasOwnProperty.call(KURUM_TABS, params.t)) return "/kurumlar?t=liste";
  }
  return null;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { trFold: trFold, weekEvents: weekEvents, pickWeek: pickWeek, narrGroups: narrGroups, orderOutlets: orderOutlets,
    dimShares: dimShares, blameByBloc: blameByBloc, yzText: yzText, ilanSearch: ilanSearch, redirectRoute: redirectRoute, NAV_SUB: NAV_SUB, yontemAnchor: yontemAnchor, weeklySplits: weeklySplits, whatDiffers: whatDiffers };
}
