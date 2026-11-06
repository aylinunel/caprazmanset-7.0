/* v7 charts that replace the site's bar charts (dataviz method: form by job, thin marks, hover on every mark).
   Three primitives, html + inline svg so text stays crisp and wraps at phone width:
   - vzRows: one row per item on a shared axis — dots, intervals (95 % Wilson), dumbbells, a reference tick.
   - vzDist: a distribution of every event as an area, with median, a reference line and a drag-to-select range.
   - vzLine: lines over time with a crosshair, end labels and an optional rolling mean.
   Tooltips use data-vtip (delegated below), so they work on any page; every value is also printed or in a list. */
var VZ = {};

/* Data table twin of a chart: headers: string[], rows: (string|number)[][]; φ in headers gets a glossary popover. */
function vzTable(headers, rows) {
  return '<div class="scroller"><table class="v7-dt"><thead><tr>' + headers.map(function (h) { return '<th scope="col">' + glossTerms(esc(h)) + "</th>"; }).join("") +
    "</tr></thead><tbody>" + rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + esc(String(c)) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
}
function vzCalm() { return matchMedia("(prefers-reduced-motion: reduce)").matches; }
/* 95 % Wilson interval for k of n. */
function vzWilson(k, n) {
  if (!n) return [0, 0];
  var z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), r = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [Math.max(0, (c - r) / d), Math.min(1, (c + r) / d)];
}
function vzQ(xs, q) { var a = xs.slice().sort(function (x, y) { return x - y; }); if (!a.length) return 0; var i = (a.length - 1) * q, lo = Math.floor(i); return a[lo] + (a[Math.ceil(i)] - a[lo]) * (i - lo); }
/* Small html key for row charts. items: [{c, t, kind: "dot"|"o"|"t"|"ci"|"al"}] */
function vzKey(items) {
  return '<div class="vz-key">' + items.map(function (x) { return '<span><i class="' + (x.kind && x.kind !== "dot" ? x.kind : "") + '" style="--c:' + (x.c || "var(--ink)") + '"></i>' + esc(x.t) + "</span>"; }).join("") + "</div>";
}
function vzRoll(vals, w) { return vals.map(function (v, i) { var s = 0, n = 0; for (var j = Math.max(0, i - w + 1); j <= i; j++) if (vals[j] != null) { s += vals[j]; n++; } return n ? s / n : null; }); }
function vzTipAttr(html) {
  return ' data-vtip="' + esc(html) + '" aria-label="' + esc(html.replace(/<br>/g, ". ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()) + '"';
}
/* Clean ticks for [lo, hi]. */
function vzTicks(lo, hi, n) {
  var span = hi - lo || 1, raw = span / (n || 4), mag = Math.pow(10, Math.floor(Math.log10(raw))), st = [1, 2, 2.5, 5, 10].map(function (m) { return m * mag; })
    .filter(function (s) { return s >= raw; })[0] || raw, out = [];
  for (var v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) out.push(+v.toFixed(10));
  return out;
}

/* ------------------------------------------------------------------ rows */
/* rows: [{k, label, sw (swatch colour), pts: [{v, c, lo, hi, hollow, key}], ref, span: "pts"|"ref"|false, val (html), tip, go}]
   o: {min, max, log, ticks, fmt, axis, refAll: {v, label}, lw, vw} */
function vzRows(rows, o) {
  o = o || {};
  var all = []; rows.forEach(function (r) { r.pts.forEach(function (p) { all.push(p.v, p.lo, p.hi); }); if (r.ref != null) all.push(r.ref); });
  all = all.filter(function (v) { return v != null && isFinite(v); });
  var lo = o.min != null ? o.min : Math.min.apply(null, all), hi = o.max != null ? o.max : Math.max.apply(null, all);
  if (hi === lo) hi = lo + 1;
  var X = o.log ? function (v) { return 100 * (Math.log(Math.max(v, lo)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)); }
    : function (v) { return 100 * (v - lo) / (hi - lo); };
  var pc = function (v) { return Math.max(0, Math.min(100, X(v))).toFixed(2) + "%"; };
  var ticks = o.ticks || (o.log ? [.001, .01, .1, 1, 10, 100, 1000, 1e4].filter(function (t) { return t >= lo && t <= hi; }) : vzTicks(lo, hi, 4)), fmt = o.fmt || function (v) { return dec(v, 1); };
  var grid = ticks.map(function (t) { return '<i class="vz-gl" style="left:' + pc(t) + '"></i>'; }).join("") +
    (o.refAll ? '<i class="vz-all" style="left:' + pc(o.refAll.v) + '"></i>' : "");
  var x0 = o.from != null ? pc(o.from) : o.refAll ? pc(o.refAll.v) : "0%";
  var body = rows.map(function (r) {
    var vs = r.pts.map(function (p) { return p.v; }).filter(function (v) { return v != null; });
    var a = r.span === "ref" && r.ref != null ? [r.ref].concat(vs) : r.span === "zero" ? [o.log ? lo : Math.max(lo, 0)].concat(vs) : vs, s0 = Math.min.apply(null, a), s1 = Math.max.apply(null, a);
    var marks = (r.span !== false && a.length > 1 ? '<i class="vz-span" style="left:' + pc(s0) + ";width:calc(" + pc(s1) + " - " + pc(s0) + ')"></i>' : "") +
      (r.ref != null ? '<i class="vz-ref" style="left:' + pc(r.ref) + '"></i>' : "") +
      r.pts.map(function (p) {
        if (p.v == null) return "";
        return (p.lo != null ? '<i class="vz-ci" style="left:' + pc(p.lo) + ";width:calc(" + pc(p.hi) + " - " + pc(p.lo) + ");--c:" + (p.c || "var(--ink2)") + '"></i>' : "") +
          '<b class="vz-d' + (p.hollow ? " o" : "") + (p.big ? " big" : "") + '" style="left:' + pc(p.v) + ";--x0:" + x0 + ";--c:" + (p.c || "var(--ink)") + '"></b>';
      }).join("");
    return '<div class="vz-r" data-k="' + esc(r.k || r.label) + '"' + (r.tip ? vzTipAttr(r.tip) : "") + (r.go ? ' data-go="' + r.go + '" role="link"' : "") + ' tabindex="0">' +
      '<span class="vz-l">' + (r.sw ? '<em style="background:' + r.sw + '"></em>' : "") + esc(r.label) + (r.sub ? ' <small>' + esc(r.sub) + "</small>" : "") + "</span>" +
      '<span class="vz-t">' + grid + marks + '</span><span class="vz-v">' + (r.val || "") + "</span></div>";
  }).join("");
  var axis = '<div class="vz-r vz-ax" aria-hidden="true"><span class="vz-l">' + esc(o.axisL || "") + '</span><span class="vz-t">' +
    ticks.map(function (t) { return '<span style="left:' + pc(t) + '">' + fmt(t) + "</span>"; }).join("") +
    (o.refAll ? '<span class="vz-allt" style="left:' + pc(o.refAll.v) + '">' + esc(o.refAll.label) + "</span>" : "") + "</span><span></span></div>";
  return '<div class="vz' + (vzCalm() ? "" : " vz-anim") + '" style="--lw:' + (o.lw || 170) + "px;--vw:" + (o.vw || 74) + 'px">' + body + axis + "</div>" +
    (o.axis ? '<p class="vz-axt">' + o.axis + "</p>" : "");
}
/* Re-render a vzRows host and slide rows from their old place to the new one (sort changes read as motion). */
function vzSwap(host, html) {
  var old = {}, calm = vzCalm();
  if (!calm) [].forEach.call(host.querySelectorAll(".vz-r[data-k]"), function (r) { old[r.getAttribute("data-k")] = r.getBoundingClientRect().top; });
  host.innerHTML = html;
  if (calm) return;
  [].forEach.call(host.querySelectorAll(".vz-r[data-k]"), function (r) {
    var k = r.getAttribute("data-k"); if (old[k] == null) return;
    var d = old[k] - r.getBoundingClientRect().top; if (!d) return;
    r.style.transform = "translateY(" + d + "px)"; r.style.transition = "none";
    requestAnimationFrame(function () { r.style.transition = "transform .45s cubic-bezier(.2,.8,.2,1)"; r.style.transform = ""; });
  });
}

/* ------------------------------------------------------------------ distribution */
/* id: unique; xs: values; o: {min, max, bins, fmt, axis, ref: {v, label}, presets: [[lo, hi, label]], detail(lo, hi) -> html, unit} */
function vzDist(id, xs, o) {
  var lo = o.min, hi = o.max, nb = o.bins || 40, c = [], i;
  for (i = 0; i < nb; i++) c.push(0);
  xs.forEach(function (v) { c[Math.min(nb - 1, Math.max(0, Math.floor(nb * (v - lo) / (hi - lo))))]++; });
  var mx = Math.max.apply(null, c) || 1, H = 160;
  var med = vzQ(xs, .5), q1 = vzQ(xs, .25), q3 = vzQ(xs, .75), P = function (v) { return (100 * (v - lo) / (hi - lo)).toFixed(2) + "%"; };
  VZ[id] = { o: o, xs: xs, lo: lo, hi: hi, nb: nb, c: c };
  var ticks = vzTicks(lo, hi, 5), fmt = o.fmt || function (v) { return v; };
  var yt = vzTicks(0, mx, 2).filter(function (t) { return t > 0; });
  return '<div class="vz-dist" data-vz="' + id + '"><div class="vz-dy" aria-hidden="true">' + yt.map(function (t) { return '<span style="bottom:' + (100 * (H - 6) / H * t / mx).toFixed(1) + '%">' + orN(t) + "</span>"; }).join("") + "</div>" +
    '<div class="vz-dp" tabindex="0" role="img" aria-label="' + esc(o.label + ": " + orN(xs.length) + " olay; ortanca " + fmt(Math.round(med)) + ", çeyrekler " + fmt(Math.round(q1)) + "–" + fmt(Math.round(q3))) + '">' +
    yt.map(function (t) { return '<i class="vz-gh" style="bottom:' + (100 * (H - 6) / H * t / mx).toFixed(1) + '%"></i>'; }).join("") +
    '<i class="vz-iqr" style="left:' + P(q1) + ";width:calc(" + P(q3) + " - " + P(q1) + ')"></i>' +
    '<canvas class="vz-cv" data-cv="d:' + id + '" aria-hidden="true"></canvas>' +
    (o.ref ? '<i class="vz-dref" style="left:' + P(o.ref.v) + '"><span>' + esc(o.ref.label) + "</span></i>" : "") +
    '<i class="vz-med" style="left:' + P(med) + '"><span>ortanca ' + fmt(Math.round(med * 10) / 10) + "</span></i>" +
    '<i class="vz-sel" hidden></i><i class="vz-xh" hidden></i></div>' +
    '<div class="vz-dx" aria-hidden="true">' + ticks.map(function (t) { return '<span style="left:' + P(t) + '">' + fmt(t) + "</span>"; }).join("") + "</div></div>" +
    '<p class="vz-axt">' + o.axis + ' <span class="vz-k"><i class="vz-k-iqr"></i>ortadaki %50 (çeyrekler arası)</span></p>' +
    '<div class="or-ctl vz-pre" data-vz="' + id + '"><span class="or-cl">Aralık</span>' + o.presets.map(function (p, k) {
      return '<button type="button" class="chip" data-vzp="' + k + '" aria-pressed="false">' + esc(p[2]) + "</button>"; }).join("") + "</div>" +
    '<div class="or-panel" id="vz-d-' + id + '" aria-live="polite">' + o.detail(null) + "</div>";
}
function vzDistSel(id, a, b) {
  var S = VZ[id]; if (!S) return;
  var box = document.querySelector('.vz-dist[data-vz="' + id + '"] .vz-dp'), sel = box && box.querySelector(".vz-sel"), d = document.getElementById("vz-d-" + id);
  [].forEach.call(document.querySelectorAll('.vz-pre[data-vz="' + id + '"] [data-vzp]'), function (x) {
    var p = S.o.presets[+x.getAttribute("data-vzp")]; x.setAttribute("aria-pressed", a != null && p[0] === a && p[1] === b); });
  if (a == null) { if (sel) sel.hidden = true; if (d) d.innerHTML = S.o.detail(null); return; }
  if (sel) { sel.hidden = false; sel.style.left = (100 * (a - S.lo) / (S.hi - S.lo)) + "%"; sel.style.width = (100 * (b - a) / (S.hi - S.lo)) + "%"; }
  if (d) { d.innerHTML = S.o.detail(a, b); wireGo(d); }
}
(function () {
  var drag = null;
  var at = function (ev) { var p = ev.target.closest && ev.target.closest(".vz-dp"); if (!p) return null; var id = p.parentNode.getAttribute("data-vz"), S = VZ[id], r = p.getBoundingClientRect();
    var f = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)); return { p: p, id: id, S: S, f: f, v: S.lo + f * (S.hi - S.lo) }; };
  document.addEventListener("pointermove", function (ev) {
    var h = at(ev);
    if (drag) {
      var r = drag.p.getBoundingClientRect(), f = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), S = VZ[drag.id], v = S.lo + f * (S.hi - S.lo);
      var a = Math.min(drag.v, v), b = Math.max(drag.v, v), sel = drag.p.querySelector(".vz-sel");
      sel.hidden = false; sel.style.left = (100 * (a - S.lo) / (S.hi - S.lo)) + "%"; sel.style.width = (100 * (b - a) / (S.hi - S.lo)) + "%"; drag.moved = Math.abs(f - drag.f) > .015;
    }
    if (!h || !h.S) return;
    var k = Math.min(h.S.nb - 1, Math.floor(h.f * h.S.nb)), bl = h.S.lo + k * (h.S.hi - h.S.lo) / h.S.nb, bh = bl + (h.S.hi - h.S.lo) / h.S.nb, xh = h.p.querySelector(".vz-xh"), fm = h.S.o.fmt || String;
    xh.hidden = false; xh.style.left = (100 * (k + .5) / h.S.nb) + "%";
    tipOn(ev, "<span class='k'>" + fm(Math.round(bl)) + " – " + fm(Math.round(bh)) + "</span>" + orN(h.S.c[k]) + " olay · " + orP(h.S.c[k] / (h.S.xs.length || 1)) + "<br>Sürükleyin: bir aralık seçin");
  });
  document.addEventListener("pointerout", function (ev) { var p = ev.target.closest && ev.target.closest(".vz-dp"); if (p && !p.contains(ev.relatedTarget)) { p.querySelector(".vz-xh").hidden = true; tipOff(); } });
  document.addEventListener("pointerdown", function (ev) { var h = at(ev); if (!h || !h.S) return; drag = { p: h.p, id: h.id, v: h.v, f: h.f }; ev.preventDefault(); });
  document.addEventListener("pointerup", function (ev) {
    if (!drag) return; var d = drag, S = VZ[d.id]; drag = null;
    var r = d.p.getBoundingClientRect(), f = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), v = S.lo + f * (S.hi - S.lo), w = (S.hi - S.lo) / S.nb;
    if (!d.moved) { var k = Math.min(S.nb - 1, Math.floor(d.f * S.nb)); return vzDistSel(d.id, S.lo + k * w, S.lo + (k + 1) * w); }
    vzDistSel(d.id, Math.min(d.v, v), Math.max(d.v, v));
  });
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest(".vz-pre [data-vzp]"); if (!b) return;
    var id = b.closest(".vz-pre").getAttribute("data-vz"), p = VZ[id].o.presets[+b.getAttribute("data-vzp")];
    if (b.getAttribute("aria-pressed") === "true") vzDistSel(id, null); else vzDistSel(id, p[0], p[1]);
  });
  /* Row tooltips anywhere on the site. */
  var tp = function (ev) { return ev.target.closest && ev.target.closest("[data-vtip]"); };
  /* Touch: a tap pins the tooltip until a tap elsewhere; anything that navigates (a[href], data-go, role=link) navigates on the first tap and is not pinned. */
  var pt = function (ev) { return ev.target.closest && ev.target.closest("[data-vtip],[data-tip]"); };
  var touchy = function (ev) { return ev.pointerType ? ev.pointerType !== "mouse" : matchMedia("(hover:none)").matches; };
  window.addEventListener("hashchange", function () { tipOff(true); });
  document.addEventListener("click", function (ev) {
    var t = pt(ev);
    if (!t) { if (TIPPIN) tipOff(true); return; }
    if (!touchy(ev) || TIPPIN === t || t.closest("a[href],[data-go],[role=link]")) return;
    var r = t.getBoundingClientRect();
    tipOn({ clientX: r.left + Math.min(r.width / 2, 120), clientY: r.top }, t.getAttribute("data-vtip") || t.getAttribute("data-tip"), t);
  }, true);
  document.addEventListener("pointerover", function (ev) { var t = tp(ev); if (t) tipOn(ev, t.getAttribute("data-vtip")); });
  document.addEventListener("pointermove", function (ev) { var t = tp(ev); if (t) tipOn(ev, t.getAttribute("data-vtip")); });
  document.addEventListener("pointerout", function (ev) { if (tp(ev)) tipOff(); });
  document.addEventListener("focusin", function (ev) { var t = tp(ev); if (t) { var r = t.getBoundingClientRect(); tipOn({ clientX: r.left + r.width / 2, clientY: r.top }, t.getAttribute("data-vtip")); } });
  document.addEventListener("focusout", function (ev) { if (tp(ev)) tipOff(); });
})();

