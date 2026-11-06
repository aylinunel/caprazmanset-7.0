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
/* Outlet page "Kısaca": up to three plain sentences. o = {name, events, total, mean, blocMean, placed, nb: [name, ...]}. */
var KU_ONES = ["ı", "i", "si", "ü", "ü", "i", "sı", "si", "i", "u"];
var KU_TENS = { 0: "ı", 10: "u", 20: "si", 30: "u", 40: "ı", 50: "si", 60: "ı", 70: "i", 80: "i", 90: "ı" };
/* "%12" + possessive as Turkish reads the number: 12 → "’si", 20 → "’si", 30 → "’u", 100 → "’ü". */
function kuPoss(n) {
  if (n === 100) return "’ü";
  if (n % 10) return "’" + KU_ONES[n % 10];
  return "’" + KU_TENS[n];
}
/* Dative after an outlet name: "Birgün’e", "Takvim’e", "Sabah’a", "Sözcü’ye", "Star’a". */
function kuDat(name) {
  var w = String(name).trim(), low = w.toLocaleLowerCase("tr"), v = (low.match(/[aıoueiöü]/g) || ["e"]).pop();
  return "’" + (/[aıoueiöü]$/.test(low) ? "y" : "") + (/[aıou]/.test(v) ? "a" : "e");
}
function outletKisaca(o) {
  var out = [], n = o.total > 0 ? Math.round(100 * o.events / o.total) : 0;
  out.push(o.name + " bu dönemde " + o.events + " olayı verdi (olayların %" + n + kuPoss(n) + ").");
  if (o.placed && typeof o.mean === "number" && typeof o.blocMean === "number" && isFinite(o.mean) && isFinite(o.blocMean)) {
    var d = o.mean - o.blocMean;
    out.push(Math.abs(d) <= 1 + 1e-9 ? "Başlıkları kendi bloğunun ortalamasına yakın." :
      d > 0 ? "Başlıkları kendi bloğunun ortalamasından biraz daha yüklü." : "Başlıkları kendi bloğunun ortalamasından daha sakin.");
  }
  var nb = o.nb || [];
  if (nb.length) out.push("Gündemi en çok " + nb.slice(0, 2).map(function (x, i, a) { return x + (i === a.length - 1 ? kuDat(x) : ""); }).join(" ve ") + " benziyor.");
  return out;
}

/* The outlet's 5 most recent events (>= 5 outlets) where its headline load and an opposite-bloc outlet's load differ most.
   opt.load(e, s) -> number|null, opt.bloc(s) -> "left"|"mid"|"right"|"none". Mid outlets compare with either side. */
function recentSplits(events, s, opt) {
  var mine = opt.bloc(s), out = [];
  var cand = events.filter(function (e) { return e.s.indexOf(s) >= 0 && e.s.length >= 5 && e.f; })
    .sort(function (a, b) { return a.f < b.f ? 1 : a.f > b.f ? -1 : 0; });
  for (var i = 0; i < cand.length && out.length < 5; i++) {
    var e = cand[i], v = opt.load(e, s), best = null, bd = -1;
    if (v == null) continue;
    e.s.forEach(function (x) {
      var b = opt.bloc(x), w = opt.load(e, x);
      if (x === s || w == null || (b !== "left" && b !== "right") || b === mine) return;
      if (Math.abs(v - w) > bd) { bd = Math.abs(v - w); best = x; }
    });
    if (best) out.push({ e: e, other: best });
  }
  return out;
}

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

/* Glossary: one plain sentence per term; glossTerms wraps the first occurrence of each term in the text parts of an html string. */
var GLOSSARY = {
  "kör nokta": "Bir olayı yalnızca bir tarafın (sol ya da sağ kanadın) haberleştirmesi, diğer tarafın hiç yazmamasıdır.",
  "yerleşim": "Bir kurumun, elimizdeki kayda göre 0 ile 100 arasındaki siyasi konumudur; bu konumu biz doğrulamadık.",
  "yüklü dil": "Haberin olguyu aktarmakla kalmayıp yargı ya da duygu taşıyan sözcüklerle anlatılmasıdır.",
  "çerçeve": "Bir olayın hangi yönüyle öne çıkarıldığı, yani haberin neyi merkeze koyduğudur.",
  "φ": "İki kurumun aynı olayları ne ölçüde seçtiğini gösteren sayıdır; -1 ile 1 arasında değer alır.",
  "spot": "Haberin başlığının altındaki kısa özet cümlesidir.",
  "kodlama": "Her başlığın hangi çerçeveye ve hangi anlatı unsurlarına girdiğinin tek tek işaretlenmesidir."
};
function glossTerms(html) {
  var seen = {}, keys = Object.keys(GLOSSARY).sort(function (a, b) { return b.length - a.length; });
  return String(html == null ? "" : html).split(/(<[^>]*>)/).map(function (part) {
    if (part.charAt(0) === "<") return part;
    keys.forEach(function (k) {
      if (seen[k]) return;
      var i = part.indexOf(k); if (i < 0) return;
      seen[k] = 1;
      part = part.slice(0, i) + '<button type="button" class="gl" data-gl="' + k + '">' + k + "</button>" + part.slice(i + k.length);
    });
    return part;
  }).join("");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { trFold: trFold, weekEvents: weekEvents, pickWeek: pickWeek, narrGroups: narrGroups, orderOutlets: orderOutlets,
    dimShares: dimShares, blameByBloc: blameByBloc, yzText: yzText, ilanSearch: ilanSearch, redirectRoute: redirectRoute, NAV_SUB: NAV_SUB, yontemAnchor: yontemAnchor, weeklySplits: weeklySplits, outletKisaca: outletKisaca, recentSplits: recentSplits, whatDiffers: whatDiffers, GLOSSARY: GLOSSARY, glossTerms: glossTerms };
}