/* ------------------------------------------------------------------ lines */
/* id; xl: x labels; series: [{k, label, vals, c, thin, area}]; o: {fmt, unit, tipX(i), min, axis, band: [i0, i1, label]} */
function vzLine(id, xl, series, o) {
  o = o || {};
  var n = xl.length, mx = 0; series.forEach(function (s) { s.vals.forEach(function (v) { if (v != null && v > mx) mx = v; }); });
  var t0 = vzTicks(0, mx || 1, 3), st = t0.length > 1 ? t0[1] - t0[0] : (mx || 1), top = Math.max(st, Math.ceil((mx || 1) / st) * st), ticks = vzTicks(0, top, 3), H = 200, W = 1000;
  var X = function (i) { return n < 2 ? W / 2 : W * i / (n - 1); }, Y = function (v) { return H - H * v / top; };
  VZ[id] = { xl: xl, series: series, o: o, n: n, top: top };
  var ends = series.filter(function (s) { return !s.thin; }).map(function (s) {
    var i = s.vals.length - 1; while (i >= 0 && s.vals[i] == null) i--; if (i < 0) return "";
    return '<i class="vz-end" style="left:' + (100 * X(i) / W) + "%;top:" + (100 * Y(s.vals[i]) / H) + "%;--c:" + s.c + '"></i>';
  }).join("");
  var xt = [0, Math.round((n - 1) / 2), n - 1].filter(function (v, i, a) { return a.indexOf(v) === i; });
  return '<div class="vz-line" data-vl="' + id + '"><div class="vz-ly" aria-hidden="true">' + ticks.map(function (t) { return '<span style="bottom:' + (100 * t / top) + '%">' + (o.fmt || orN)(t) + "</span>"; }).join("") + "</div>" +
    '<div class="vz-lp" tabindex="0" role="img" aria-label="' + esc(o.label || "") + '">' + ticks.map(function (t) { return '<i class="vz-gh" style="bottom:' + (100 * t / top) + '%"></i>'; }).join("") +
    (o.band ? '<i class="vz-band" style="left:' + (100 * X(o.band[0]) / W) + "%;width:" + (100 * (X(o.band[1]) - X(o.band[0])) / W) + '%"><span>' + esc(o.band[2]) + "</span></i>" : "") +
    '<canvas class="vz-cv" data-cv="l:' + id + '" aria-hidden="true"></canvas>' + ends + '<i class="vz-xh" hidden></i><span class="vz-dots"></span></div>' +
    '<div class="vz-lx" aria-hidden="true">' + xt.map(function (i) { return '<span style="left:' + (100 * X(i) / W) + '%">' + esc(xl[i]) + "</span>"; }).join("") + "</div></div>" +
    legendHTML(series.map(function (s) { return { c: s.c, line: 1, t: s.label }; }), o.legend || "Çizgi");
}
(function () {
  var hit = function (ev) { var p = ev.target.closest && ev.target.closest(".vz-lp"); if (!p) return null; var id = p.parentNode.getAttribute("data-vl"); return { p: p, S: VZ[id] }; };
  var show = function (p, S, i, ev) {
    var xh = p.querySelector(".vz-xh"), dots = p.querySelector(".vz-dots"), top = S.top;
    var X = S.n < 2 ? 50 : 100 * i / (S.n - 1);
    xh.hidden = false; xh.style.left = X + "%";
    dots.innerHTML = S.series.map(function (s) { var v = s.vals[i]; return v == null ? "" : '<i class="vz-end on" style="left:' + X + "%;top:" + (100 - 100 * v / top) + "%;--c:" + s.c + '"></i>'; }).join("");
    tipOn(ev, "<span class='k'>" + esc(S.o.tipX ? S.o.tipX(i) : S.xl[i]) + "</span>" + S.series.map(function (s) {
      var v = s.vals[i]; return v == null ? "" : esc(s.label) + ": <b>" + (S.o.fmt || orN)(s.thin ? v : Math.round(v * 10) / 10) + "</b>"; }).filter(Boolean).join("<br>"));
  };
  document.addEventListener("pointermove", function (ev) {
    var h = hit(ev); if (!h || !h.S) return;
    var r = h.p.getBoundingClientRect(), i = Math.round((h.S.n - 1) * Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)));
    show(h.p, h.S, i, ev);
  });
  document.addEventListener("pointerout", function (ev) { var p = ev.target.closest && ev.target.closest(".vz-lp"); if (p && !p.contains(ev.relatedTarget)) { p.querySelector(".vz-xh").hidden = true; p.querySelector(".vz-dots").innerHTML = ""; tipOff(); } });
  document.addEventListener("keydown", function (ev) {
    var p = document.activeElement; if (!p || !p.classList || !p.classList.contains("vz-lp") || (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight")) return;
    var S = VZ[p.parentNode.getAttribute("data-vl")]; p._i = Math.max(0, Math.min(S.n - 1, (p._i == null ? S.n - 1 : p._i) + (ev.key === "ArrowLeft" ? -1 : 1)));
    var r = p.getBoundingClientRect(); show(p, S, p._i, { clientX: r.left + r.width * p._i / Math.max(1, S.n - 1), clientY: r.top }); ev.preventDefault();
  });
})();

/* ------------------------------------------------------------------ dot-matrix painting */
/* Chart canvases (.vz-cv) are LED dots: a faint pinpoint wall everywhere, bright dots where the data is.
   Painted when inserted, on resize and on theme change; colours are resolved from CSS at paint time. */
(function () {
  var Q = [.38, .52, .78];
  var dot = function (P, x, y, r) { P.moveTo(x + r, y); P.arc(x, y, r, 0, 6.283); };
  var fill = function (ctx, P, col, a) { ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fill(P); ctx.globalAlpha = 1; };
  var wall = function (ctx, W, H, col) {
    var cols = Math.max(1, Math.round(W / 6)), rows = Math.max(1, Math.round(H / 6)), px = W / cols, py = H / rows, P = new Path2D();
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) dot(P, (i + .5) * px, (j + .5) * py, .7);
    fill(ctx, P, col, 1);
  };
  var paintDist = function (ctx, S, W, H) {
    var cols = Math.max(1, Math.round(W / 6)), rows = Math.max(1, Math.round(H / 6)), px = W / cols, py = H / rows, mx = Math.max.apply(null, S.c) || 1, P = new Path2D(), ink = dmColor("var(--ink)");
    wall(ctx, W, H, dmColor("var(--line2)"));
    for (var i = 0; i < cols; i++) {
      var k = Math.min(S.nb - 1, Math.floor((i + .5) * S.nb / cols)), h = rows * (S.c[k] / mx) * (H - 6) / H, full = Math.floor(h), f = h - full;
      for (var j = 0; j < full; j++) dot(P, (i + .5) * px, H - (j + .5) * py, 2.4);
      if (f >= .12) dot(P, (i + .5) * px, H - (full + .5) * py, 2.4 * (f < .38 ? Q[0] : f < .65 ? Q[1] : f < .9 ? Q[2] : 1));
    }
    fill(ctx, P, ink, .85);
  };
  var paintLine = function (ctx, S, W, H) {
    wall(ctx, W, H, dmColor("var(--line2)"));
    S.series.forEach(function (s) {
      var col = dmColor(s.c), Pa = new Path2D(), Pl = new Path2D(), n = S.n, step = 4, cols = Math.max(2, Math.round(W / step)), px = W / cols;
      for (var i = 0; i <= cols; i++) {
        var x = i * px, u = n < 2 ? 0 : x / W * (n - 1), i0 = Math.min(n - 1, Math.floor(u)), i1 = Math.min(n - 1, i0 + 1), v0 = s.vals[i0], v1 = s.vals[i1];
        if (v0 == null || v1 == null) continue;
        var v = v0 + (v1 - v0) * (u - i0), y = H - H * v / S.top;
        dot(Pl, x, y, s.thin ? 1.2 : 2.2);
        if (s.area) for (var yy = y + step; yy < H; yy += step) dot(Pa, x, yy, 1.1);
      }
      if (s.area) fill(ctx, Pa, col, .28);
      fill(ctx, Pl, col, s.thin ? .5 : 1);
    });
  };
  var paint = function (cv) {
    var W = cv.clientWidth, H = cv.clientHeight, a = (cv.getAttribute("data-cv") || "").split(":"), S = VZ[a[1]];
    if (!W || !H || !S) return;
    var key = W + "x" + H + "|" + (document.documentElement.getAttribute("data-theme") || "") + (matchMedia("(prefers-color-scheme: dark)").matches ? "d" : "l");
    if (cv._k === key) return;
    cv._k = key;
    var D = Math.min(2, devicePixelRatio || 1), ctx = cv.getContext("2d");
    cv.width = Math.round(W * D); cv.height = Math.round(H * D);
    ctx.setTransform(D, 0, 0, D, 0, 0); ctx.clearRect(0, 0, W, H);
    if (a[0] === "d") paintDist(ctx, S, W, H); else paintLine(ctx, S, W, H);
  };
  var raf = 0, ro = window.ResizeObserver ? new ResizeObserver(function () { all(); }) : null;
  function all() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      [].forEach.call(document.querySelectorAll("canvas.vz-cv"), function (cv) { if (ro && !cv._ro) { cv._ro = 1; ro.observe(cv); } paint(cv); });
    });
  }
  new MutationObserver(all).observe(document.documentElement, { childList: true, subtree: true });
  new MutationObserver(all).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  addEventListener("resize", all);
  var mq = matchMedia("(prefers-color-scheme: dark)"); if (mq.addEventListener) mq.addEventListener("change", all);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(all);
  all();
})();
